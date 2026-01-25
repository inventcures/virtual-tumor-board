"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  ArrowLeft,
  Brain,
  Search,
  HelpCircle,
  Flame,
  Globe,
  Sparkles,
  Upload,
  FileSearch,
  Zap
} from "lucide-react";
import type { UploadSession, StagingInfo } from "@/types/user-upload";
import { CANCER_SITES, getCancerSiteById } from "@/lib/upload/constants";

// Staging options
const STAGES = [
  { value: "I", label: "Stage I", description: "Early, localized" },
  { value: "II", label: "Stage II", description: "Localized with some spread" },
  { value: "III", label: "Stage III", description: "Locally advanced" },
  { value: "IV", label: "Stage IV", description: "Metastatic/advanced" },
  { value: "unknown", label: "Unknown", description: "Not sure of stage" },
] as const;

export default function CancerInfoPage() {
  const router = useRouter();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [selectedCancerSite, setSelectedCancerSite] = useState<string>("");
  const [otherCancerSite, setOtherCancerSite] = useState<string>("");
  const [staging, setStaging] = useState<StagingInfo>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCancers, setShowAllCancers] = useState(false);

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vtb_upload_session");
    if (!stored) {
      router.push("/upload");
      return;
    }
    
    try {
      const parsed: UploadSession = JSON.parse(stored);
      setSession(parsed);
      if (parsed.cancerSite) {
        setSelectedCancerSite(parsed.cancerSite);
      }
      if (parsed.staging) {
        setStaging(parsed.staging);
      }
    } catch (e) {
      router.push("/upload");
    }
  }, [router]);

  // Filter cancer sites based on search
  const filteredCancerSites = CANCER_SITES.filter(site => {
    if (searchQuery) {
      return (
        site.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.labelHindi?.includes(searchQuery) ||
        site.id.includes(searchQuery.toLowerCase())
      );
    }
    if (showAllCancers) return true;
    // Show India-prevalent + high prevalence by default
    return site.prevalence === "high-india" || site.prevalence === "high";
  });

  const handleContinue = () => {
    if (!session || !selectedCancerSite) return;

    // Update session
    const updatedSession: UploadSession = {
      ...session,
      cancerSite: selectedCancerSite === "other" ? otherCancerSite : selectedCancerSite,
      staging,
    };

    localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));
    router.push("/upload/documents");
  };

  // Handle "Figure It Out" - skip to documents with auto-detect flag
  const handleFigureItOut = () => {
    if (!session) return;

    // Update session with auto-detect flag
    const updatedSession = {
      ...session,
      cancerSite: "auto-detect",  // Special value indicating auto-detection needed
      isAutoStaged: true,
      staging: {},
    };

    localStorage.setItem("vtb_upload_session", JSON.stringify(updatedSession));
    router.push("/upload/documents");
  };

  const handleBack = () => {
    router.push("/upload");
  };

  const selectedSite = getCancerSiteById(selectedCancerSite);

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-white">Cancer Information</h1>
              <p className="text-xs text-slate-400">Help us understand your case</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span className="text-indigo-400 font-medium">Step 2 of 4</span>
            <span>Cancer Type & Stage</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-2/4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
          </div>
        </div>

        <div className="space-y-8">
          {/* Cancer Site Selection */}
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              What type of cancer?
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Select the primary cancer site. This helps us check if you have all necessary documents.
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cancer type..."
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* India-prevalent indicator */}
            {!searchQuery && !showAllCancers && (
              <div className="flex items-center gap-2 mb-4 text-sm text-amber-400">
                <Flame className="w-4 h-4" />
                <span>Common cancers in India shown first</span>
              </div>
            )}

            {/* Cancer site grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {filteredCancerSites.map((site) => {
                const isSelected = selectedCancerSite === site.id;
                const isIndiaPrevalent = site.prevalence === "high-india";

                return (
                  <button
                    key={site.id}
                    onClick={() => setSelectedCancerSite(site.id)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all text-left
                      ${isSelected
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      }
                    `}
                  >
                    {isIndiaPrevalent && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-md">
                        🇮🇳 Common
                      </span>
                    )}
                    <p className={`font-medium ${isSelected ? "text-indigo-300" : "text-slate-200"}`}>
                      {site.label}
                    </p>
                    {site.labelHindi && (
                      <p className={`text-xs mt-0.5 ${isSelected ? "text-indigo-400" : "text-slate-500"}`}>
                        {site.labelHindi}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Show all button */}
            {!searchQuery && !showAllCancers && (
              <button
                onClick={() => setShowAllCancers(true)}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Show all cancer types
              </button>
            )}

            {/* Other cancer input */}
            {selectedCancerSite === "other" && (
              <div className="mt-4">
                <input
                  type="text"
                  value={otherCancerSite}
                  onChange={(e) => setOtherCancerSite(e.target.value)}
                  placeholder="Please specify the cancer type..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-900 text-slate-500">OR</span>
              </div>
            </div>

            {/* Figure It Out Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-cyan-500/10 border-2 border-purple-500/30 p-6">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-cyan-500/5 animate-pulse" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Not sure? Let AI figure it out
                    </h3>
                    <p className="text-sm text-purple-300">
                      Skip this step entirely
                    </p>
                  </div>
                </div>

                <p className="text-slate-300 text-sm mb-4">
                  Upload your medical documents and our AI will automatically detect:
                </p>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <FileSearch className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <span className="text-slate-300">Cancer type & site</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <span className="text-slate-300">Stage (TNM & overall)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <span className="text-slate-300">Key biomarkers & mutations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-slate-300">Treatment timeline</span>
                  </div>
                </div>

                <button
                  onClick={handleFigureItOut}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload className="w-5 h-5" />
                  Upload Documents & Auto-Detect
                  <ArrowRight className="w-5 h-5" />
                </button>

                <p className="text-center text-xs text-slate-500 mt-3">
                  You can review and edit the AI's findings before proceeding
                </p>
              </div>
            </div>
          </div>

          {/* Staging Information */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">
                Stage (if known)
              </h2>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Optional</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Helps the tumor board give more specific recommendations
            </p>

            {/* Stage buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {STAGES.map((stageOption) => {
                const isSelected = staging.stage === stageOption.value;
                return (
                  <button
                    key={stageOption.value}
                    onClick={() => setStaging(prev => ({ 
                      ...prev, 
                      stage: stageOption.value as StagingInfo["stage"]
                    }))}
                    className={`
                      px-4 py-2 rounded-lg border-2 transition-all
                      ${isSelected
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                      }
                    `}
                  >
                    <span className="font-medium">{stageOption.label}</span>
                    <span className="text-xs text-slate-500 ml-2">{stageOption.description}</span>
                  </button>
                );
              })}
            </div>

            {/* TNM / Free text staging */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <HelpCircle className="w-4 h-4" />
                <span>Or describe staging in your own words:</span>
              </div>
              <input
                type="text"
                value={staging.description || ""}
                onChange={(e) => setStaging(prev => ({ ...prev, description: e.target.value }))}
                placeholder='e.g., "T2N1M0" or "locally advanced" or "metastatic to liver"'
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Selected cancer requirements preview */}
          {selectedSite && selectedSite.id !== "other" && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-medium text-white mb-2">
                Documents needed for {selectedSite.label}:
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-red-400 font-medium mb-1">Critical</p>
                  <ul className="text-slate-400 space-y-1">
                    {selectedSite.requiredDocs.critical.map(doc => (
                      <li key={doc}>• {doc}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-amber-400 font-medium mb-1">Recommended</p>
                  <ul className="text-slate-400 space-y-1">
                    {selectedSite.requiredDocs.recommended.map(doc => (
                      <li key={doc}>• {doc}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-slate-500 font-medium mb-1">Optional</p>
                  <ul className="text-slate-500 space-y-1">
                    {selectedSite.requiredDocs.optional.map(doc => (
                      <li key={doc}>• {doc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <button
              onClick={handleContinue}
              disabled={!selectedCancerSite || (selectedCancerSite === "other" && !otherCancerSite)}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all
                ${selectedCancerSite && (selectedCancerSite !== "other" || otherCancerSite)
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/25"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }
              `}
            >
              Continue to Upload
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
