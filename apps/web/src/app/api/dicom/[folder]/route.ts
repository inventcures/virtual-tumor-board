/**
 * DICOM File Listing API
 * 
 * Lists all DICOM files in a given folder from public/dicom/
 * Used by the DICOM viewer to know what files to load.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

// Valid DICOM folders (security: only allow these folders)
const VALID_FOLDERS = [
  'lung',
  'breast', 
  'colorectal',
  'headneck',
  'cervix',
  'prostate',
  'gastric',
  'ovarian',
  'esophageal',
  'brain',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string }> }
) {
  try {
    const { folder } = await params;
    
    // Security check: only allow valid folder names
    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder: ${folder}. Valid folders: ${VALID_FOLDERS.join(', ')}` },
        { status: 400 }
      );
    }

    // Path to DICOM folder in public directory
    const dicomPath = path.join(process.cwd(), 'public', 'dicom', folder);
    
    // Check if directory exists
    try {
      const stats = await stat(dicomPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: `${folder} is not a directory` },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: `Folder not found: ${folder}` },
        { status: 404 }
      );
    }

    // Read directory contents
    const files = await readdir(dicomPath);
    
    // Filter for DICOM files and sort them
    const dicomFiles = files
      .filter(file => file.endsWith('.dcm'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // Return file list with metadata
    return NextResponse.json({
      folder,
      count: dicomFiles.length,
      files: dicomFiles,
      // Base URL for loading files (relative to public)
      basePath: `/dicom/${folder}`,
    });

  } catch (error) {
    console.error('Error listing DICOM files:', error);
    return NextResponse.json(
      { error: 'Failed to list DICOM files', details: String(error) },
      { status: 500 }
    );
  }
}
