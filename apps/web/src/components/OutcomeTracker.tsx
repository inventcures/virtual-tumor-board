"use client";

import { useState } from "react";
import { Search, Plus, Save, Clock, Activity, AlertCircle, Heart } from "lucide-react";

export function OutcomeTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  // Mock past cases
  const pastCases = [
    { id: "case-2025-831", name: "Rahul Sharma", diagnosis: "Lung NSCLC Stage IIIA", date: "2025-10-15" },
    { id: "case-2025-902", name: "Priya Desai", diagnosis: "Breast IDC Stage II", date: "2025-11-02" },
    { id: "case-2026-015", name: "Amit Patel", diagnosis: "Colon Adenocarcinoma Stage III", date: "2026-01-05" },
  ];

  const filteredCases = pastCases.filter(c => 
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar - Case Selection */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID or Patient Name..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
          {filteredCases.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCase(c.id)}
              className={`w-full text-left p-4 hover:bg-slate-800 transition-colors ${
                selectedCase === c.id ? "bg-indigo-900/20 border-l-2 border-indigo-500" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-slate-200">{c.name}</span>
                <span className="text-xs text-slate-500 font-mono">{c.id}</span>
              </div>
              <p className="text-sm text-slate-400">{c.diagnosis}</p>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Initial Board: {c.date}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Outcome Form */}
      <div className="lg:col-span-2">
        {selectedCase ? (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Log Outcome: {pastCases.find(c => c.id === selectedCase)?.name}</h2>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium border border-indigo-500/30">
                Data used for VTB learning
              </span>
            </div>

            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Outcome saved to memory store!"); }}>
              {/* Clinical Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Clinical Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Current Status</label>
                    <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                      <option>Complete Response (CR)</option>
                      <option>Partial Response (PR)</option>
                      <option>Stable Disease (SD)</option>
                      <option>Progressive Disease (PD)</option>
                      <option>Deceased</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Time from Treatment (Months)</label>
                    <input type="number" min="0" defaultValue="6" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              {/* Toxicity & QoL */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Toxicity & Tolerance
                </h3>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Highest Grade Toxicity Experienced</label>
                  <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                    <option>Grade 0-1 (Mild)</option>
                    <option>Grade 2 (Moderate)</option>
                    <option>Grade 3 (Severe)</option>
                    <option>Grade 4 (Life-threatening)</option>
                    <option>Grade 5 (Fatal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Specific Adverse Events (comma separated)</label>
                  <input type="text" placeholder="e.g., Neuropathy, Neutropenia" className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              {/* Deviations */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Heart className="w-4 h-4" /> VTB Feedback Loop
                </h3>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Did the patient complete the recommended therapy?</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-slate-300">
                      <input type="radio" name="completed" defaultChecked className="text-indigo-500 bg-slate-800 border-slate-600 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                      Yes, full course
                    </label>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input type="radio" name="completed" className="text-indigo-500 bg-slate-800 border-slate-600 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                      No, dose reduced
                    </label>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input type="radio" name="completed" className="text-indigo-500 bg-slate-800 border-slate-600 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                      No, discontinued early
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">What should the VTB learn from this outcome?</label>
                  <textarea 
                    rows={4} 
                    placeholder="e.g., 'Patient struggled significantly with neuropathy from paclitaxel. The VTB should strongly consider patient's pre-existing mild diabetes next time we recommend taxanes...'"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20">
                  <Save className="w-4 h-4" /> Save Outcome to Memory
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-slate-700 border-dashed rounded-xl">
            <div className="text-4xl mb-4 opacity-50">📈</div>
            <h3 className="text-lg font-medium text-slate-400">No Case Selected</h3>
            <p className="text-sm text-slate-500 mt-2">Select a past case from the sidebar to log longitudinal outcomes.</p>
          </div>
        )}
      </div>
    </div>
  );
}