"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft,
  Brain,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Upload,
  Play,
  FileText,
  Stethoscope,
  FlaskConical,
  Pill,
  TestTube,
  ClipboardList,
  Calendar,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { TreatmentTimeline } from "@/components/TreatmentTimeline";
import type { AutoStageResult } from "@/types/user-upload";
import type { 
  UploadSession, 
  DocumentType, 
  CompletenessResult, 
  MissingDocument,
  AgentLimitation 
} from "@/types/user-upload";
import { 
  getCancerSiteById, 
  DOCUMENT_TYPE_LABELS,
  MISSING_DOC_IMPACT 
} from "@/lib/upload/constants";

// Icons for document types
const DOC_ICONS: Record<DocumentType, typeof FileText> = {
  'pathology': FileText,
  'radiology': FlaskConical,
  'genomics': TestTube,
  'prescription': Pill,
  'lab-report': TestTube,
  'clinical-notes': ClipboardList,
  'discharge-summary': FileText,
  'surgical-notes': Stethoscope,
  'unknown': FileText,
};

// Agent limitations based on missing documents
function getAgentLimitations(missingDocs: DocumentType[]): AgentLimitation[] {
  const limitations: AgentLimitation[] = [];

  if (missingDocs.includes('pathology')) {
    limitations.push({
      agentId: 'pathologist',
      limitation: 'Cannot confirm histology, grade, or receptor status',
      canStillOpine: false,
    });
    limitations.push({
      agentId: 'medical-oncologist',
      limitation: 'Cannot recommend specific systemic therapy without pathology',
      canStillOpine: true,
    });
  }

  if (missingDocs.includes('radiology')) {
    limitations.push({
      agentId: 'radiologist',
      limitation: 'Cannot assess tumor extent or staging',
      canStillOpine: false,
    });
    limitations.push({
      agentId: 'surgical-oncologist',
      limitation: 'Cannot assess resectability without imaging',
      canStillOpine: true,
    });
    limitations.push({
      agentId: 'radiation-oncologist',
      limitation: 'Cannot plan radiation without imaging',
      canStillOpine: true,
    });
  }

  if (missingDocs.includes('genomics')) {
    limitations.push({
      agentId: 'medical-oncologist',
      limitation: 'May miss targeted therapy options (EGFR, HER2, BRAF, etc.)',
      canStillOpine: true,
    });
  }

  if (missingDocs.includes('lab-report')) {
    limitations.push({
      agentId: 'medical-oncologist',
      limitation: 'Cannot assess organ function for chemotherapy eligibility',
      canStillOpine: true,
    });
  }

  return limitations;
}

// Calculate completeness score
function calculateCompleteness(
  uploadedTypes: DocumentType[],
  cancerSiteId: string
): CompletenessResult {
  const cancerSite = getCancerSiteById(cancerSiteId);
  
  if (!cancerSite) {
    return {
      completenessScore: 50,
      uploadedTypes,
      missingCritical: [],
      missingRecommended: [],
      agentLimitations: [],
    };
  }

  const uploadedSet = new Set(uploadedTypes);
  const missingCritical: MissingDocument[] = [];
  const missingRecommended: MissingDocument[] = [];

  // Check critical documents
  for (const docType of cancerSite.requiredDocs.critical) {
    if (!uploadedSet.has(docType)) {
      missingCritical.push({
        type: docType,
        importance: 'critical',
        impact: MISSING_DOC_IMPACT[docType] || 'May limit analysis',
        example: getDocumentExample(docType),
      });
    }
  }

  // Check recommended documents
  for (const docType of cancerSite.requiredDocs.recommended) {
    if (!uploadedSet.has(docType)) {
      missingRecommended.push({
        type: docType,
        importance: 'recommended',
        impact: MISSING_DOC_IMPACT[docType] || 'May limit analysis',
        example: getDocumentExample(docType),
      });
    }
  }

  // Calculate score
  const criticalCount = cancerSite.requiredDocs.critical.length;
  const recommendedCount = cancerSite.requiredDocs.recommended.length;
  const totalImportant = criticalCount + recommendedCount;

  const criticalMet = criticalCount - missingCritical.length;
  const recommendedMet = recommendedCount - missingRecommended.length;

  // Critical docs are worth 60%, recommended 40%
  const criticalScore = criticalCount > 0 ? (criticalMet / criticalCount) * 60 : 60;
  const recommendedScore = recommendedCount > 0 ? (recommendedMet / recommendedCount) * 40 : 40;
  const completenessScore = Math.round(criticalScore + recommendedScore);

  // Get agent limitations
  const missingTypes = [...missingCritical, ...missingRecommended].map(d => d.type);
  const agentLimitations = getAgentLimitations(missingTypes);

  return {
    completenessScore,
    uploadedTypes,
    missingCritical,
    missingRecommended,
    agentLimitations,
  };
}

