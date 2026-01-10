import { NextRequest, NextResponse } from "next/server";
import { buildAnalysis } from "@/lib/graph/graph-builder";
import type { AnalyzeRequest, AnalyzeResponse } from "@/types/api";
import type { HybridAnalysisParams } from "@/types/nlp";
import { DEFAULT_HYBRID_PARAMS } from "@/lib/analysis/hybrid-vectors";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    let body: AnalyzeRequest;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { 
      blocks, 
      kConcepts, 
      similarityThreshold, 
      semanticWeight, 
      frequencyWeight,
      clusteringMode,
      autoK,
      kMin,
      kMax,
      softMembership,
      softTopN,
      cutType,
      granularityPercent
    } = body;

    if (!blocks || !Array.isArray(blocks)) {
      return NextResponse.json({ error: "Invalid request: blocks array is required" }, { status: 400 });
    }

    if (typeof kConcepts !== "number" || kConcepts < 1) {
      return NextResponse.json({ error: "Invalid request: kConcepts must be a positive number" }, { status: 400 });
    }

    if (typeof similarityThreshold !== "number" || similarityThreshold < 0 || similarityThreshold > 1) {
      return NextResponse.json(
        { error: "Invalid request: similarityThreshold must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Validate hybrid weights if provided
    const hybridParams: HybridAnalysisParams = {
      semanticWeight: DEFAULT_HYBRID_PARAMS.semanticWeight,
      frequencyWeight: DEFAULT_HYBRID_PARAMS.frequencyWeight,
    };

    if (semanticWeight !== undefined) {
      if (typeof semanticWeight !== "number" || semanticWeight < 0 || semanticWeight > 1) {
        return NextResponse.json(
          { error: "Invalid request: semanticWeight must be between 0 and 1" },
          { status: 400 }
        );
      }
      hybridParams.semanticWeight = semanticWeight;
    }

    if (frequencyWeight !== undefined) {
      if (typeof frequencyWeight !== "number" || frequencyWeight < 0 || frequencyWeight > 1) {
        return NextResponse.json(
          { error: "Invalid request: frequencyWeight must be between 0 and 1" },
          { status: 400 }
        );
      }
      hybridParams.frequencyWeight = frequencyWeight;
    }

    // Validate cutType and granularityPercent if provided
    if (cutType !== undefined && cutType !== "count" && cutType !== "granularity") {
      return NextResponse.json(
        { error: "Invalid request: cutType must be 'count' or 'granularity'" },
        { status: 400 }
      );
    }

    if (granularityPercent !== undefined) {
      if (typeof granularityPercent !== "number" || granularityPercent < 0 || granularityPercent > 100) {
        return NextResponse.json(
          { error: "Invalid request: granularityPercent must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // buildAnalysis is now async
    const analysis = await buildAnalysis(
      blocks, 
      kConcepts, 
      similarityThreshold, 
      hybridParams,
      {
        clusteringMode,
        autoK,
        kMin,
        kMax,
        softMembership,
        softTopN,
        cutType,
        granularityPercent
      }
    );

    const response: AnalyzeResponse = {
      analysis,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in analyze API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
