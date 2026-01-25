/**
 * V4 Upload Constants
 * Limits, cancer sites, document requirements
 */

import type { CancerSite, DocumentType } from '@/types/user-upload';

// Upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_FILES_PER_SESSION: 25,
  MAX_SESSION_SIZE_MB: 100,
  SESSION_EXPIRY_HOURS: 24,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ] as const,
};

// Cancer sites - India-prevalent first, then by global incidence
export const CANCER_SITES: CancerSite[] = [
  // HIGH PREVALENCE IN INDIA (show first)
  {
    id: 'oral-cavity',
    label: 'Oral Cavity / Mouth',
    labelHindi: 'मुंह का कैंसर',
    prevalence: 'high-india',
    requiredDocs: {
      critical: ['pathology'],
      recommended: ['radiology', 'clinical-notes'],
      optional: ['genomics', 'surgical-notes'],
    },
  },
  {
    id: 'cervix',
    label: 'Cervix',
    labelHindi: 'गर्भाशय ग्रीवा',
    prevalence: 'high-india',
    requiredDocs: {
      critical: ['pathology'],
      recommended: ['radiology'],
      optional: ['genomics', 'lab-report'],
    },
  },
  {
    id: 'stomach',
    label: 'Stomach / Gastric',
    labelHindi: 'पेट का कैंसर',
    prevalence: 'high-india',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['genomics'], // HER2, MSI
      optional: ['lab-report', 'clinical-notes'],
    },
  },
  {
    id: 'esophagus',
    label: 'Esophagus / Food Pipe',
    labelHindi: 'भोजन नली',
    prevalence: 'high-india',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['clinical-notes'],
      optional: ['genomics', 'lab-report'],
    },
  },
  {
    id: 'gallbladder',
    label: 'Gallbladder',
    labelHindi: 'पित्ताशय',
    prevalence: 'high-india',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['lab-report'],
      optional: ['genomics', 'surgical-notes'],
    },
  },

  // HIGH PREVALENCE GLOBALLY
  {
    id: 'breast',
    label: 'Breast',
    labelHindi: 'स्तन कैंसर',
    prevalence: 'high',
    requiredDocs: {
      critical: ['pathology'], // Must have ER/PR/HER2
      recommended: ['radiology', 'genomics'], // Oncotype DX
      optional: ['surgical-notes', 'lab-report'],
    },
  },
  {
    id: 'lung',
    label: 'Lung',
    labelHindi: 'फेफड़े का कैंसर',
    prevalence: 'high',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['genomics'], // EGFR, ALK, ROS1, PD-L1
      optional: ['lab-report', 'clinical-notes'],
    },
  },
  {
    id: 'colorectal',
    label: 'Colorectal / Colon',
    labelHindi: 'आंत का कैंसर',
    prevalence: 'high',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['genomics'], // MSI, KRAS, BRAF
      optional: ['lab-report', 'surgical-notes'],
    },
  },
  {
    id: 'prostate',
    label: 'Prostate',
    labelHindi: 'प्रोस्टेट कैंसर',
    prevalence: 'high',
    requiredDocs: {
      critical: ['pathology'],
      recommended: ['radiology', 'lab-report'], // PSA
      optional: ['genomics'],
    },
  },

  // MODERATE PREVALENCE
  {
    id: 'ovarian',
    label: 'Ovarian',
    labelHindi: 'अंडाशय का कैंसर',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['genomics', 'lab-report'], // CA-125, BRCA
      optional: ['surgical-notes'],
    },
  },
  {
    id: 'head-neck',
    label: 'Head & Neck (non-oral)',
    labelHindi: 'सिर और गर्दन',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['clinical-notes'],
      optional: ['genomics'],
    },
  },
  {
    id: 'brain',
    label: 'Brain / CNS',
    labelHindi: 'मस्तिष्क कैंसर',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['genomics'], // IDH, MGMT
      optional: ['clinical-notes', 'surgical-notes'],
    },
  },
  {
    id: 'liver',
    label: 'Liver / Hepatocellular',
    labelHindi: 'यकृत कैंसर',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['radiology'],
      recommended: ['pathology', 'lab-report'], // AFP, LFT
      optional: ['clinical-notes'],
    },
  },
  {
    id: 'pancreatic',
    label: 'Pancreatic',
    labelHindi: 'अग्नाशय कैंसर',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['lab-report'], // CA 19-9
      optional: ['genomics', 'clinical-notes'],
    },
  },
  {
    id: 'kidney',
    label: 'Kidney / Renal',
    labelHindi: 'गुर्दे का कैंसर',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['lab-report'],
      optional: ['genomics'],
    },
  },
  {
    id: 'bladder',
    label: 'Bladder',
    labelHindi: 'मूत्राशय कैंसर',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology'],
      recommended: ['radiology'],
      optional: ['genomics', 'lab-report'],
    },
  },
  {
    id: 'thyroid',
    label: 'Thyroid',
    labelHindi: 'थायराइड कैंसर',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology'],
      recommended: ['radiology', 'lab-report'], // TSH, Thyroglobulin
      optional: ['genomics'],
    },
  },

  // BLOOD CANCERS
  {
    id: 'leukemia',
    label: 'Leukemia',
    labelHindi: 'ल्यूकेमिया',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'lab-report'], // CBC, flow cytometry
      recommended: ['genomics'],
      optional: ['radiology'],
    },
  },
  {
    id: 'lymphoma',
    label: 'Lymphoma',
    labelHindi: 'लिम्फोमा',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'radiology'], // PET-CT
      recommended: ['lab-report'],
      optional: ['genomics'],
    },
  },
  {
    id: 'myeloma',
    label: 'Multiple Myeloma',
    labelHindi: 'मल्टीपल मायलोमा',
    prevalence: 'moderate',
    requiredDocs: {
      critical: ['pathology', 'lab-report'], // SPEP, bone marrow
      recommended: ['radiology'],
      optional: ['genomics'],
    },
  },

  // LESS COMMON
  {
    id: 'melanoma',
    label: 'Melanoma',
    labelHindi: 'मेलेनोमा',
    prevalence: 'low',
    requiredDocs: {
      critical: ['pathology'],
      recommended: ['radiology', 'genomics'], // BRAF
      optional: ['surgical-notes'],
    },
  },
  {
    id: 'sarcoma',
    label: 'Sarcoma',
    labelHindi: 'सार्कोमा',
    prevalence: 'low',
    requiredDocs: {
      critical: ['pathology', 'radiology'],
      recommended: ['genomics'],
      optional: ['surgical-notes'],
    },
  },
  {
    id: 'other',
    label: 'Other (specify)',
    labelHindi: 'अन्य',
    prevalence: 'low',
    requiredDocs: {
      critical: ['pathology'],
      recommended: ['radiology'],
      optional: ['genomics', 'lab-report', 'clinical-notes'],
    },
  },
];