function getDocumentExample(docType: DocumentType): string {
  const examples: Record<DocumentType, string> = {
    'pathology': 'e.g., Biopsy report, Histopathology report',
    'radiology': 'e.g., CT scan, MRI, PET-CT report',
    'genomics': 'e.g., NGS report, Foundation One, Guardant',
    'prescription': 'e.g., Chemotherapy prescription, Treatment plan',
    'lab-report': 'e.g., CBC, LFT, KFT, tumor markers',
    'clinical-notes': 'e.g., OPD notes, Consultation summary',
    'discharge-summary': 'e.g., Hospital discharge summary',
    'surgical-notes': 'e.g., Operative notes, Surgery report',
    'unknown': 'Any medical document',
  };
  return examples[docType] || 'Medical document';
}

export default function ReviewPage() {
  const router = useRouter();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [isStartingDeliberation, setIsStartingDeliberation] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  
  // Auto-stage result (if available)
  const autoStageResult: AutoStageResult | undefined = (session as any)?.autoStageResult;

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vtb_upload_session");
    if (!stored) {
      router.push("/upload");
      return;
    }
    
    try {
      const parsed: UploadSession = JSON.parse(stored);
      if (!parsed.cancerSite || !parsed.documents?.length) {
        router.push("/upload/documents");
        return;
      }
      setSession(parsed);
    } catch (e) {
      router.push("/upload");
    }
  }, [router]);

  // Calculate completeness
  const completeness = useMemo(() => {
    if (!session) return null;
    const uploadedTypes = session.documents.map(d => d.classifiedType);
    return calculateCompleteness(uploadedTypes, session.cancerSite);
  }, [session]);

  const handleBack = () => {
    router.push("/upload/documents");
  };

  const handleUploadMore = () => {
    router.push("/upload/documents");
  };

  const handleStartDeliberation = async () => {
    if (!session || !completeness) return;

    setIsStartingDeliberation(true);

    // Update session with completeness info
    const updatedSession: UploadSession = {
      ...session,
      completeness,
    };

    localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));

    // Navigate to user case deliberation page
    router.push("/deliberate");
  };

  const cancerSite = session ? getCancerSiteById(session.cancerSite) : null;

  if (!session || !completeness) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Score colors
  const scoreColor = completeness.completenessScore >= 80 
    ? "text-emerald-400" 
    : completeness.completenessScore >= 50 
    ? "text-amber-400" 
    : "text-red-400";

  const scoreBgColor = completeness.completenessScore >= 80 
    ? "from-emerald-500/20 to-emerald-500/5" 
    : completeness.completenessScore >= 50 
    ? "from-amber-500/20 to-amber-500/5" 
    : "from-red-500/20 to-red-500/5";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Review & Proceed</h1>
              <p className="text-xs text-slate-400">Check clinical completeness</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span className="text-indigo-400 font-medium">Step 4 of 4</span>
            <span>Completeness Check</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Completeness Score Card */}
          <div className={`rounded-2xl p-6 bg-gradient-to-br ${scoreBgColor} border border-slate-700`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  Clinical Completeness
                </h2>
                <p className="text-sm text-slate-400">
                  {cancerSite?.label || session.cancerSite} • {session.documents.length} documents uploaded
                </p>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-bold ${scoreColor}`}>
                  {completeness.completenessScore}%
                </p>
                <p className="text-xs text-slate-500">completeness</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  completeness.completenessScore >= 80 
                    ? "bg-emerald-500" 
                    : completeness.completenessScore >= 50 
                    ? "bg-amber-500" 
                    : "bg-red-500"
                }`}
                style={{ width: `${completeness.completenessScore}%` }}
              />
            </div>
          </div>

          {/* Warning banner for incomplete data */}
          {(completeness.missingCritical.length > 0 || completeness.missingRecommended.length > 0) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-400 mb-1">
                    Incomplete Clinical Picture
                  </h3>
                  <p className="text-sm text-slate-300">
                    The Tumor Board will provide opinions based on available data, but recommendations may be 
                    <strong className="text-amber-400"> limited or conditional</strong> due to missing information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Document Status Table */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="font-medium text-white">Document Status</h3>
            </div>
            
            <div className="divide-y divide-slate-700">
              {/* Uploaded documents */}
              {completeness.uploadedTypes.length > 0 && (
                <div className="p-4">
                  <p className="text-xs text-emerald-400 font-medium mb-3 uppercase tracking-wider">
                    Uploaded
                  </p>
                  <div className="space-y-2">
                    {[...new Set(completeness.uploadedTypes)].map(docType => {
                      const Icon = DOC_ICONS[docType];
                      const count = completeness.uploadedTypes.filter(t => t === docType).length;
                      return (
                        <div key={docType} className="flex items-center gap-3 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-200">
                            {DOCUMENT_TYPE_LABELS[docType]?.en || docType}
                          </span>
                          {count > 1 && (
                            <span className="text-xs text-slate-500">×{count}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Missing critical */}
              {completeness.missingCritical.length > 0 && (
                <div className="p-4">
                  <p className="text-xs text-red-400 font-medium mb-3 uppercase tracking-wider">
                    Missing (Critical)
                  </p>
                  <div className="space-y-3">
                    {completeness.missingCritical.map(missing => {
                      const Icon = DOC_ICONS[missing.type];
                      return (
                        <div key={missing.type} className="flex items-start gap-3 text-sm">
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-200">
                                {DOCUMENT_TYPE_LABELS[missing.type]?.en || missing.type}
                              </span>
                            </div>
                            <p className="text-xs text-red-400 mt-1">{missing.impact}</p>
                            <p className="text-xs text-slate-500">{missing.example}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Missing recommended */}
              {completeness.missingRecommended.length > 0 && (
                <div className="p-4">
                  <p className="text-xs text-amber-400 font-medium mb-3 uppercase tracking-wider">
                    Missing (Recommended)
                  </p>
                  <div className="space-y-3">
                    {completeness.missingRecommended.map(missing => {
                      const Icon = DOC_ICONS[missing.type];
                      return (
                        <div key={missing.type} className="flex items-start gap-3 text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-200">
                                {DOCUMENT_TYPE_LABELS[missing.type]?.en || missing.type}
                              </span>
                            </div>
                            <p className="text-xs text-amber-400 mt-1">{missing.impact}</p>
                            <p className="text-xs text-slate-500">{missing.example}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Agent Limitations */}
          {completeness.agentLimitations.length > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <h3 className="font-medium text-slate-300 mb-3">
                How this affects Tumor Board opinions:
              </h3>
              <div className="space-y-2 text-sm">
                {completeness.agentLimitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">
                      <strong className="text-slate-300">{limitation.agentId}:</strong>{" "}
                      {limitation.limitation}
                      {!limitation.canStillOpine && (
                        <span className="text-red-400 ml-1">(Cannot provide opinion)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Treatment Timeline (if auto-staged) */}
          {autoStageResult?.extractedDates && autoStageResult.extractedDates.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Treatment Journey Timeline</p>
                    <p className="text-sm text-slate-400">
                      {autoStageResult.extractedDates.length} events detected from documents
                    </p>
                  </div>
                </div>
                {showTimeline ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {showTimeline && (
                <div className="p-4 border-t border-slate-700/50">
                  <TreatmentTimeline 
                    extractedDates={autoStageResult.extractedDates}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleBack}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <button
              onClick={handleUploadMore}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload More Documents
            </button>

            <button
              onClick={handleStartDeliberation}
              disabled={isStartingDeliberation}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              {isStartingDeliberation ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Tumor Board
                </>
              )}
            </button>
          </div>

          {/* Proceed anyway note */}
          <p className="text-center text-xs text-slate-500">
            You can proceed with incomplete data. The AI agents will acknowledge limitations in their opinions.
          </p>
        </div>
      </main>
    </div>
  );
}
