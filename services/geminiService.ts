// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import type {
  ParsedData,
  AnalysisResult,
  GeminiAnalysisResponseSchema,
} from "../types";
import {
  MAX_SAMPLE_ROWS_FOR_GEMINI,
  MAX_PROMPT_CHARS_ESTIMATE,
  GEMINI_MODEL_TEXT,
} from "../constants";

// --- Analyse-Funktion, wie vorher schon im Repo ---
export const analyzeDataWithGemini = async (
  data: ParsedData[],
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key ist nicht konfiguriert.");

  const ai = new GoogleGenAI({ apiKey });
  const sample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const prompt = `
Du bist ein KI-Datenanalyst und Storytelling-Experte. Deine Aufgabe ist es, **ausschließlich** ein gültiges JSON-Dokument auszugeben, **ohne** weitere Erklärungen im Klartext.
Gib exakt dieses Objekt zurück:

\`\`\`json
{
  "summaryText": "Kurze Zusammenfassung der Analyse",
  "keyInsights": ["Insight 1", "Insight 2"],
  "actionableRecommendations": ["Empfehlung 1", "Empfehlung 2"],
  "visualizationThemeSuggestion": "z.B. 'light' oder 'pastel'"
}
\`\`\`

Datei: "${fileName}"
Spaltenüberschriften: ${headers.join(", ")}

Daten (Beispiel):
\`\`\`json
${JSON.stringify(sample, null, 2)}
\`\`\`

Analyse-Fokus:
1. Zentrale Trends (Wachstum, Rückgang, Saisonalität)
2. Ausreißer und mögliche Ursachen
3. Korrelationen zwischen Spalten
`;

  try {
    const res = await ai.models.generateContent({
      model: modelName || GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
        topP: 0.9,
        topK: 32,
      },
    });

    let text = res.text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(text) as GeminiAnalysisResponseSchema;
    if (
      !parsed.summaryText ||
      !Array.isArray(parsed.keyInsights) ||
      !Array.isArray(parsed.actionableRecommendations) ||
      !parsed.visualizationThemeSuggestion
    ) {
      throw new Error("Antwort der KI hat nicht das erwartete JSON-Schema.");
    }
    return parsed;
  } catch (err: any) {
    let msg = "Fehler bei der Kommunikation mit der KI.";
    if (err.message) msg += " " + err.message;
    if (err instanceof SyntaxError) {
      msg = "Die KI-Antwort war kein gültiges JSON.";
    }
    throw new Error(msg);
  }
};

// --- Chat-Funktion mit prozentualem Rückgang ---
/**
 * ParsedData[] hier ist schon das aggregierte Month×Region-Array,
 * wenn du fileParserService.ts wie vorgeschlagen angepasst hast.
 */
export const askGeminiAboutData = async (
  parsedData: { month: string; region: string; revenue: number }[],
  fileName: string,
  question: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key ist nicht konfiguriert.");

  const aggregated = parsedData;

  const prompt = `
Du bist ein professioneller Datenanalyst. Du bekommst ein Array von Objekten mit Feldern:
- month: "YYYY-MM"
- region: Region (String)
- revenue: Umsatz (Zahl)

Aufgabe: Berechne für jede Region den prozentualen Umsatzunterschied zwischen Februar 2025 ("2025-02") und März 2025 ("2025-03")
und gib **nur** die Region mit dem stärksten Rückgang aus – inkl. Prozentzahl.

Datei: "${fileName}"

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

  let text = res.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[\w]*\s*/, "").replace(/```$/, "").trim();
  }
  return text;
};
