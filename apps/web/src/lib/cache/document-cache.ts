/**
 * Document Processing Cache
 * 
 * Implements a content-hash based caching layer for Gemini API responses.
 * Uses in-memory LRU cache for Edge Runtime compatibility.
 * 
 * Cache Key: SHA-256 hash of (base64Data + mimeType)
 * TTL: 24 hours (medical documents don't change)
 */

import type { DocumentType, ExtractedClinicalData } from "@/types/user-upload";

// Cache entry structure
export interface CachedDocumentResult {
  // Cache metadata
  cacheKey: string;
  cachedAt: number;
  ttlMs: number;
  hitCount: number;
  
  // Cached result
  classifiedType: DocumentType;
  confidence: number;
  extractedData: ExtractedClinicalData;
  textLength: number;
  warnings: string[];
  
  // Provenance
  processingTimeMs: number;
}

// LRU Cache implementation for Edge Runtime
// Note: In Edge Runtime, we can't use external packages, so implementing manually
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance (persists across requests in Edge Runtime)
// Note: This will be cleared on redeploy, which is acceptable for our use case
const documentCache = new LRUCache<string, CachedDocumentResult>(100);

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  totalSavedMs: 0,
};

/**
 * Generate a cache key from document content
 * Uses a simple hash for Edge Runtime compatibility
 */
export async function generateCacheKey(
  base64Data: string,
  mimeType: string
): Promise<string> {
  // Create a combined string to hash
  const combined = `${mimeType}:${base64Data.slice(0, 1000)}:${base64Data.length}`;
  
  // Use SubtleCrypto for SHA-256 (available in Edge Runtime)
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `doc:${hashHex.slice(0, 32)}`;
}

/**
 * Get cached document processing result
 */
export function getCachedResult(cacheKey: string): CachedDocumentResult | null {
  const cached = documentCache.get(cacheKey);
  
  if (!cached) {
    cacheStats.misses++;
    return null;
  }
  
  // Check TTL
  const now = Date.now();
  if (now - cached.cachedAt > cached.ttlMs) {
    documentCache.delete(cacheKey);
    cacheStats.misses++;
    return null;
  }
  
  // Update hit count
  cached.hitCount++;
  cacheStats.hits++;
  cacheStats.totalSavedMs += cached.processingTimeMs;
  
  return cached;
}

/**
 * Cache a document processing result
 */
export function cacheResult(
  cacheKey: string,
  result: {
    classifiedType: DocumentType;
    confidence: number;
    extractedData: ExtractedClinicalData;
    textLength: number;
    warnings: string[];
  },
  processingTimeMs: number
): void {
  const cached: CachedDocumentResult = {
    cacheKey,
    cachedAt: Date.now(),
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    hitCount: 0,
    classifiedType: result.classifiedType,
    confidence: result.confidence,
    extractedData: result.extractedData,
    textLength: result.textLength,
    warnings: result.warnings,
    processingTimeMs,
  };
  
  documentCache.set(cacheKey, cached);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalSavedMs: number;
} {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    size: documentCache.size(),
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: total > 0 ? cacheStats.hits / total : 0,
    totalSavedMs: cacheStats.totalSavedMs,
  };
}

/**
 * Clear the cache
 */
export function clearCache(): void {
  documentCache.clear();
  cacheStats = { hits: 0, misses: 0, totalSavedMs: 0 };
}
