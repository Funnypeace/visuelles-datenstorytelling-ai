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

// Hilfsfunktion zum Prompt-Bau
const constructGeminiPrompt = (
  dataSample: ParsedData,
  fullDataHeaders: string[],
  fileName: string
): string => {
  const sampleDataString = JSON.stringify(dataSample, null, 2);
  let truncatedSampleDataString = sampleDataString;

  if (sampleDataString.length > MAX_PROMPT_CHARS_ESTIMATE * 0.5) {
    truncatedSampleDataString =
      sampleDataString.substring(0, MAX_PROMPT_CHARS_ESTIMATE * 0.5) +
      "\n... (Daten gekürzt)";
  }

  return `
Du bist ein KI-Datenanalyst und Storytelling-Experte. Deine Aufgabe ist es, basierend auf den Tabellendaten eine aussagekräftige visuelle Datenstory zu entwickeln.

Datei: '${fileName}'
Spaltenüberschriften der vollständigen Daten: ${fullDataHeaders.join(", ")}

\`\`\`json
${truncatedSampleDataString}
\`\`\`

Wichtige Analyseschritte:
- Identifiziere zentrale Trends (Wachstum, Rückgang, Saisonalität)
- Suche nach Ausreißern und kommentiere mögliche Gründe
- Analysiere Korrelationen zwischen Spalten
- Gib am Ende ein kurzes Text-Summary, Key-Insights, Handlungsempfehlungen und eine Farbsuggestion für die Visualisierung
`;
};

// --- Datenanalyse-Funktion ---
export const analyzeDataWithGemini = async (
  data: ParsedData[],
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Gemini API Key ist nicht konfiguriert.");
  }
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  });

  const dataSample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const prompt = constructGeminiPrompt(dataSample, headers, fileName);

  try {
    const response = await ai.models.generateContent({
      model: modelName || GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
        topP: 0.9,
        topK: 32,
      },
    });

    // JSON-Fences entfernen
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedResponse = JSON.parse(
      jsonStr
    ) as GeminiAnalysisResponseSchema;

    // Grobe Validierung
    if (
      !parsedResponse.summaryText ||
      !parsedResponse.keyInsights ||
      !parsedResponse.actionableRecommendations ||
      !parsedResponse.visualizationThemeSuggestion
    ) {
      throw new Error(
        "Die Antwort der KI hat eine unerwartete Struktur."
      );
    }

    return parsedResponse;
  } catch (error: any) {
    let userMessage = "Fehler bei der Kommunikation mit der KI. ";
    if (error.message) userMessage += error.message;

    if (error.toString().includes("API key not valid")) {
      userMessage = "Ungültiger Gemini API Key. Bitte überprüfen.";
    } else if (error.toString().toLowerCase().includes("quota")) {
      userMessage =
        "API-Kontingent überschritten. Bitte später erneut versuchen.";
    } else if (error instanceof SyntaxError) {
      userMessage =
        "Fehler beim Verarbeiten der KI-Antwort. Format unerwartet.";
    }

    throw new Error(userMessage);
  }
};

// =========== KI-Chat-Funktion ===========
export const askGeminiAboutData = async (
  parsedData: ParsedData,
  fileName: string,
  question: string
): Promise<string> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Gemini API Key ist nicht konfiguriert.");
  }
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  });

  const dataSample = Array.isArray(parsedData)
    ? parsedData.slice(0, 10)
    : parsedData;
  const headers =
    Array.isArray(parsedData) && parsedData.length > 0
      ? Object.keys(parsedData[0])
      : [];

  const prompt = `
Du bist ein professioneller Datenanalyst. Antworte **ausschließlich** auf Basis der folgenden Tabellendaten (${fileName}):

\`\`\`json
${JSON.stringify(dataSample, null, 2)}
\`\`\`

Spaltenüberschriften: ${headers.join(", ")}

Frage des Nutzers:
${question}

Wenn die Daten nicht ausreichen, sage ehrlich, dass du nicht genug Informationen hast.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "text/plain",
        temperature: 0.3,
        topP: 0.9,
        topK: 32,
      },
    });

    let text = response.text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```[\w]*\s*/, "").replace(/```$/, "").trim();
    }
    return text;
  } catch (error: any) {
    let userMessage = "Fehler bei der KI-Antwort. ";
    if (error.message) userMessage += error.message;
    throw new Error(userMessage);
  }
};
