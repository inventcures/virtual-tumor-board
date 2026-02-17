"use client";

/**
 * User Context for Virtual Tumor Board
 * 
 * Manages user role/persona which affects:
 * - Default visibility of deliberation chain-of-thought
 * - Language complexity of explanations
 * - Which details are emphasized
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { trackRoleChange, getVisitorId } from "@/lib/analytics/client-tracker";

// User roles with different defaults for Chain-of-Thought visibility
export type UserRole = 
  | "patient"           // Patient viewing their case - COT hidden by default (reduce anxiety)
  | "caregiver"         // Family/caregiver - COT hidden by default (reduce complexity)
  | "primary-care"      // Primary care physician - COT shown by default (educational)
  | "non-onco-specialist" // Non-oncology specialist - COT shown by default
  | "oncologist"        // Oncologist - COT shown by default (peer review)
  | "researcher";       // Researcher/student - COT shown by default (learning)

export interface UserRoleConfig {
  label: string;
  description: string;
  icon: string;
  showCoTByDefault: boolean;
  simplifyLanguage: boolean;
}

export const USER_ROLE_CONFIG: Record<UserRole, UserRoleConfig> = {
  patient: {
    label: "Patient",
    description: "I am the patient reviewing my tumor board recommendations",
    icon: "🧑",
    showCoTByDefault: false,  // Hide debate to reduce anxiety
    simplifyLanguage: true,
  },
  caregiver: {
    label: "Caregiver / Family",
    description: "I am a family member or caregiver helping the patient",
    icon: "👨‍👩‍👧",
    showCoTByDefault: false,  // Hide debate to reduce complexity
    simplifyLanguage: true,
  },
  "primary-care": {
    label: "Primary Care Physician",
    description: "I am the patient's primary care doctor",
    icon: "👨‍⚕️",
    showCoTByDefault: true,   // Show to help them understand oncology reasoning
    simplifyLanguage: false,
  },
  "non-onco-specialist": {
    label: "Non-Oncology Specialist",
    description: "I am a specialist doctor (surgery, radiology, etc.)",
    icon: "🩺",
    showCoTByDefault: true,   // Show for educational value
    simplifyLanguage: false,
  },
  oncologist: {
    label: "Oncologist",
    description: "I am a practicing oncologist (medical, surgical, or radiation)",
    icon: "🔬",
    showCoTByDefault: true,   // Full transparency for peer review
    simplifyLanguage: false,
  },
  researcher: {
    label: "Researcher / Student",
    description: "I am a medical student, researcher, or educator",
    icon: "📚",
    showCoTByDefault: true,   // Show for learning
    simplifyLanguage: false,
  },
};

interface UserContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  config: UserRoleConfig;
  showDeliberationCoT: boolean;
  setShowDeliberationCoT: (show: boolean) => void;
  toggleDeliberationCoT: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // Default to oncologist for demo purposes (can change)
  const [role, setRoleState] = useState<UserRole>("oncologist");
  const [showCoTOverride, setShowCoTOverride] = useState<boolean | null>(null);

  const config = USER_ROLE_CONFIG[role];

  // If user hasn't manually toggled, use role default
  const showDeliberationCoT = showCoTOverride !== null 
    ? showCoTOverride 
    : config.showCoTByDefault;

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    // Reset override when role changes
    setShowCoTOverride(null);

    // Track role change in analytics
    const visitorId = getVisitorId();
    if (visitorId) {
      trackRoleChange(newRole, visitorId);
    }
  }, []);

  const setShowDeliberationCoT = useCallback((show: boolean) => {
    setShowCoTOverride(show);
  }, []);

  const toggleDeliberationCoT = useCallback(() => {
    setShowCoTOverride(prev => 
      prev !== null ? !prev : !config.showCoTByDefault
    );
  }, [config.showCoTByDefault]);

  return (
    <UserContext.Provider value={{
      role,
      setRole,
      config,
      showDeliberationCoT,
      setShowDeliberationCoT,
      toggleDeliberationCoT,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

// Hook for components that just need to know if CoT should be shown
export function useShowDeliberationCoT(): boolean {
  const context = useContext(UserContext);
  // If no provider, default to showing (for standalone usage)
  return context?.showDeliberationCoT ?? true;
}
