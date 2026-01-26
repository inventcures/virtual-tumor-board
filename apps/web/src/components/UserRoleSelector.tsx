"use client";

/**
 * User Role Selector & Chain-of-Thought Toggle
 * 
 * Allows users to:
 * 1. Select their role (patient, caregiver, physician, oncologist, researcher)
 * 2. Toggle visibility of the deliberation Chain-of-Thought stream
 * 
 * Role affects:
 * - Default CoT visibility (hidden for patients/caregivers)
 * - Future: Language complexity, emphasis areas
 */

import { useState } from "react";
import { 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Brain,
  Info,
  X
} from "lucide-react";
import { 
  useUser, 
  UserRole, 
  USER_ROLE_CONFIG 
} from "@/lib/user-context";

interface UserRoleSelectorProps {
  compact?: boolean;
  className?: string;
}

export function UserRoleSelector({ compact = false, className = "" }: UserRoleSelectorProps) {
  const { role, setRole, config, showDeliberationCoT, toggleDeliberationCoT } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const roles = Object.entries(USER_ROLE_CONFIG) as [UserRole, typeof config][];

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Compact role badge */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors"
        >
          <span>{config.icon}</span>
          <span className="text-slate-300">{config.label}</span>
          <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* CoT Toggle */}
        <button
          onClick={toggleDeliberationCoT}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors ${
            showDeliberationCoT 
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
          title={showDeliberationCoT ? "Hide AI thinking process" : "Show AI thinking process"}
        >
          {showDeliberationCoT ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">CoT</span>
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsDropdownOpen(false)} 
            />
            <div className="absolute top-full mt-1 right-0 z-50 w-64 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
              {roles.map(([roleKey, roleConfig]) => (
                <button
                  key={roleKey}
                  onClick={() => {
                    setRole(roleKey);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-700 transition-colors ${
                    role === roleKey ? "bg-slate-700" : ""
                  }`}
                >
                  <span className="text-lg">{roleConfig.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{roleConfig.label}</div>
                    <div className="text-xs text-slate-500">
                      {roleConfig.showCoTByDefault ? "Shows AI debate" : "Hides AI debate"}
                    </div>
                  </div>
                  {role === roleKey && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Full selector (for settings or onboarding)
  return (
    <div className={`p-4 rounded-xl bg-slate-800/50 border border-slate-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Who are you?</h3>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-slate-500 hover:text-slate-400"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        {/* CoT Toggle in full mode */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Show AI Debate:</span>
          <button
            onClick={toggleDeliberationCoT}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              showDeliberationCoT ? "bg-indigo-600" : "bg-slate-600"
            }`}
          >
            <span 
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                showDeliberationCoT ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-xs text-xs text-slate-300 mt-1">
          <p className="mb-2">
            <strong>For Patients/Caregivers:</strong> We hide the detailed AI debate by default to reduce anxiety and keep things simple.
          </p>
          <p>
            <strong>For Doctors:</strong> The full deliberation is shown so you can review the AI's reasoning and guideline citations.
          </p>
        </div>
      )}

      {/* Role Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {roles.map(([roleKey, roleConfig]) => (
          <button
            key={roleKey}
            onClick={() => setRole(roleKey)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
              role === roleKey
                ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            <span className="text-2xl">{roleConfig.icon}</span>
            <span className="text-xs font-medium text-center">{roleConfig.label}</span>
          </button>
        ))}
      </div>

      {/* Current selection info */}
      <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
        <div className="flex items-start gap-2">
          <span className="text-xl">{config.icon}</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{config.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{config.description}</div>
            <div className="text-xs text-slate-500 mt-1">
              {showDeliberationCoT 
                ? "You'll see the AI specialists' debate in real-time" 
                : "You'll see the final recommendations only"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone CoT Toggle Button
 * For use when role selector is elsewhere
 */
export function CoTToggle({ className = "" }: { className?: string }) {
  const { showDeliberationCoT, toggleDeliberationCoT, config } = useUser();

  return (
    <button
      onClick={toggleDeliberationCoT}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        showDeliberationCoT
          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
          : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300"
      } ${className}`}
    >
      {showDeliberationCoT ? (
        <>
          <Brain className="w-4 h-4" />
          <span className="text-sm font-medium">AI Thinking: ON</span>
          <Eye className="w-4 h-4 opacity-60" />
        </>
      ) : (
        <>
          <Brain className="w-4 h-4" />
          <span className="text-sm font-medium">AI Thinking: OFF</span>
          <EyeOff className="w-4 h-4 opacity-60" />
        </>
      )}
    </button>
  );
}

/**
 * First-time user role selection modal
 */
export function RoleSelectionModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { role, setRole, config } = useUser();

  if (!isOpen) return null;

  const handleSelect = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleContinue = () => {
    onClose();
  };

  const roles = Object.entries(USER_ROLE_CONFIG) as [UserRole, typeof config][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome to Virtual Tumor Board</h2>
          <p className="text-sm text-slate-400 mt-1">
            Tell us who you are so we can customize your experience
          </p>
        </div>

        {/* Role Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {roles.map(([roleKey, roleConfig]) => (
            <button
              key={roleKey}
              onClick={() => handleSelect(roleKey)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                role === roleKey
                  ? "bg-indigo-500/20 border-indigo-500/50"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              }`}
            >
              <span className="text-2xl">{roleConfig.icon}</span>
              <div>
                <div className={`text-sm font-medium ${role === roleKey ? "text-white" : "text-slate-300"}`}>
                  {roleConfig.label}
                </div>
                <div className="text-xs text-slate-500">
                  {roleConfig.showCoTByDefault ? "Full AI insight" : "Summary only"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Explanation */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400">
              <p className="mb-1">
                <strong className="text-slate-300">For patients & caregivers:</strong> We show you the final recommendations in simple language, without the detailed AI debate.
              </p>
              <p>
                <strong className="text-slate-300">For doctors & researchers:</strong> You'll see the full deliberation process - watch as 7 AI specialists debate your case in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          Continue as {config.label}
        </button>

        <p className="text-center text-xs text-slate-500 mt-3">
          You can change this anytime from the header menu
        </p>
      </div>
    </div>
  );
}
