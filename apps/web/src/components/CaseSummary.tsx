"use client";

import { User, Stethoscope, FlaskConical, Dna, HelpCircle } from "lucide-react";

interface CaseData {
  patient: {
    name: string;
    age: number;
    gender: string;
    ecogPs: number;
    comorbidities?: string[];
    smokingHistory?: string;
    insuranceType?: string;
    state?: string;
  };
  diagnosis: {
    cancerType: string;
    histology: string;
    primarySite: string;
    stage: {
      clinical: { t: string; n: string; m: string };
      composite: string;
      stagingSystem: string;
    };
    biomarkers: { name: string; result: string; method?: string; interpretation?: string }[];
    genomics?: {
      mutations: { gene: string; variant: string; actionable: boolean }[];
      tmb?: number;
      msi?: string;
    };
  };
  clinicalQuestion: string;
}

export function CaseSummary({ caseData }: { caseData: CaseData }) {
  const { patient, diagnosis, clinicalQuestion } = caseData;

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              {patient.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{patient.name}</h2>
              <p className="text-slate-400">
                {patient.age} years, {patient.gender === "male" ? "Male" : "Female"} | ECOG {patient.ecogPs}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <p className="text-amber-400 font-bold text-lg">{diagnosis.stage.composite}</p>
              <p className="text-amber-400/70 text-sm">
                c{diagnosis.stage.clinical.t}{diagnosis.stage.clinical.n}{diagnosis.stage.clinical.m}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-6">
        {/* Patient Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <User className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">Patient Information</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Comorbidities</span>
              <span className="text-slate-300">{patient.comorbidities?.join(", ") || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Smoking History</span>
              <span className="text-slate-300">{patient.smokingHistory || "Not documented"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Insurance</span>
              <span className="text-emerald-400">{patient.insuranceType?.replace("_", " ").toUpperCase() || "Not documented"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location</span>
              <span className="text-slate-300">{patient.state || "Not documented"}</span>
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Stethoscope className="w-5 h-5 text-purple-400" />
            <span className="font-semibold">Diagnosis</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Cancer Type</span>
              <span className="text-slate-300">{diagnosis.cancerType.replace("_", " ").toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Histology</span>
              <span className="text-slate-300">{diagnosis.histology}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Primary Site</span>
              <span className="text-slate-300">{diagnosis.primarySite}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Staging System</span>
              <span className="text-slate-300">{diagnosis.stage.stagingSystem.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Biomarkers */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <FlaskConical className="w-5 h-5 text-pink-400" />
            <span className="font-semibold">Biomarkers</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {diagnosis.biomarkers.map((bm, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg text-sm ${
                  bm.result.toLowerCase().includes("positive") || parseFloat(bm.result) > 50
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-slate-800 border border-slate-700"
                }`}
              >
                <div className="font-medium text-white">{bm.name}</div>
                <div className={
                  bm.result.toLowerCase().includes("positive") || parseFloat(bm.result) > 50
                    ? "text-emerald-400"
                    : "text-slate-400"
                }>
                  {bm.result}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Genomics */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Dna className="w-5 h-5 text-green-400" />
            <span className="font-semibold">Genomics</span>
          </div>
          <div className="space-y-2">
            {diagnosis.genomics?.mutations.map((m, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg text-sm ${
                  m.actionable
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-slate-800 border border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{m.gene} {m.variant}</span>
                  {m.actionable && (
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/30 text-emerald-300">
                      ACTIONABLE
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500">TMB: <span className="text-slate-300">{diagnosis.genomics?.tmb} mut/Mb</span></span>
              <span className="text-slate-500">MSI: <span className="text-slate-300">{diagnosis.genomics?.msi}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Question */}
      <div className="px-6 pb-6">
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-indigo-300 mb-1">Clinical Question for Tumor Board</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{clinicalQuestion}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
