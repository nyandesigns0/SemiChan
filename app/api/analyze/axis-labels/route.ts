import { NextRequest, NextResponse } from "next/server";
import type { AxisLabelsRequest, AxisLabelsResponse } from "@/types/api";
import type { AnalysisResult } from "@/types/analysis";

import { DEFAULT_MODEL } from "@/constants/nlp-constants";
import { loadPrompts, processPrompt } from "@/lib/prompts/prompt-processor";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type AxisLabelsPayload = AxisLabelsRequest & {
  analysis?: AnalysisResult;
  corpus_domain?: string;
  style_preset?: string;
};

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as AxisLabelsPayload;
    const { axisLabels, model = DEFAULT_MODEL } = body;
    const analysis = body.analysis;
    const corpusDomain = body.corpus_domain ?? "architecture jury comments";
    const stylePreset = body.style_preset ?? "jury-facing, rigorous, concise";

    const prompts = await loadPrompts();
    const axisPrompts = prompts.axis;
    const varianceStats = analysis?.varianceStats;
    const totalVariance = varianceStats?.totalVariance ?? 0;

    // Build prompts for each axis
    const synthesizeAxis = async (
      axisIdx: string, 
      negative: string, 
      positive: string, 
      negContext: { keywords: string[], sentences: string[] },
      posContext: { keywords: string[], sentences: string[] },
      modelName: string
    ): Promise<{ negative: string; positive: string; name?: string; usage: any }> => {
      const axisIndex = Number.parseInt(axisIdx, 10);
      const explainedVariance = Number.isFinite(axisIndex)
        ? varianceStats?.explainedVariances?.[axisIndex]
        : undefined;
      const varianceRatio =
        typeof explainedVariance === "number" && totalVariance > 0
          ? explainedVariance / totalVariance
          : undefined;
      const negativeSentences = negContext.sentences.slice(0, 4);
      const positiveSentences = posContext.sentences.slice(0, 4);

      const variables = {
        AXIS_ID: axisIdx,
        AXIS_VARIANCE_PCT: { value: varianceRatio, format: "percentage", fallback: "N/A" },
        NEG_POLE_TITLE: negative,
        POS_POLE_TITLE: positive,
        NEG_POLE_KEYWORDS: { value: negContext.keywords, format: "list", fallback: "None" },
        POS_POLE_KEYWORDS: { value: posContext.keywords, format: "list", fallback: "None" },
        NEG_POLE_ANCHOR_SENTENCES: { value: negativeSentences, format: "lines", fallback: "None" },
        POS_POLE_ANCHOR_SENTENCES: { value: positiveSentences, format: "lines", fallback: "None" },
        NEG_TOP_CONCEPTS: { value: [], format: "list", fallback: "None" },
        POS_TOP_CONCEPTS: { value: [], format: "list", fallback: "None" },
        CORPUS_DOMAIN: corpusDomain,
        STYLE_PRESET: stylePreset
      };

      const systemPrompt = processPrompt(axisPrompts.system, variables);
      const userPrompt = processPrompt(axisPrompts.user, variables);

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
