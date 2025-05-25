
import { GoogleGenAI } from "@google/genai";
import type { ParsedData, AnalysisResult, GeminiAnalysisResponseSchema } from '../types';
import { MAX_SAMPLE_ROWS_FOR_GEMINI, MAX_PROMPT_CHARS_ESTIMATE } from '../constants';

const constructGeminiPrompt = (dataSample: ParsedData, fullDataHeaders: string[], fileName: string): string => {
  const sampleDataString = JSON.stringify(dataSample, null, 2);
  
  // Truncate sampleDataString if it's too long, to keep the overall prompt manageable
  let truncatedSampleDataString = sampleDataString;
  if (sampleDataString.length > MAX_PROMPT_CHARS_ESTIMATE * 0.5) { // Reserve space for other parts of prompt
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
  "summaryText": "Eine prägnante Zusammenfassung der wichtigsten Erkenntnisse, Trends und Ausreißer in 2-4 Sätzen. Beispiel: 'Die Verkaufszahlen sind im März um 18 % gestiegen, vor allem in Region Nord. Zwei Ausreißer: Ein starker Rückgang am 13.2. und ein Peak am 24.3.'",
  "keyInsights": [
    "Ein Array von 3-5 prägnanten Bullet Points (Strings), die spezifische Trends, Ausreißer oder Korrelationen hervorheben."
  ],
  "chartSuggestions": [
    {
      "type": "LineChart | BarChart | PieChart | ScatterChart",
      "title": "Ein aussagekräftiger Titel für das Diagramm (String)",
      "dataKeys": {
        "x": "NameDerXAchsenSpalteAUS_DEN_OBEN_GENANNTEN_Spaltenüberschriften",
        "y": "NameDerYAchsenSpalteAUS_DEN_OBEN_GENANNTEN_SpaltenüberschriftenODERArrayVonSpaltennamen",
        "name": "NameDerKategorieSpalteFuerKreisdiagramm AUS_DEN_OBEN_GENANNTEN_Spaltenüberschriften",
        "value": "NameDerWertSpalteFuerKreisdiagramm AUS_DEN_OBEN_GENANNTEN_Spaltenüberschriften",
        "z": "Optionale_NameDerZDimensionSpalteFuerScatterplot AUS_DEN_OBEN_GENANNTEN_Spaltenüberschriften"
      },
      "description": "Eine kurze Beschreibung (String), warum dieses Diagramm relevant ist und was es zeigt."
    }
  ],
  "actionableRecommendations": [
    "Ein Array von 2-3 konkreten, handlungsorientierten Empfehlungen (Strings) basierend auf der Analyse. Beispiel: 'Überprüfe Marketingaktionen im Februar.'"
  ],
  "visualizationThemeSuggestion": {
    "description": "Ein kurzer Vorschlag (String) für ein spezifisches Visualisierungsdesign oder Thema. Beispiel: 'Visualisiere Wachstum mit einer dynamischen Balkengrafik im Frühlingsdesign.'",
    "suggestedChartTypeForTheme": "BarChart"
  }
}

Wichtige Hinweise für deine Analyse:
- Identifiziere die wichtigsten Trends (z.B. Wachstum, Rückgang, Saisonalität).
- Finde signifikante Ausreißer und versuche, mögliche Gründe zu nennen (wenn aus den Daten ersichtlich).
- Suche nach Korrelationen zwischen verschiedenen Spalten.
- Achte darauf, dass die \`dataKeys\` exakt mit den Spaltenüberschriften der Originaldaten übereinstimmen (siehe 'Die Spaltenüberschriften der vollständigen Daten sind: ...' oben).
- Verwende für \`dataKeys.y\` einen einzelnen Spaltennamen (String) für eine einzelne Datenreihe oder ein Array von Spaltennamen (z.B. ["UmsatzProduktA", "UmsatzProduktB"]) für mehrere Datenreihen in Linien- oder Balkendiagrammen.
- Für \`PieChart\` verwende \`dataKeys.name\` für die Kategorienbezeichnung und \`dataKeys.value\` für den numerischen Wert.
- Für \`ScatterChart\` verwende \`dataKeys.x\` und \`dataKeys.y\`. \`dataKeys.z\` ist optional für eine dritte Dimension (z.B. Blasengröße).
- Stelle sicher, dass die gesamte Ausgabe ein valides JSON-Objekt ist, das der oben definierten Struktur entspricht. Gib keinen Text vor oder nach dem JSON-Objekt aus.
- Erstelle 2 bis 3 unterschiedliche \`chartSuggestions\`.
- Wenn Spalten Datumsangaben enthalten, erwäge Zeitreihendiagramme (LineChart).
- Wenn kategoriale Daten und numerische Werte vorhanden sind, erwäge BarCharts oder PieCharts.
- Für die Beziehung zwischen zwei numerischen Variablen ist ein ScatterChart geeignet.
`;
};

export const analyzeDataWithGemini = async (
  data: ParsedData,
  fileName: string,
  modelName: string
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key ist nicht konfiguriert.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const dataSample = data.slice(0, MAX_SAMPLE_ROWS_FOR_GEMINI);
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  
  const prompt = constructGeminiPrompt(dataSample, headers, fileName);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3, // Lower temperature for more factual/structured output
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
    
    // Basic validation of the parsed structure
    if (!parsedResponse.summaryText || !parsedResponse.keyInsights || !parsedResponse.chartSuggestions || !parsedResponse.actionableRecommendations || !parsedResponse.visualizationThemeSuggestion) {
        throw new Error("Die Antwort der KI hat eine unerwartete Struktur. Einige Felder fehlen.");
    }
    if (!Array.isArray(parsedResponse.keyInsights) || !Array.isArray(parsedResponse.chartSuggestions) || !Array.isArray(parsedResponse.actionableRecommendations)) {
        throw new Error("Die Antwort der KI hat eine unerwartete Struktur. Einige Array-Felder sind keine Arrays.");
    }

    return parsedResponse;

  } catch (error: any) {
    console.error("Fehler bei der Gemini API-Anfrage:", error);
    let userMessage = "Fehler bei der Kommunikation mit der KI. ";
    if (error.message) {
        userMessage += error.message;
    }
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
