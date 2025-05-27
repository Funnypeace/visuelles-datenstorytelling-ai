import { GoogleGenAI } from "@google/genai"; // <--- GANZ OBEN! (Stelle sicher, dass das Paket installiert ist)
import type { ParsedData, AnalysisResult, GeminiAnalysisResponseSchema } from '../types';
import { MAX_SAMPLE_ROWS_FOR_GEMINI, MAX_PROMPT_CHARS_ESTIMATE } from '../constants';

// Hilfsfunktion zum Prompt-Bau
const constructGeminiPrompt = (dataSample: ParsedData, fullDataHeaders: string[], fileName: string): string => {
  const sampleDataString = JSON.stringify(dataSample, null, 2);
  let truncatedSampleDataString = sampleDataString;
  if (sampleDataString.length > MAX_PROMPT_CHARS_ESTIMATE * 0.5) {
    truncatedSampleDataString = sampleDataString.substring(0, Math.floor(MAX_PROMPT_CHARS_ESTIMATE * 0.5)) + "\n... (Daten gekürzt)\n```";
  }
  return `
Du bist ein KI-Datenanalyst und Storytelling-Experte. Deine Aufgabe ist es, aus den bereitgestellten Daten (im JSON-Format) ein umfassendes Verständnis zu entwickeln und eine visuelle Datenstory zu erstellen.

Die bereitgestellten Daten stammen aus der Datei '${fileName}'.
Die Spaltenüberschriften der vollständigen Daten sind: ${fullDataHeaders.join(', ')}.
Hier sind die ersten ${dataSample.length} Zeilen der Daten (oder ein repräsentativer Auszug):
\`\`\`json
${truncatedSampleDataString}
\`\`\`

Bitte analysiere diese Daten und gib eine JSON-Antwort mit der exakten folgenden Struktur zurück. Ändere keine Schlüsselnamen und stelle sicher, dass alle Werte Strings oder Arrays von Strings/Objekten gemäß der Struktur sind:

{
  "summaryText": "...",
  "keyInsights": ["..."],
  "chartSuggestions": [
    {
      "type": "LineChart | BarChart | PieChart | ScatterChart",
      "title": "...",
      "dataKeys": {
        "x": "...",
        "y": "...",
        "name": "...",
        "value": "...",
        "z": "..."
      },
      "description": "..."
    }
  ],
  "actionableRecommendations": ["..."],
  "visualizationThemeSuggestion": {
    "description": "...",
    "suggestedChartTypeForTheme": "BarChart"
  }
}

Wichtige Hinweise für deine Analyse:
- Identifiziere die wichtigsten Trends (z.B. Wachstum, Rückgang, Saisonalität).
- Finde signifikante Ausreißer und versuche, mögliche Gründe zu nennen (wenn aus den Daten ersichtlich).
- Suche nach Korrelationen zwischen verschiedenen Spalten.
- Achte darauf, dass die \`dataKeys\` exakt mit den Spaltenüberschriften der Originaldaten übereinstimmen.
- ...
`;
};

// --- Datenanalyse-Funktion ---
export const analyzeDataWithGemini = async (
  data: ParsedData,
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error("Gemini API Key ist nicht konfiguriert.");
  }
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const dataSample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const prompt = constructGeminiPrompt(dataSample, headers, fileName);

  try {
    const response = await ai.models.generateContent({
      model: modelName || "gemini-1.0-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
        topP: 0.9,
        topK: 32,
      },
    });

    let jsonStr = response.text.trim();
    // Remove markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    const parsedResponse = JSON.parse(jsonStr) as GeminiAnalysisResponseSchema;

    // Basic validation
    if (!parsedResponse.summaryText || !parsedResponse.keyInsights || !parsedResponse.chartSuggestions || !parsedResponse.actionableRecommendations || !parsedResponse.visualizationThemeSuggestion) {
      throw new Error("Die Antwort der KI hat eine unerwartete Struktur. Einige Felder fehlen.");
    }
    if (!Array.isArray(parsedResponse.keyInsights) || !Array.isArray(parsedResponse.chartSuggestions) || !Array.isArray(parsedResponse.actionableRecommendations)) {
      throw new Error("Die Antwort der KI hat eine unerwartete Struktur. Einige Array-Felder sind keine Arrays.");
    }
    return parsedResponse;

  } catch (error: any) {
    let userMessage = "Fehler bei der Kommunikation mit der KI. ";
    if (error.message) userMessage += error.message;
    if (error.toString().includes("API key not valid")) {
      userMessage = "Ungültiger Gemini API Key. Bitte überprüfen Sie Ihre Konfiguration.";
    } else if (error.toString().toLowerCase().includes("quota")) {
      userMessage = "Das API-Kontingent wurde überschritten. Bitte versuchen Sie es später erneut oder überprüfen Sie Ihr Google Cloud-Kontingent.";
    } else if (error instanceof SyntaxError) {
      userMessage = "Fehler beim Verarbeiten der KI-Antwort (ungültiges JSON). Die KI hat möglicherweise nicht im erwarteten Format geantwortet.";
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
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const dataSample = Array.isArray(parsedData) ? parsedData.slice(0, 10) : parsedData;
  const headers = Array.isArray(parsedData) && parsedData.length > 0 ? Object.keys(parsedData[0]) : [];

  const prompt = `
Du bist ein professioneller Datenanalyst. Antworte **ausschließlich** auf Basis der folgenden Tabellendaten (${fileName}):
Spalten: ${headers.join(', ')}
Datenauszug (maximal 10 Zeilen):
${JSON.stringify(dataSample, null, 2)}

Frage des Nutzers:
${question}

Antworte prägnant und beziehe dich ausschließlich auf diese Tabelle. Wenn du die Antwort nicht sicher weißt, sage ehrlich, dass die Daten dafür nicht ausreichen.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.0-pro",
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
