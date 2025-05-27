// services/geminiService.ts
import { GoogleGenAI } from '@google/genai';
import type {
  ParsedData,
  AnalysisResult,
  GeminiAnalysisResponseSchema,
} from '../types';
import {
  MAX_SAMPLE_ROWS_FOR_GEMINI,a// services/geminiService.ts
import { GoogleGenAI } from '@google/genai';
import type {
  ParsedData,
  AnalysisResult,
  GeminiAnalysisResponseSchema,
} from '../types';
import {
  MAX_SAMPLE_ROWS_FOR_GEMINI,
  MAX_PROMPT_CHARS_ESTIMATE,
  GEMINI_MODEL_TEXT,
} from '../constants';

/**
 * Hauptanalyse: JSON-Schema inkl. chartSuggestions
 */
export const analyzeDataWithGemini = async (
  data: ParsedData[],
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API Key ist nicht konfiguriert.');

  const ai = new GoogleGenAI({ apiKey });
  const sample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = sample.length ? Object.keys(sample[0]) : [];
  const prompt = `
Du bist ein KI-Datenanalyst und Storytelling-Experte. Liefere **ausschließlich** dieses JSON:

\`\`\`json
{
  "summaryText": "Kurze Zusammenfassung",
  "keyInsights": ["Insight 1", "Insight 2"],
  "chartSuggestions": [
    {
      "type": "LineChart"|"BarChart"|"PieChart"|"ScatterChart",
      "title": "Diagrammtitel",
      "dataKeys": { x?:string; y?:string|string[]; name?:string; value?:string; z?:string },
      "description": "Kurzbeschreibung"
    }
  ],
  "actionableRecommendations": ["Empfehlung 1", "Empfehlung 2"],
  "visualizationThemeSuggestion": {
    "description": "z. B. Pastellfarben",
    "suggestedChartTypeForTheme": "BarChart"
  }
}
\`\`\`

Datei: "${fileName}"
Spalten: ${headers.join(', ')}

Daten (Beispiel):
\`\`\`json
${JSON.stringify(sample, null, 2)}
\`\`\`
`;

  try {
    const res = await ai.models.generateContent({
      model: modelName || GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        topP: 0.9,
        topK: 32,
      },
    });

    let text = res.text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(text) as GeminiAnalysisResponseSchema;
    if (
      typeof parsed.summaryText !== 'string' ||
      !Array.isArray(parsed.keyInsights) ||
      !Array.isArray(parsed.chartSuggestions) ||
      !Array.isArray(parsed.actionableRecommendations) ||
      typeof parsed.visualizationThemeSuggestion !== 'object'
    ) {
      throw new Error('Das JSON-Schema stimmt nicht.');
    }
    return parsed;
  } catch (err: any) {
    let msg = 'Fehler bei der KI-Kommunikation.';
    if (err.message) msg += ' ' + err.message;
    if (err instanceof SyntaxError) msg = 'Ungültiges JSON von der KI.';
    throw new Error(msg);
  }
};

/**
 * Chat-Funktion: prozentualer Rückgang Feb→März auf Pivot-Daten
 */
export const askGeminiAboutData = async (
  parsedData: ParsedData[],
  fileName: string,
  question: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API Key ist nicht konfiguriert.');

  const aggregated = parsedData; // schon aggregiert auf Monat×Region

  const prompt = `
Du bist ein professioneller Datenanalyst. Du erhältst ein Array mit Objekten:
- month: "YYYY-MM"
- region: String
- revenue: Zahl

**Aufgabe:** Berechne für jede Region den Prozent-Differenz zwischen Februar 2025 ("2025-02") und März 2025 ("2025-03") und gib **nur** die Region mit dem stärksten Rückgang aus – inkl. Prozentzahl.

Datei: "${fileName}"

Daten:
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
      responseMimeType: 'text/plain',
      temperature: 0.3,
      topP: 0.9,
      topK: 32,
    },
  });

  let text = res.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[\w]*\s*/, '').replace(/```$/, '').trim();
  }
  return text;
};

  MAX_PROMPT_CHARS_ESTIMATE,
  GEMINI_MODEL_TEXT,
} from '../constants';

/**
 * Führt die Hauptanalyse durch und liefert
 * das vollständige JSON-Schema inkl. chartSuggestions.
 */
export const analyzeDataWithGemini = async (
  data: ParsedData[],
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API Key ist nicht konfiguriert.');

  const ai = new GoogleGenAI({ apiKey });
  const sample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = data.length ? Object.keys(data[0]) : [];
  const prompt = `
Du bist ein KI-Datenanalyst und Storytelling-Experte. Gib **ausschließlich** folgendes JSON zurück:

\`\`\`json
{
  "summaryText": "Kurze Zusammenfassung",
  "keyInsights": ["Insight 1", "Insight 2"],
  "chartSuggestions": [
    {
      "type": "LineChart"|"BarChart"|"PieChart"|"ScatterChart",
      "title": "Diagrammtitel",
      "dataKeys": { x?:string; y?:string|string[]; name?:string; value?:string; z?:string },
      "description": "Kurzbeschreibung"
    }
  ],
  "actionableRecommendations": ["Empfehlung 1", "Empfehlung 2"],
  "visualizationThemeSuggestion": {
    "description": "z. B. Pastellfarben verwenden",
    "suggestedChartTypeForTheme": "BarChart"
  }
}
\`\`\`

Datei: "${fileName}"
Spalten: ${headers.join(', ')}

Daten (Beispiel):
\`\`\`json
${JSON.stringify(sample, null, 2)}
\`\`\`
`;

  try {
    const res = await ai.models.generateContent({
      model: modelName || GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        topP: 0.9,
        topK: 32,
      },
    });

    let text = res.text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(text) as GeminiAnalysisResponseSchema;
    if (
      typeof parsed.summaryText !== 'string' ||
      !Array.isArray(parsed.keyInsights) ||
      !Array.isArray(parsed.chartSuggestions) ||
      !Array.isArray(parsed.actionableRecommendations) ||
      typeof parsed.visualizationThemeSuggestion !== 'object'
    ) {
      throw new Error('Antwort der KI hat nicht das erwartete JSON-Schema.');
    }
    return parsed;
  } catch (err: any) {
    let msg = 'Fehler bei der Kommunikation mit der KI.';
    if (err.message) msg += ' ' + err.message;
    if (err instanceof SyntaxError) {
      msg = 'Die KI-Antwort war kein gültiges JSON.';
    }
    throw new Error(msg);
  }
};

/**
 * Chat-Funktion: Berechnet prozentualen Rückgang Feb→März
 * auf den bereits aggregierten Monat×Region-Daten.
 */
export const askGeminiAboutData = async (
  parsedData: ParsedData[],
  fileName: string,
  question: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API Key ist nicht konfiguriert.');

  const aggregated = parsedData; // schon Monat×Region pivotiert

  const prompt = `
Du bist ein professioneller Datenanalyst. Du bekommst ein Array:
- month: "YYYY-MM"
- region: String
- revenue: Zahl

Aufgabe: Berechne für jede Region den Prozent-Unterschied zwischen Februar 2025 ("2025-02") und März 2025 ("2025-03") und gib **nur** die Region mit dem stärksten Rückgang aus – inkl. Prozentzahl.

Datei: "${fileName}"

Daten:
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
      responseMimeType: 'text/plain',
      temperature: 0.3,
      topP: 0.9,
      topK: 32,
    },
  });

  let text = res.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[\w]*\s*/, '').replace(/```$/, '').trim();
  }
  return text;
};
