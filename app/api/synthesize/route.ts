import { NextRequest, NextResponse } from "next/server";
import type { ConceptBrief, SynthesisResponse } from "@/types/api";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const brief: ConceptBrief = await request.json();
    const { label_seed, top_ngrams, evidence_sentences, stance_mix } = brief;

    const systemPrompt = `You are an expert architectural critic and theorist. 
Your task is to synthesize juror feedback into a professional architectural concept.

RULES:
1. OUTPUT JSON ONLY.
2. DO NOT ECHO input phrases exactly.
3. Use abstractive synthesis (interpretive).
4. Title must be 6-12 words, professional architectural voice.
5. One-liner must be 18-30 words, synthesizing the core theme.
6. ABSOLUTELY NO boilerplate like "The keywords are..." or "Based on...".
7. REJECT repetition of words in the title.`;

    const userPrompt = `Concept Seed: ${label_seed}
Top Keywords: ${top_ngrams.join(", ")}
Juror Evidence:
${evidence_sentences.map((s, i) => `${i + 1}. ${s}`).join("\n")}
Stance Distribution: Praise: ${Math.round(stance_mix.praise * 100)}%, Critique: ${Math.round(stance_mix.critique * 100)}%

Respond in this JSON format:
{
  "concept_title": "Professional Title Here",
  "concept_one_liner": "Synthesized description here"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // --- QUALITY GATES ---
    let finalTitle = result.concept_title;
    let finalOneLiner = result.concept_one_liner;
    let isFallback = false;

    // 1. Echo Check (Basic n-gram overlap)
    const isEchoing = evidence_sentences.some(sentence => {
      const sentenceLower = sentence.toLowerCase();
      return finalOneLiner.toLowerCase().includes(sentenceLower) || 
             sentenceLower.includes(finalOneLiner.toLowerCase());
    });

    // 2. Repetition Check in Title
    const titleWords = finalTitle.toLowerCase().split(/\s+/);
    const hasRepetition = new Set(titleWords).size !== titleWords.length;

    // 3. Boilerplate Check
    const hasBoilerplate = /keywords|based on|juror feedback/i.test(finalOneLiner.slice(0, 30));

    if (isEchoing || hasRepetition || hasBoilerplate) {
      console.warn("Synthesis failed quality gates, using fallback", { isEchoing, hasRepetition, hasBoilerplate });
      isFallback = true;
      finalTitle = label_seed;
      finalOneLiner = `Focus on ${label_seed.toLowerCase()} as reflected in juror feedback regarding ${top_ngrams.slice(0, 3).join(" and ")}.`;
    }

    const synthesis: SynthesisResponse = {
      concept_title: finalTitle,
      concept_one_liner: finalOneLiner,
      is_fallback: isFallback
    };

    return NextResponse.json(synthesis);

  } catch (error) {
    console.error("Synthesis API Error:", error);
    return NextResponse.json({ error: "Internal server error during synthesis" }, { status: 500 });
  }
}

