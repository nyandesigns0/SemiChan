import { NextRequest, NextResponse } from "next/server";
import { synthesizeConceptLabel } from "@/lib/analysis/label-synthesizer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await synthesizeConceptLabel(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Concept Synthesis API Error:", error);
    return NextResponse.json({ error: "Internal server error during synthesis" }, { status: 500 });
  }
}