// Get cancer site by ID
export function getCancerSiteById(id: string): CancerSite | undefined {
  return CANCER_SITES.find(site => site.id === id);
}

// Document type labels
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { en: string; hi: string }> = {
  'pathology': { en: 'Pathology / Biopsy Report', hi: 'पैथोलॉजी / बायोप्सी रिपोर्ट' },
  'radiology': { en: 'Radiology (CT/MRI/PET)', hi: 'रेडियोलॉजी (CT/MRI/PET)' },
  'genomics': { en: 'Genomic / Molecular Testing', hi: 'जीनोमिक / मॉलिक्यूलर टेस्ट' },
  'prescription': { en: 'Prescription / Treatment Plan', hi: 'प्रिस्क्रिप्शन / उपचार योजना' },
  'lab-report': { en: 'Lab Reports (CBC, LFT, KFT)', hi: 'लैब रिपोर्ट (CBC, LFT, KFT)' },
  'clinical-notes': { en: 'Clinical Notes / Consultation', hi: 'क्लिनिकल नोट्स / परामर्श' },
  'discharge-summary': { en: 'Discharge Summary', hi: 'डिस्चार्ज सारांश' },
  'surgical-notes': { en: 'Surgical / Operative Notes', hi: 'सर्जिकल / ऑपरेटिव नोट्स' },
  'unknown': { en: 'Unknown Document', hi: 'अज्ञात दस्तावेज़' },
};

// Impact statements for missing documents
export const MISSING_DOC_IMPACT: Record<DocumentType, string> = {
  'pathology': 'Cannot confirm cancer type, grade, or receptor status',
  'radiology': 'Cannot assess tumor size, spread, or treatment response',
  'genomics': 'May miss targeted therapy options (EGFR, HER2, etc.)',
  'prescription': 'Cannot assess prior treatment history',
  'lab-report': 'Cannot assess organ function for chemo eligibility',
  'clinical-notes': 'May miss important clinical context',
  'discharge-summary': 'May miss recent hospitalization details',
  'surgical-notes': 'Cannot assess surgical margins or residual disease',
  'unknown': 'Document purpose unclear',
};

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Generate session ID
export function generateSessionId(): string {
  return `vtb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if session is expired
export function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
