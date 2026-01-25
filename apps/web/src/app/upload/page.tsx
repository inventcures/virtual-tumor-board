"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Stethoscope, 
  HeartPulse, 
  ArrowRight, 
  Shield, 
  Clock, 
  Brain,
  AlertTriangle 
} from "lucide-react";
import type { UserType, UploadSession } from "@/types/user-upload";
import { generateSessionId, UPLOAD_LIMITS } from "@/lib/upload/constants";

// User type options with descriptions
const USER_TYPES: {
  type: UserType;
  icon: typeof User;
  title: string;
  titleHindi: string;
  description: string;
  descriptionHindi: string;
  color: string;
}[] = [
  {
    type: "patient",
    icon: User,
    title: "Patient / Caregiver",
    titleHindi: "मरीज़ / देखभालकर्ता",
    description: "I'm a patient or caring for someone with cancer",
    descriptionHindi: "मैं मरीज़ हूं या किसी कैंसर रोगी की देखभाल कर रहा हूं",
    color: "from-blue-500 to-cyan-500",
  },
  {
    type: "oncologist",
    icon: HeartPulse,
    title: "Oncologist",
    titleHindi: "ऑन्कोलॉजिस्ट",
    description: "I'm an oncology specialist seeking second opinion",
    descriptionHindi: "मैं एक ऑन्कोलॉजी विशेषज्ञ हूं जो दूसरी राय चाहता हूं",
    color: "from-purple-500 to-pink-500",
  },
  {
    type: "doctor",
    icon: Stethoscope,
    title: "Non-Oncology Doctor",
    titleHindi: "अन्य डॉक्टर",
    description: "I'm a referring physician needing oncology guidance",
    descriptionHindi: "मैं एक रेफ़र करने वाला डॉक्टर हूं जिसे ऑन्कोलॉजी मार्गदर्शन चाहिए",
    color: "from-emerald-500 to-teal-500",
  },
];

export default function UploadPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Clear any existing session on mount
  useEffect(() => {
    // Check for existing session
    const existingSession = localStorage.getItem("vtb_upload_session");
    if (existingSession) {
      try {
        const session: UploadSession = JSON.parse(existingSession);
        // If session is not expired and has documents, ask if they want to continue
        if (new Date(session.expiresAt) > new Date() && session.documents.length > 0) {
          // Could show a "Continue previous session?" dialog here
          // For now, just clear it to start fresh
        }
      } catch (e) {
        // Invalid session, clear it
        localStorage.removeItem("vtb_upload_session");
      }
    }
  }, []);

  const handleContinue = () => {
    if (!selectedType || !consentChecked) return;

    setIsCreatingSession(true);

    // Create new session
    const session: UploadSession = {
      id: generateSessionId(),
      userType: selectedType,
      cancerSite: "",
      staging: {},
      documents: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + UPLOAD_LIMITS.SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    };

    // Store in localStorage
    localStorage.setItem("vtb_upload_session", JSON.stringify(session));

    // Navigate to next step
    router.push("/upload/cancer-info");
  };

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
              <h1 className="text-xl font-bold text-white">Upload Your Records</h1>
              <p className="text-xs text-slate-400">Get AI Tumor Board opinions on your case</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span className="text-indigo-400 font-medium">Step 1 of 4</span>
            <span>Who are you?</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              Who is uploading these records?
            </h2>
            <p className="text-slate-400">
              This helps us tailor the language and recommendations
            </p>
          </div>

          {/* User type selection */}
          <div className="grid md:grid-cols-3 gap-4">
            {USER_TYPES.map((userType) => {
              const Icon = userType.icon;
              const isSelected = selectedType === userType.type;

              return (
                <button
                  key={userType.type}
                  onClick={() => setSelectedType(userType.type)}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-200 text-left
                    ${isSelected
                      ? `border-transparent bg-gradient-to-br ${userType.color} shadow-lg shadow-${userType.color.split('-')[1]}-500/25`
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                    }
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-4
                    ${isSelected ? "bg-white/20" : "bg-slate-700"}
                  `}>
                    <Icon className={`w-6 h-6 ${isSelected ? "text-white" : "text-slate-300"}`} />
                  </div>
                  
                  <h3 className={`font-semibold mb-1 ${isSelected ? "text-white" : "text-slate-200"}`}>
                    {userType.title}
                  </h3>
                  <p className={`text-sm ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                    {userType.titleHindi}
                  </p>
                  
                  <p className={`text-sm mt-3 ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                    {userType.description}
                  </p>

                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Consent & Disclaimer */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white mb-1">Important Disclaimer</h4>
                <p className="text-sm text-slate-400">
                  This AI-powered Virtual Tumor Board is for <strong className="text-amber-400">educational and informational purposes only</strong>. 
                  It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Your documents are processed securely and never stored permanently</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Session auto-deletes after 24 hours for your privacy</span>
              </div>
            </div>

            <label className="flex items-start gap-3 mt-6 cursor-pointer group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="peer sr-only"
                />
                <div className={`
                  w-5 h-5 rounded border-2 transition-colors
                  ${consentChecked 
                    ? "bg-indigo-500 border-indigo-500" 
                    : "border-slate-600 group-hover:border-slate-500"
                  }
                `}>
                  {consentChecked && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-slate-300 text-sm">
                I understand this is AI-generated advice and will discuss any recommendations with my treating physician. 
                I confirm I have the right to share these medical records.
              </span>
            </label>
          </div>

          {/* Continue button */}
          <div className="flex justify-center">
            <button
              onClick={handleContinue}
              disabled={!selectedType || !consentChecked || isCreatingSession}
              className={`
                flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all
                ${selectedType && consentChecked
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }
              `}
            >
              {isCreatingSession ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating session...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Back to demo link */}
          <div className="text-center">
            <a href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              ← Back to demo cases
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
