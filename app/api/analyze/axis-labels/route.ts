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

Your task is to identify two distinct, opposite keywords or short phrases (n-grams) that represent the two poles of a semantic dimension based on the provided evidence. Also provide a concise axis name that describes the overall dimension or spectrum, not just one pole.

RULES:
1. OUTPUT JSON ONLY.
2. For each dimension, generate exactly two contrasting keywords or short phrases (max 3 words each).
3. Also generate one short axis name (max 5 words) that summarizes the overall spectrum.
4. The keywords must be derived from the specific concepts, keywords, and evidence sentences provided for each end of the axis.
5. The two keywords should define a coherent "spectrum of variation" or "thematic tension."
6. Compare and contrast the "Negative End" context with the "Positive End" context to find the most meaningful conceptual difference.
7. Use professional, architectural, and conceptually meaningful language.
8. DO NOT just repeat the input concept titles if a more descriptive keyword pair can be found in the evidence.
9. The axis name should describe the dimension as a whole (e.g., "Formal vs Playful Tone" -> "Tone Formality"), not restate a single pole.`;

    // Build prompts for each axis
    const synthesizeAxis = async (
      axisIdx: string, 
      negative: string, 
      positive: string, 
      negContext: { keywords: string[], sentences: string[] },
      posContext: { keywords: string[], sentences: string[] },
      modelName: string
    ): Promise<{ negative: string; positive: string; name?: string; usage: any }> => {
      const userPrompt = `Axis ${axisIdx} represents a spectrum of variation.

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
  "positive_keyword": "Keyword for positive end",
  "axis_name": "Name describing the overall dimension/spectrum"
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
        name: result.axis_name || `${negative} vs ${positive}`,
        usage: data.usage
      };
    };

    // Synthesize all axes in parallel
    const axisKeys = Object.keys(axisLabels);
    const results = await Promise.all(
      axisKeys.map(key => 
        synthesizeAxis(
          key, 
          axisLabels[key].negative, 
          axisLabels[key].positive, 
          axisLabels[key].negativeContext, 
          axisLabels[key].positiveContext, 
          model
        )
      )
    );

    const totalUsage = results.reduce((acc, res) => ({
      prompt_tokens: acc.prompt_tokens + (res.usage?.prompt_tokens || 0),
      completion_tokens: acc.completion_tokens + (res.usage?.completion_tokens || 0),
      total_tokens: acc.total_tokens + (res.usage?.total_tokens || 0)
    }), { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });

    const responseAxisLabels: Record<string, any> = {};
    axisKeys.forEach((key, i) => {
      responseAxisLabels[key] = {
        negative: axisLabels[key].negative,
        positive: axisLabels[key].positive,
        synthesizedNegative: results[i].negative,
        synthesizedPositive: results[i].positive,
        name: axisLabels[key].name || results[i].name,
        synthesizedName: results[i].name
      };
    });

    const responseData: AxisLabelsResponse = {
      axisLabels: responseAxisLabels as any,
      usage: totalUsage
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Axis Labels API Error:", error);
    return NextResponse.json({ error: "Internal server error during axis label synthesis" }, { status: 500 });
  }
}
