import { NextRequest, NextResponse } from "next/server";
import { buildDesignerAnalysis } from "@/lib/graph/designer-graph-builder";
import type { DesignerAnalyzeRequest, DesignerAnalyzeResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody) as DesignerAnalyzeRequest;

    if (!Array.isArray(body.blocks)) {
      return NextResponse.json({ error: "blocks array is required" }, { status: 400 });
    }

    const analysis = await buildDesignerAnalysis(body.blocks, {
      kConcepts: body.kConcepts ?? 6,
      similarityThreshold: body.similarityThreshold ?? 0.3,
      seed: body.clusterSeed ?? 13,
      imageThreshold: body.imageThreshold ?? 0.25,
    });

    const response: DesignerAnalyzeResponse = {
      analysis,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[analyze-designer] error", error);
    return NextResponse.json({ error: "Failed to analyze designer input" }, { status: 500 });
  }
}
