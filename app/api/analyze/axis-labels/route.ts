import { NextRequest, NextResponse } from "next/server";
import type { AxisLabelsRequest, AxisLabelsResponse } from "@/types/api";

import { DEFAULT_MODEL } from "@/constants/nlp-constants";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const body: AxisLabelsRequest = await request.json();
    const { axisLabels, model = DEFAULT_MODEL } = body;

    const systemPrompt = `You are an expert at analyzing semantic relationships and dimensions of variation in textual data.

Your task is to identify two distinct, opposite keywords or short phrases (n-grams) that represent the two poles of a semantic dimension based on the provided evidence.

RULES:
1. OUTPUT JSON ONLY.
2. For each dimension, generate exactly two contrasting keywords or short phrases (max 3 words each).
3. The keywords must be derived from the specific concepts, keywords, and evidence sentences provided for each end of the axis.
4. The two keywords should define a coherent "spectrum of variation" or "thematic tension."
5. Compare and contrast the "Negative End" context with the "Positive End" context to find the most meaningful conceptual difference.
6. Use professional, architectural, and conceptually meaningful language.
7. DO NOT just repeat the input concept titles if a more descriptive keyword pair can be found in the evidence.`;

    // Build prompts for each axis
    const synthesizeAxis = async (
      axis: "x" | "y" | "z", 
      negative: string, 
      positive: string, 
      negContext: { keywords: string[], sentences: string[] },
      posContext: { keywords: string[], sentences: string[] },
      modelName: string
    ): Promise<{ negative: string; positive: string; usage: any }> => {
      const userPrompt = `The ${axis.toUpperCase()}-axis represents a spectrum of variation.

NEGATIVE END POLE:
Title: "${negative}"
Keywords: ${negContext.keywords.join(", ")}
Evidence Excerpts:
${negContext.sentences.slice(0, 5).map((s, i) => `- ${s}`).join("\n")}

POSITIVE END POLE:
Title: "${positive}"
Keywords: ${posContext.keywords.join(", ")}
Evidence Excerpts:
${posContext.sentences.slice(0, 5).map((s, i) => `- ${s}`).join("\n")}

Based on the evidence above, identify two specific, contrasting keywords or short phrases that define the "poles" of this dimension. Consider what makes these two sets of feedback fundamentally different.

Respond with JSON:
{
  "negative_keyword": "Keyword for negative end",
  "positive_keyword": "Keyword for positive end"
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modelName.toLowerCase().replace(/\s+/g, "-"),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      return {
        negative: result.negative_keyword || negative,
        positive: result.positive_keyword || positive,
        usage: data.usage
      };
    };

    // Synthesize all three axes
    const xRes = await synthesizeAxis("x", axisLabels.x.negative, axisLabels.x.positive, axisLabels.x.negativeContext, axisLabels.x.positiveContext, model);
    const yRes = await synthesizeAxis("y", axisLabels.y.negative, axisLabels.y.positive, axisLabels.y.negativeContext, axisLabels.y.positiveContext, model);
    const zRes = await synthesizeAxis("z", axisLabels.z.negative, axisLabels.z.positive, axisLabels.z.negativeContext, axisLabels.z.positiveContext, model);

    const totalUsage = {
      prompt_tokens: (xRes.usage?.prompt_tokens || 0) + (yRes.usage?.prompt_tokens || 0) + (zRes.usage?.prompt_tokens || 0),
      completion_tokens: (xRes.usage?.completion_tokens || 0) + (yRes.usage?.completion_tokens || 0) + (zRes.usage?.completion_tokens || 0),
      total_tokens: (xRes.usage?.total_tokens || 0) + (yRes.usage?.total_tokens || 0) + (zRes.usage?.total_tokens || 0)
    };

    const responseData: AxisLabelsResponse = {
      axisLabels: {
        x: {
          negative: axisLabels.x.negative,
          positive: axisLabels.x.positive,
          synthesizedNegative: xRes.negative,
          synthesizedPositive: xRes.positive
        },
        y: {
          negative: axisLabels.y.negative,
          positive: axisLabels.y.positive,
          synthesizedNegative: yRes.negative,
          synthesizedPositive: yRes.positive
        },
        z: {
          negative: axisLabels.z.negative,
          positive: axisLabels.z.positive,
          synthesizedNegative: zRes.negative,
          synthesizedPositive: zRes.positive
        }
      },
      usage: totalUsage
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Axis Labels API Error:", error);
    return NextResponse.json({ error: "Internal server error during axis label synthesis" }, { status: 500 });
  }
}

