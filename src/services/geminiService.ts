import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export interface SunoInputs {
  lyrics: string;
  globalStyle: string;
  vocalProcessing: string;
  atmospherics: string;
  instrumental: string;
}

export interface OptimizedPrompts {
  stylePrompt: string;
  scriptPrompt: string;
}

const SYSTEM_PROMPT = `You are a World-Class Audio Mixing Engineer and Suno AI Prompt Expert. 
Your goal is to transform basic user notes into a highly technical, professional Suno v5.5 script.

DIRECTIONS:
1. STYLE PROMPT (Max 1000 chars): 
   - Expand the user's 'Global Style' into a detailed technical production prompt.
   - Use technical terms: 48kHz, Mastered, Wide Stereo Imaging, Analog Warmth, Mid-Side Processing.

2. SCRIPT PROMPT (Target ~4900-5000 chars):
   - You MUST expand the script to reach approximately 5000 characters.
   - Structure using tags: [Intro], [Verse], [Chorus], [Bridge], [Outro], [Instrumental Break], [Vocal FX].
   - If you need more length, add detailed "Production Notes" [Production Note: ...] explaining EQ, compression, and panning for that section.
   - Maintain the original lyrics but technicalize the structure.

OUTPUT FORMAT:
Print the sections clearly separated:
---STYLE---
(content here)
---SCRIPT---
(content here)`;

export async function* optimizeSunoPromptStream(inputs: SunoInputs): AsyncGenerator<string> {
  try {
    const response = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error en el servidor");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No se pudo conectar con el stream de datos.");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value);
    }
  } catch (error: any) {
    console.error("Client API Error:", error);
    throw error;
  }
}

export async function optimizeSunoPrompt(inputs: SunoInputs): Promise<OptimizedPrompts> {
  let fullText = "";
  const generator = optimizeSunoPromptStream(inputs);
  for await (const chunk of generator) {
    fullText += chunk;
  }

  const styleMatch = fullText.match(/---STYLE---([\s\S]*?)---SCRIPT---/i);
  const scriptMatch = fullText.match(/---SCRIPT---([\s\S]*)/i);

  return {
    stylePrompt: styleMatch ? styleMatch[1].trim() : "Error en parseo de estilo",
    scriptPrompt: scriptMatch ? scriptMatch[1].trim() : fullText.trim()
  };
}
