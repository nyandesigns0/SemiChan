import { NextRequest, NextResponse } from "next/server";
import { buildAnalysis } from "@/lib/graph/graph-builder";
import type { AnalyzeRequest, AnalyzeResponse } from "@/types/api";
import { DEFAULT_EVIDENCE_RANKING_PARAMS } from "@/lib/analysis/evidence-ranker";

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
      evidenceRankingParams,
      clusteringMode,
      autoK,
      kMin,
      kMax,
      softMembership,
      softTopN,
      cutType,
      granularityPercent,
      clusterSeed,
      numDimensions,
      dimensionMode,
      varianceThreshold,
      model
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

    // Validate evidence ranking weights if provided
    if (evidenceRankingParams) {
      if (typeof evidenceRankingParams.semanticWeight !== "number" || 
          evidenceRankingParams.semanticWeight < 0 || 
          evidenceRankingParams.semanticWeight > 1) {
        return NextResponse.json(
          { error: "Invalid request: evidenceRankingParams.semanticWeight must be between 0 and 1" },
          { status: 400 }
        );
      }
      if (typeof evidenceRankingParams.frequencyWeight !== "number" || 
          evidenceRankingParams.frequencyWeight < 0 || 
          evidenceRankingParams.frequencyWeight > 1) {
        return NextResponse.json(
          { error: "Invalid request: evidenceRankingParams.frequencyWeight must be between 0 and 1" },
          { status: 400 }
        );
      }
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
      {
        evidenceRankingParams,
        clusteringMode,
        autoK,
        kMin,
        kMax,
        softMembership,
        softTopN,
        cutType,
        granularityPercent,
        seed: clusterSeed,
        numDimensions: numDimensions || 3,
        dimensionMode,
        varianceThreshold,
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
