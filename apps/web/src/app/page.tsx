"use client";

import { useState, useCallback } from "react";
import { TumorBoardUI } from "@/components/TumorBoardUI";
import { CaseSummary } from "@/components/CaseSummary";
import { ImagingReviewTab } from "@/components/ImagingReviewTab";
import { Activity, Users, Brain, FileText, ChevronRight, ChevronLeft, Image, Stethoscope } from "lucide-react";
import { SAMPLE_CASES, SampleCase, CASE_SUMMARY } from "@/lib/sample-cases";

// Convert SampleCase to the format expected by CaseSummary
function convertToCaseData(sampleCase: SampleCase) {
  return {
    id: sampleCase.id,
    patient: {
      id: `patient-${sampleCase.caseNumber}`,
      mrn: `MRN-2024-${String(sampleCase.caseNumber).padStart(5, '0')}`,
      name: sampleCase.patient.name,
      age: sampleCase.patient.age,
      gender: sampleCase.patient.gender.toLowerCase() as "male" | "female",
      ecogPs: sampleCase.patient.ecog,
      comorbidities: sampleCase.patient.comorbidities.split(", "),
      smokingHistory: sampleCase.patient.smokingHistory || "Never smoker",
      insuranceType: sampleCase.patient.insurance.toLowerCase().includes("ayushman") ? "ayushman_bharat" : "private",
      state: sampleCase.patient.location,
      language: "hindi",
    },
    diagnosis: {
      cancerType: sampleCase.cancer.type.toLowerCase(),
      histology: sampleCase.cancer.histology,
      histologyCode: "8000/3",
      primarySite: sampleCase.cancer.primarySite,
      primarySiteCode: "C00.0",
      stage: {
        clinical: sampleCase.cancer.tnm,
        composite: sampleCase.cancer.stage,
        stagingSystem: sampleCase.cancer.stagingSystem.toLowerCase(),
      },
      biomarkers: sampleCase.biomarkers.map(b => ({
        name: b.name,
        result: b.value,
        method: "IHC/NGS",
        interpretation: b.actionable ? "Actionable" : undefined,
      })),
      genomics: {
        testType: "panel" as const,
        mutations: sampleCase.genomics.mutations.map(m => ({
          gene: m.gene,
          variant: m.variant,
          vaf: 30,
          classification: "pathogenic" as const,
          actionable: m.actionable,
        })),
        tmb: sampleCase.genomics.tmb,
        msi: sampleCase.genomics.msi,
      },
      diagnosisDate: new Date(),
    },
    clinicalQuestion: sampleCase.clinicalQuestion,
    priority: "routine" as const,
    submittedAt: new Date(),
  };
}

type TabType = "case" | "imaging" | "deliberation";

