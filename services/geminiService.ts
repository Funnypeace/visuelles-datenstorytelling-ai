// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import type {
  ParsedData,
  AnalysisResult,
  GeminiAnalysisResponseSchema,
} from "../types";
import { GEMINI_MODEL_TEXT } from "../constants";

/** Hilfsfunktion: aggregiert Datum/Region auf Monats-Umsatz */
function aggregateByMonthAndRegion(data: ParsedData): {
  month: string;
  region: string;
  revenue: number;
}[] {
  const map: Record<string, { month: string; region: string; revenue: number }> = {};

  data.forEach((row) => {
    // Je nach Spalten-Name anpassen, hier: Datum, Region, Umsatz
    const rawDate = String(row["Datum"] ?? row["date"] ?? "");
    const month = rawDate.slice(0, 7); // "YYYY-MM"
    const region = String(row["Region"] ?? row["region"] ?? "");
    const revenue = Number(row["Umsatz"] ?? row["revenue"] ?? 0);

    const key = `${month}|${region}`;
    if (!map[key]) {
      map[key] = { month, region, revenue: 0 };
    }
    map[key].revenue += revenue;
  });

  return Object.values(map);
}

/**
 * Originale Analyse-Funktion bleibt unverändert,
 * wenn Du hier gar nichts ändern willst, kannst Du sie so belassen.
 */
export const analyzeDataWithGemini = async (
  data: ParsedData[],
  fileName: string,
  modelName?: string
): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key ist nicht konfiguriert.");

  const ai = new GoogleGenAI({ apiKey });
  // Behält hier das Sampling wie gehabt bei
  const sample = data.slice(0, 20);
  const headers = data.length ? Object.keys(data[0]) : [];
  const prompt = `...`; // Dein bestehender Prompt-Builder

  const res = await ai.models.generateContent({
    model: modelName || GEMINI_MODEL_TEXT,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.3 },
  });
  // … Rest deiner parse-/Fehler‐Logik …
};

/**
 * Angepasste Chat-Funktion: liefert reinen Text und
 * berechnet intern den prozentualen Rückgang von Feb→März.
 */
export const askGeminiAboutData = async (
  parsedData: ParsedData[],
  fileName: string,
  question: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key ist nicht konfiguriert.");

  // 1) Komplettes Dataset aggregieren (Monat×Region)
  const aggregated = aggregateByMonthAndRegion(parsedData);

  // 2) Prompt so formulieren, dass Gemini selbst rechnet
  const prompt = `
Du bist ein professioneller Datenanalyst. Du bekommst ein Array von Objekten mit genau diesen drei Feldern:
- month: "YYYY-MM"
- region: Name der Region
- revenue: Umsatz (Zahl)

**Aufgabe:** Berechne für jede Region den **prozentualen Umsatzunterschied** zwischen Februar 2025 ("2025-02") und März 2025 ("2025-03") und gib **nur** die Region mit dem größten Rückgang aus, inklusive Prozentwert.

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

  let text = res.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[\w]*\s*/, "").replace(/```$/, "").trim();
  }
  return text;
};
