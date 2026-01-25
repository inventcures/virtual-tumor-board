"use client";

/**
 * Auto-Stage Confirmation Page
 * Shows AI-detected cancer site, staging, and key findings
 * Allows user to confirm or edit before proceeding
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  Edit3,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Target,
  Dna,
  Activity,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  XCircle
} from "lucide-react";
import type { 
  UploadSession, 
  AutoStageResult,
  StagingInfo 
} from "@/types/user-upload";
import { CANCER_SITES, DOCUMENT_TYPE_LABELS } from "@/lib/upload/constants";

// Confidence badge component
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const color = confidence >= 0.8 
    ? "text-emerald-400 bg-emerald-500/20" 
    : confidence >= 0.6 
    ? "text-amber-400 bg-amber-500/20" 
    : "text-red-400 bg-red-500/20";
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {percent}% confident
    </span>
  );
}

export default function AutoStagePage() {
  const router = useRouter();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [autoStageResult, setAutoStageResult] = useState<AutoStageResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode states
  const [isEditingCancer, setIsEditingCancer] = useState(false);
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [editedCancerSite, setEditedCancerSite] = useState("");
  const [editedStage, setEditedStage] = useState<StagingInfo["stage"]>("unknown");
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["cancer", "staging", "biomarkers"])
  );

  // Load session and call auto-stage API
  useEffect(() => {
    const loadAndAnalyze = async () => {
      const stored = localStorage.getItem("vtb_upload_session");
      if (!stored) {
        router.push("/upload");
        return;
      }

      try {
        const parsed: UploadSession = JSON.parse(stored);
        
        // Check if we have documents to analyze
        if (!parsed.documents || parsed.documents.length === 0) {
          router.push("/upload/documents");
          return;
        }

        setSession(parsed);

        // Check if already auto-staged
        if ((parsed as any).autoStageResult) {
          setAutoStageResult((parsed as any).autoStageResult);
          setIsLoading(false);
          return;
        }

        // Call auto-stage API
        const response = await fetch("/api/upload/auto-stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documents: parsed.documents.map(doc => ({
              id: doc.id,
              filename: doc.filename,
              classifiedType: doc.classifiedType,
              extractedData: doc.extractedData,
            })),
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to analyze documents");
        }

        const result: AutoStageResult = await response.json();
        setAutoStageResult(result);
        setEditedCancerSite(result.cancerSite.id);
        setEditedStage(result.staging.clinicalStage);

        // Save to session
        const updatedSession = {
          ...parsed,
          autoStageResult: result,
        };
        localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));
        setSession(updatedSession);

      } catch (e: any) {
        console.error("Auto-stage error:", e);
        setError(e.message || "Failed to analyze documents");
      } finally {
        setIsLoading(false);
      }
    };

    loadAndAnalyze();
  }, [router]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleConfirmAndContinue = useCallback(() => {
    if (!session || !autoStageResult) return;

    // Update session with final values
    const updatedSession: UploadSession = {
      ...session,
      cancerSite: editedCancerSite || autoStageResult.cancerSite.id,
      staging: {
        stage: editedStage || autoStageResult.staging.clinicalStage,
        tnm: autoStageResult.staging.tnm,
      },
    };

    // Also save the autoStageResult for timeline
    (updatedSession as any).autoStageResult = autoStageResult;
    (updatedSession as any).isAutoStaged = true;

    localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));
    router.push("/upload/review");
  }, [session, autoStageResult, editedCancerSite, editedStage, router]);

  const handleBack = () => {
    router.push("/upload/documents");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            AI is analyzing your documents...
          </h2>
          <p className="text-slate-400 mb-6">
            Detecting cancer type, stage, biomarkers, and treatment timeline
          </p>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-sm text-indigo-400">This may take 30-60 seconds</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleBack}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!autoStageResult) return null;

  const cancerSite = CANCER_SITES.find(s => s.id === autoStageResult.cancerSite.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Analysis Complete</h1>
              <p className="text-xs text-slate-400">Review detected information</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span className="text-purple-400 font-medium">Auto-Detection Complete</span>
            <span>Review & Confirm</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
          </div>
        </div>

        {/* Success banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-purple-400" />
            <div>
              <p className="font-medium text-white">
                Analyzed {session?.documents.length} documents successfully
              </p>
              <p className="text-sm text-slate-400">
                Please review the detected information below and make corrections if needed
              </p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {autoStageResult.warnings.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-400 mb-1">Notes from AI</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {autoStageResult.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Cancer Type Section */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSection("cancer")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-pink-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Cancer Type</p>
                  <p className="font-semibold text-white">{autoStageResult.cancerSite.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ConfidenceBadge confidence={autoStageResult.cancerSite.confidence} />
                {expandedSections.has("cancer") ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>
            
            {expandedSections.has("cancer") && (
              <div className="px-4 pb-4 border-t border-slate-700/50">
                <div className="pt-4">
                  <p className="text-sm text-slate-400 mb-3">Evidence from documents:</p>
                  <ul className="text-sm text-slate-300 space-y-1 mb-4">
                    {autoStageResult.cancerSite.evidence.map((e, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {e}
                      </li>
                    ))}
                  </ul>
                  
                  {isEditingCancer ? (
                    <div className="space-y-3">
                      <select
                        value={editedCancerSite}
                        onChange={(e) => setEditedCancerSite(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {CANCER_SITES.map(site => (
                          <option key={site.id} value={site.id}>{site.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditingCancer(false)}
                          className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setIsEditingCancer(false)}
                          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingCancer(true)}
                      className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit cancer type
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Staging Section */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSection("staging")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Clinical Stage</p>
                  <p className="font-semibold text-white">
                    Stage {autoStageResult.staging.clinicalStage}
                    {autoStageResult.staging.tnm && (
                      <span className="text-slate-400 font-normal ml-2">
                        ({autoStageResult.staging.tnm})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ConfidenceBadge confidence={autoStageResult.staging.confidence} />
                {expandedSections.has("staging") ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>
            
            {expandedSections.has("staging") && (
              <div className="px-4 pb-4 border-t border-slate-700/50">
                <div className="pt-4">
                  <p className="text-sm text-slate-400 mb-3">Evidence:</p>
                  <ul className="text-sm text-slate-300 space-y-1 mb-4">
                    {autoStageResult.staging.evidence.map((e, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {e}
                      </li>
                    ))}
                  </ul>
                  
                  {isEditingStage ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(['I', 'II', 'III', 'IV', 'unknown'] as const).map(stage => (
                          <button
                            key={stage}
                            onClick={() => setEditedStage(stage)}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              editedStage === stage
                                ? "border-purple-500 bg-purple-500/20 text-purple-300"
                                : "border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {stage === 'unknown' ? 'Unknown' : `Stage ${stage}`}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setIsEditingStage(false)}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        Done editing
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingStage(true)}
                      className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit stage
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Key Biomarkers Section */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSection("biomarkers")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Dna className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Key Findings</p>
                  <p className="font-semibold text-white">
                    {autoStageResult.keyFindings.histology || "Biomarkers & Mutations"}
                  </p>
                </div>
              </div>
              {expandedSections.has("biomarkers") ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {expandedSections.has("biomarkers") && (
              <div className="px-4 pb-4 border-t border-slate-700/50">
                <div className="pt-4 space-y-4">
                  {autoStageResult.keyFindings.histology && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Histology</p>
                      <p className="text-sm text-white">{autoStageResult.keyFindings.histology}</p>
                    </div>
                  )}
                  
                  {autoStageResult.keyFindings.grade && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Grade</p>
                      <p className="text-sm text-white">{autoStageResult.keyFindings.grade}</p>
                    </div>
                  )}
                  
                  {autoStageResult.keyFindings.biomarkers && Object.keys(autoStageResult.keyFindings.biomarkers).length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2">Biomarkers</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(autoStageResult.keyFindings.biomarkers).map(([marker, value]) => (
                          <span
                            key={marker}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 text-sm"
                          >
                            <span className="text-slate-400">{marker}:</span>{" "}
                            <span className="text-white font-medium">{value}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {autoStageResult.keyFindings.mutations && autoStageResult.keyFindings.mutations.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2">Mutations</p>
                      <div className="flex flex-wrap gap-2">
                        {autoStageResult.keyFindings.mutations.map((mutation, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-sm"
                          >
                            {mutation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {autoStageResult.keyFindings.metastases && autoStageResult.keyFindings.metastases.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-2">Metastases</p>
                      <div className="flex flex-wrap gap-2">
                        {autoStageResult.keyFindings.metastases.map((site, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-sm"
                          >
                            {site}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Treatment History (if available) */}
          {autoStageResult.treatmentHistory && (
            <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleSection("treatment")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Treatment History</p>
                    <p className="font-semibold text-white">Detected from documents</p>
                  </div>
                </div>
                {expandedSections.has("treatment") ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {expandedSections.has("treatment") && (
                <div className="px-4 pb-4 border-t border-slate-700/50">
                  <div className="pt-4 grid sm:grid-cols-2 gap-4">
                    {autoStageResult.treatmentHistory.surgeries?.length ? (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-2">Surgeries</p>
                        <ul className="text-sm text-slate-300 space-y-1">
                          {autoStageResult.treatmentHistory.surgeries.map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    
                    {autoStageResult.treatmentHistory.chemotherapy?.length ? (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-2">Chemotherapy</p>
                        <ul className="text-sm text-slate-300 space-y-1">
                          {autoStageResult.treatmentHistory.chemotherapy.map((c, i) => (
                            <li key={i}>• {c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    
                    {autoStageResult.treatmentHistory.radiation?.length ? (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-2">Radiation</p>
                        <ul className="text-sm text-slate-300 space-y-1">
                          {autoStageResult.treatmentHistory.radiation.map((r, i) => (
                            <li key={i}>• {r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    
                    {autoStageResult.treatmentHistory.targetedTherapy?.length ? (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-2">Targeted Therapy</p>
                        <ul className="text-sm text-slate-300 space-y-1">
                          {autoStageResult.treatmentHistory.targetedTherapy.map((t, i) => (
                            <li key={i}>• {t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extracted Dates Preview (for timeline) */}
          {autoStageResult.extractedDates.length > 0 && (
            <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
              <button
                onClick={() => toggleSection("dates")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Timeline Events</p>
                    <p className="font-semibold text-white">
                      {autoStageResult.extractedDates.length} dates extracted
                    </p>
                  </div>
                </div>
                {expandedSections.has("dates") ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {expandedSections.has("dates") && (
                <div className="px-4 pb-4 border-t border-slate-700/50">
                  <div className="pt-4 space-y-2">
                    {autoStageResult.extractedDates
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((dateEvent, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30"
                        >
                          <span className="text-sm font-mono text-amber-400 w-24">
                            {new Date(dateEvent.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-sm text-white flex-1">{dateEvent.event}</span>
                          <span className="text-xs text-slate-500">{dateEvent.eventType}</span>
                        </div>
                      ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    These dates will be used to build your treatment timeline
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={handleConfirmAndContinue}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            Confirm & Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
