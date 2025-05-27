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

/**
 * Baut den Prompt so auf, dass Gemini *ausschließlich* JSON ausgibt
 * und zwar exakt nach folgendem Schema:
 * {
 *   "summaryText": string,
 *   "keyInsights": string[],
 *   "actionableRecommendations": string[],
 *   "visualizationThemeSuggestion": string
 * }
 */
const constructGeminiPrompt = (
  dataSample: ParsedData[],
  fullDataHeaders: string[],
  fileName: string
): string => {
  const sampleString = JSON.stringify(dataSample, null, 2);
  const maxLen = MAX_PROMPT_CHARS_ESTIMATE * 0.5;
  const truncated =
    sampleString.length > maxLen
      ? sampleString.slice(0, maxLen) + "\n... (gekürzt)"
      : sampleString;

  return `
Du bist ein KI-Datenanalyst und Storytelling-Experte. Deine Aufgabe ist es, **ausschließlich** ein gültiges JSON-Dokument auszugeben, **ohne** weitere Erklärungen oder Klartext.  
Gib exakt dieses Objekt zurück:

\`\`\`json
{
  "summaryText": "Kurze Zusammenfassung der Analyse",
  "keyInsights": ["Insight 1", "Insight 2", "..."],
  "actionableRecommendations": ["Empfehlung 1", "Empfehlung 2", "..."],
  "visualizationThemeSuggestion": "z.B. 'dark', 'light', 'pastel', ..."
}
\`\`\`

**Datei:** \`${fileName}\`  
**Spaltenüberschriften:** ${fullDataHeaders.join(", ")}

**Daten (Beispiel, ggf. gekürzt):**
\`\`\`json
${truncated}
\`\`\`

**Analyse-Fokus:**
1. Zentrale Trends (Wachstum, Rückgang, Saisonalität)  
2. Ausreißer und mögliche Ursachen  
3. Korrelationen zwischen Spalten  

Fülle die Felder **summaryText**, **keyInsights**, **actionableRecommendations** und **visualizationThemeSuggestion** sorgfältig aus.
`;
};

export const analyzeDataWithGemini = async (
  data: ParsedData[],
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key ist nicht konfiguriert.");

  const ai = new GoogleGenAI({ apiKey });
  const sample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = data.length ? Object.keys(data[0]) : [];
  const prompt = constructGeminiPrompt(sample, headers, fileName);

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

    // Entferne JSON-Fences, falls vorhanden
    let text = res.text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(text) as GeminiAnalysisResponseSchema;
    // Validieren
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
    let msg = "Fehler bei der Kommunikation mit der KI. ";
    if (err.message) msg += err.message;
    if (err instanceof SyntaxError) {
      msg = "Die KI-Antwort war kein gültiges JSON.";
    }
    throw new Error(msg);
  }
};

/**
 * Einfache Chat-Funktion, um fragen zu stellen. Liefert reinen Text zurück.
 */
export const askGeminiAboutData = async (
  parsedData: ParsedData[],
  fileName: string,
  question: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key ist nicht konfiguriert.");

  const ai = new GoogleGenAI({ apiKey });
  const sample = parsedData.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = sample.length ? Object.keys(sample[0]) : [];

  const prompt = `
Du bist ein professioneller Datenanalyst. Antworte **ausschließlich** auf Basis der folgenden Tabellendaten (${fileName}):

\`\`\`json
${JSON.stringify(sample, null, 2)}
\`\`\`

Spaltenüberschriften: ${headers.join(", ")}

Frage des Nutzers:
${question}

Wenn die Daten nicht ausreichen, sage ehrlich, dass du nicht genug Informationen hast.
`;

  try {
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
  } catch (err: any) {
    let msg = "Fehler bei der KI-Antwort. ";
    if (err.message) msg += err.message;
    throw new Error(msg);
  }
};
