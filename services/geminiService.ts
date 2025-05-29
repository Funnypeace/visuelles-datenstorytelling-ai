// services/geminiService.ts
import { GoogleGenAI } from '@google/genai';
import type {
  ParsedData,
  AnalysisResult,
  GeminiAnalysisResponseSchema,
} from '../types';
import {
  MAX_SAMPLE_ROWS_FOR_GEMINI,
  GEMINI_MODEL_TEXT,
} from '../constants';

/**
 * Führt die Hauptanalyse durch und liefert
 * ein konsistentes JSON-Schema inkl. chartSuggestions
 */
export const analyzeDataWithGemini = async (
  data: ParsedData[],
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key ist nicht konfiguriert.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const sample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = sample.length ? Object.keys(sample[0]) : [];

  const prompt = `
Du bist ein KI-Datenanalyst und Storytelling-Experte.
Gib **ausschließlich** folgendes JSON zurück (keine Klartext-Antwort):

\`\`\`json
{
  "summaryText": "Kurze Zusammenfassung der Analyse",
  "keyInsights": ["Insight 1", "Insight 2"],
  "chartSuggestions": [
    {
      "type": "LineChart" | "BarChart" | "PieChart" | "ScatterChart",
      "title": "Diagrammtitel",
      "dataKeys": { x?: string; y?: string | string[]; name?: string; value?: string; z?: string },
      "description": "Kurzbeschreibung"
    }
  ],
  "actionableRecommendations": ["Empfehlung 1", "Empfehlung 2"],
  "visualizationThemeSuggestion": {
    "description": "z. B. Pastelltöne verwenden",
    "suggestedChartTypeForTheme": "BarChart"
  }
}
\`\`\`

Datei: "${fileName}"
Spalten: ${headers.join(', ')}

Daten (Beispiel, ggf. gekürzt):
\`\`\`json
${JSON.stringify(sample, null, 2)}
\`\`\`
`;

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
  // Entferne ggf. Codefences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(text) as GeminiAnalysisResponseSchema;
  // Schema-Validierung
  if (
    typeof parsed.summaryText !== 'string' ||
    !Array.isArray(parsed.keyInsights) ||
    !Array.isArray(parsed.chartSuggestions) ||
    !Array.isArray(parsed.actionableRecommendations) ||
    typeof parsed.visualizationThemeSuggestion !== 'object'
  ) {
    throw new Error('Antwort der KI entspricht nicht dem erwarteten JSON-Schema.');
  }

  return parsed;
};

/**
 * Chat-Funktion: Berechnet auf den pivotierten Daten
 * den prozentualen Rückgang von Feb 2025 zu Mär 2025
 */
export const askGeminiAboutData = async (
  pivotData: ParsedData[],
  fileName: string,
  question: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key ist nicht konfiguriert.');
  }

  const prompt = `
Du bist ein professioneller Datenanalyst. Du bekommst ein Array von Objekten:
- month: "YYYY-MM"
- region: String
- revenue: Zahl

**Aufgabe:** Berechne für jede Region den prozentualen Umsatzunterschied zwischen Februar 2025 ("2025-02") und März 2025 ("2025-03").  
Gib **nur** die Region mit dem stärksten Rückgang aus – inkl. Prozentzahl.

Datei: "${fileName}"

Daten:
\`\`\`json
${JSON.stringify(pivotData, null, 2)}
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

  let answer = res.text.trim();
  if (answer.startsWith('```')) {
    answer = answer.replace(/^```[\s\S]*?```/, '').trim();
  }
  return answer;
};
