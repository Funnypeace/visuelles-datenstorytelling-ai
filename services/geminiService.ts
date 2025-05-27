import { GoogleGenAI } from "@google/genai";
import type { ParsedData } from "../types";
import { GEMINI_MODEL_TEXT } from "../constants";

/** Wenn du die obige Aggregation schon in fileParserService hast, reicht das: */
export const askGeminiAboutData = async (
  parsedData: { month: string; region: string; revenue: number }[],
  fileName: string,
  question: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key ist nicht konfiguriert.");

  // === HIER kein Slice mehr: wir verwenden das volle, schon aggregierte Array ===
  const aggregated = parsedData;

  // Konkreter Prompt: Prozent-Rückgang zwischen Feb und März berechnen
  const prompt = `
Du bist ein professioneller Datenanalyst. Du bekommst ein Array mit Objekten:
  - month: "YYYY-MM"
  - region: Region (String)
  - revenue: Umsatz (Zahl)

**Aufgabe:** Berechne für jede Region den prozentualen Umsatzunterschied zwischen Februar 2025 ("2025-02") und März 2025 ("2025-03") und gib nur die Region mit dem stärksten Rückgang aus – inkl. Prozentzahl.

Datei: ${fileName}

Daten (Monat×Region):
\`\`\`json
${JSON.stringify(aggregated, null, 2)}
\`\`\`

Frage: ${question}
`;

  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL_TEXT,
    contents: prompt,
    config: {
      responseMimeType: "text/plain",
      temperature: 0.3,
      topP: 0.9,
      topK: 32,
    },
  });

  // Eventuelle ```-Fences entfernen
  let text = res.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[\w]*\s*/, "").replace(/```$/, "").trim();
  }
  return text;
};
