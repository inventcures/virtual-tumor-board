export interface AgentUIConfig {
  id: string;
  name: string;
  specialty: string;
  color: string;
  icon: string;
}

export const AGENT_UI_CONFIG: Record<string, AgentUIConfig> = {
  "principal-investigator": { id: "principal-investigator", name: "Dr. Adhyaksha", specialty: "Chairperson", color: "moderator", icon: "🌟" },
  "surgical-oncologist": { id: "surgical-oncologist", name: "Dr. Shalya", specialty: "Surgical Oncology", color: "surgical", icon: "🔪" },
  "medical-oncologist": { id: "medical-oncologist", name: "Dr. Chikitsa", specialty: "Medical Oncology", color: "medical", icon: "💊" },
  "radiation-oncologist": { id: "radiation-oncologist", name: "Dr. Kirann", specialty: "Radiation Oncology", color: "radiation", icon: "☢️" },
  "palliative-care": { id: "palliative-care", name: "Dr. Shanti", specialty: "Palliative Care", color: "palliative", icon: "🕊️" },
  "radiologist": { id: "radiologist", name: "Dr. Chitran", specialty: "Onco-Radiology", color: "radiology", icon: "📷" },
  "pathologist": { id: "pathologist", name: "Dr. Marga", specialty: "Pathology", color: "pathology", icon: "🔬" },
  "geneticist": { id: "geneticist", name: "Dr. Anuvamsha", specialty: "Genetics", color: "genetics", icon: "🧬" },
  "scientific-critic": { id: "scientific-critic", name: "Dr. Tark", specialty: "Scientific Safety", color: "critic", icon: "🛡️" },
  "stewardship": { id: "stewardship", name: "Dr. Samata", specialty: "Patient Advocate", color: "stewardship", icon: "⚖️" },
};

export const ROUND1_AGENTS: AgentUIConfig[] = [
  AGENT_UI_CONFIG["surgical-oncologist"],
  AGENT_UI_CONFIG["medical-oncologist"],
  AGENT_UI_CONFIG["radiation-oncologist"],
  AGENT_UI_CONFIG["palliative-care"],
  AGENT_UI_CONFIG["radiologist"],
  AGENT_UI_CONFIG["pathologist"],
  AGENT_UI_CONFIG["geneticist"],
];

export const ALL_DELIBERATION_AGENTS: AgentUIConfig[] = [
  AGENT_UI_CONFIG["principal-investigator"],
  AGENT_UI_CONFIG["surgical-oncologist"],
  AGENT_UI_CONFIG["medical-oncologist"],
  AGENT_UI_CONFIG["radiation-oncologist"],
  AGENT_UI_CONFIG["radiologist"],
  AGENT_UI_CONFIG["pathologist"],
  AGENT_UI_CONFIG["scientific-critic"],
  AGENT_UI_CONFIG["stewardship"],
  AGENT_UI_CONFIG["palliative-care"],
  AGENT_UI_CONFIG["geneticist"],
];

export const AGENT_COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; light: string }> = {
  surgical: { bg: "bg-red-500", border: "border-red-500/30", text: "text-red-400", light: "bg-red-500/10" },
  medical: { bg: "bg-blue-500", border: "border-blue-500/30", text: "text-blue-400", light: "bg-blue-500/10" },
  radiation: { bg: "bg-amber-500", border: "border-amber-500/30", text: "text-amber-400", light: "bg-amber-500/10" },
  palliative: { bg: "bg-emerald-500", border: "border-emerald-500/30", text: "text-emerald-400", light: "bg-emerald-500/10" },
  radiology: { bg: "bg-cyan-500", border: "border-cyan-500/30", text: "text-cyan-400", light: "bg-cyan-500/10" },
  pathology: { bg: "bg-purple-500", border: "border-purple-500/30", text: "text-purple-400", light: "bg-purple-500/10" },
  genetics: { bg: "bg-pink-500", border: "border-pink-500/30", text: "text-pink-400", light: "bg-pink-500/10" },
  moderator: { bg: "bg-indigo-500", border: "border-indigo-500/30", text: "text-indigo-400", light: "bg-indigo-500/10" },
  critic: { bg: "bg-rose-500", border: "border-rose-500/30", text: "text-rose-400", light: "bg-rose-500/10" },
  stewardship: { bg: "bg-teal-500", border: "border-teal-500/30", text: "text-teal-400", light: "bg-teal-500/10" },
};

export function getAgentMeta(agentId: string): AgentUIConfig {
  return AGENT_UI_CONFIG[agentId] || { id: agentId, name: agentId, specialty: "Specialist", color: "medical", icon: "👤" };
}

export function getAgentColors(colorKey: string): { bg: string; border: string; text: string; light: string } {
  return AGENT_COLOR_CLASSES[colorKey] || AGENT_COLOR_CLASSES.medical;
}