export default function Home() {
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [deliberationStarted, setDeliberationStarted] = useState(false);
  const [deliberationKey, setDeliberationKey] = useState(0); // To force re-mount
  const [activeTab, setActiveTab] = useState<TabType>("case");

  const currentCase = SAMPLE_CASES[currentCaseIndex];
  const caseData = convertToCaseData(currentCase);

  const handleStartDeliberation = useCallback(() => {
    setDeliberationStarted(true);
    setDeliberationKey(prev => prev + 1);
  }, []);

  const handleRunAnother = useCallback(() => {
    // Cycle to next case
    setCurrentCaseIndex(prev => (prev + 1) % SAMPLE_CASES.length);
    setDeliberationStarted(false);
  }, []);

  const handlePreviousCase = useCallback(() => {
    setCurrentCaseIndex(prev => (prev - 1 + SAMPLE_CASES.length) % SAMPLE_CASES.length);
    setDeliberationStarted(false);
  }, []);

  const handleNextCase = useCallback(() => {
    setCurrentCaseIndex(prev => (prev + 1) % SAMPLE_CASES.length);
    setDeliberationStarted(false);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Virtual Tumor Board</h1>
                <p className="text-xs text-slate-400">AI-Powered Multi-Agent Oncology MDT</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>7 Specialists</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>256 Guidelines</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Case Selector */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousCase}
              disabled={deliberationStarted}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
            
            <div className="text-center">
              <div className="text-sm text-slate-500">Sample Case</div>
              <div className="text-lg font-semibold text-white">
                {currentCaseIndex + 1} of {SAMPLE_CASES.length}
              </div>
            </div>
            
            <button
              onClick={handleNextCase}
              disabled={deliberationStarted}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
          </div>
          
          {/* Case Type Badge */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {currentCase.cancer.type}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {currentCase.cancer.stage}
            </span>
            <span className="text-sm text-slate-500">
              USA Rank #{currentCase.incidenceContext.usaRank} | India Rank #{currentCase.incidenceContext.indiaRank}
            </span>
          </div>
        </div>

        {/* Case Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          {SAMPLE_CASES.map((sCase, idx) => (
            <button
              key={sCase.id}
              onClick={() => {
                if (!deliberationStarted) {
                  setCurrentCaseIndex(idx);
                }
              }}
              disabled={deliberationStarted}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                idx === currentCaseIndex
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50"
              }`}
            >
              {idx + 1}. {sCase.cancer.type}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        {!deliberationStarted && (
          <div className="mb-6 flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("case")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "case"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Case Summary
            </button>
            <button
              onClick={() => setActiveTab("imaging")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "imaging"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Image className="w-4 h-4" />
              Imaging Review
            </button>
          </div>
        )}

        {!deliberationStarted ? (
          <>
            {activeTab === "case" && (
              <div className="space-y-6">
                {/* Case Summary */}
                <CaseSummary caseData={caseData} />

                {/* Start Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleStartDeliberation}
                    className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold text-lg text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105"
                  >
                    <span className="flex items-center gap-3">
                      <Brain className="w-6 h-6" />
                      Start AI Tumor Board Deliberation
                    </span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                  </button>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h3 className="font-semibold text-white mb-2">7 Specialist Agents</h3>
                    <p className="text-sm text-slate-400">
                      Surgical, Medical, Radiation Oncology, Palliative Care, Radiology, Pathology, and Genetics specialists deliberate on your case.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h3 className="font-semibold text-white mb-2">Evidence-Based</h3>
                    <p className="text-sm text-slate-400">
                      Grounded in NCCN, ESMO, ASTRO, ACR, CAP guidelines with real-time retrieval and citation.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h3 className="font-semibold text-white mb-2">Indian Context</h3>
                    <p className="text-sm text-slate-400">
                      Considers drug availability, cost, PMJAY coverage, and resource constraints in Indian healthcare settings.
                    </p>
                  </div>
                </div>

                {/* Case Diversity Stats */}
                <div className="mt-8 p-4 rounded-xl bg-slate-900/50 border border-slate-700">
                  <h3 className="font-semibold text-white mb-3">Sample Case Diversity</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Total Cases:</span>
                      <span className="text-white ml-2">{CASE_SUMMARY.totalCases}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Organ Sites:</span>
                      <span className="text-white ml-2">{CASE_SUMMARY.organSites.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Male/Female:</span>
                      <span className="text-white ml-2">{CASE_SUMMARY.genderDistribution.male}/{CASE_SUMMARY.genderDistribution.female}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Metastatic:</span>
                      <span className="text-white ml-2">{CASE_SUMMARY.stageDistribution.metastatic} cases</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "imaging" && (
              <ImagingReviewTab 
                caseId={currentCase.id}
                cancerType={currentCase.cancer.type}
                patientName={currentCase.patient.name}
              />
            )}
          </>
        ) : (
          <TumorBoardUI 
            key={deliberationKey}
            caseData={caseData} 
            caseId={currentCase.id}
            onRunAnother={handleRunAnother}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>AI-generated recommendations. Always verify with clinical judgment.</p>
          <p className="mt-1 text-xs">Made in India 🇮🇳, For the World 🌍</p>
        </div>
      </footer>
    </div>
  );
}
