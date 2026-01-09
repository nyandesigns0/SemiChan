import { NextRequest, NextResponse } from "next/server";
import { segmentByJuror } from "@/lib/segmentation/juror-segmenter";
import type { SegmentRequest, SegmentResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const body: SegmentRequest = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid request: text is required" }, { status: 400 });
    }

    const blocks = segmentByJuror(text);

    const response: SegmentResponse = {
      blocks,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in segment API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

