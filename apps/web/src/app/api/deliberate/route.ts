import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { caseData } = await request.json();
    
    // For now, return success - actual deliberation handled client-side
    // In production, this would call the orchestrator
    return NextResponse.json({ 
      status: "started",
      message: "Deliberation initiated",
      caseId: caseData?.id 
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to start deliberation" },
      { status: 500 }
    );
  }
}
