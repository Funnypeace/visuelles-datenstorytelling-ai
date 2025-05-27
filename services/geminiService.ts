// --- HIER ANPASSEN ---
// In analyzeDataWithGemini:
export const analyzeDataWithGemini = async (
  data: ParsedData,
  fileName: string,
  modelName?: string   // modelName jetzt optional!
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
      model: modelName || "gemini-1.0-pro",  // <-- Standardmodell gesetzt!
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
        topP: 0.9,
        topK: 32,
      },
    });
    // ... (Rest bleibt gleich)
    let jsonStr = response.text.trim();
    // Remove markdown fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedResponse = JSON.parse(jsonStr) as GeminiAnalysisResponseSchema;
    // ... Validierung wie gehabt ...
    return parsedResponse;

  } catch (error: any) {
    // ... Fehlerbehandlung wie gehabt ...
    throw new Error(userMessage);
  }
};

// =========== NEU: KI-Chat-Funktion ===========

export const askGeminiAboutData = async (
  parsedData: ParsedData,
  fileName: string,
  question: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key ist nicht konfiguriert.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      model: "gemini-1.0-pro",  // <-- HIER AUCH ANPASSEN!
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
