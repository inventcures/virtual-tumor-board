import { NextRequest, NextResponse } from "next/server";
import { PreferenceMemoryStore, PreferenceRecord } from "@vtb/agents";
import { verifyApiAuth } from "@/lib/api-auth";

// NOTE: in a real application, you would ensure the clinician ID is fetched
// from the authenticated user context (e.g. NextAuth/Clerk).
export async function POST(req: NextRequest) {
  const authError = verifyApiAuth(req);
  if (authError) return authError;

  try {
    const data = await req.json();

    const {
      caseId,
      clinicianId = "demo_clinician",
      originalRecommendation,
      clinicianOverride,
      rationale
    } = data;

    if (!caseId || !clinicianOverride || !rationale) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // In a real implementation this would write to a DB, but we are using our JSON store.
    const memoryStore = new PreferenceMemoryStore();
    
    const record: PreferenceRecord = {
      caseId,
      clinicianId,
      originalRecommendation: originalRecommendation || "Unknown",
      clinicianOverride,
      rationale,
      timestamp: new Date().toISOString()
    };

    await memoryStore.savePreference(record);

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Failed to save feedback:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}