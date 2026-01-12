import { NextRequest, NextResponse } from "next/server";
import { computeConceptAlignment } from "@/lib/graph/concept-alignment";
import type { AlignRequest, AlignResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText) as AlignRequest;
    const { jurorAnalysis, designerAnalysis, threshold = 0.3 } = body;

    if (!jurorAnalysis || !designerAnalysis) {
      return NextResponse.json({ error: "jurorAnalysis and designerAnalysis are required" }, { status: 400 });
    }

    const jurorConcepts = jurorAnalysis.primaryConcepts || jurorAnalysis.concepts || [];
    const designerConcepts = designerAnalysis.concepts || [];
    const jurorCentroids = jurorAnalysis.nodes
      ?.filter((n) => n.type === "concept" && n.layer !== "detail")
      .map((n) => new Float64Array(n.pcValues || [])) || [];
    const designerCentroids = designerAnalysis.nodes
      ?.filter((n) => n.type === "designerConcept" && n.layer !== "detail")
      .map((n) => new Float64Array(n.pcValues || [])) || [];

    const links = computeConceptAlignment(
      jurorConcepts,
      designerConcepts,
      jurorCentroids,
      designerCentroids,
      threshold
    );

    const response: AlignResponse = {
      links,
      alignmentStats: {
        totalJurorConcepts: jurorConcepts.length,
        totalDesignerConcepts: designerConcepts.length,
        threshold,
        linkCount: links.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[align] error", error);
    return NextResponse.json({ error: "Failed to compute alignment" }, { status: 500 });
  }
}
