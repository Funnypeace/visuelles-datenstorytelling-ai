import React, { useState, useEffect } from 'react';
import { getPdfChatById, updatePdfChatHistory, ChatQA } from '../services/pdfChatService';
import { GoogleGenAI } from "@google/genai";

interface PdfChatProps {
  chatId: string;
  apiKey: string; // dein Gemini Key aus den ENV-Variablen
}

export const PdfChat: React.FC<PdfChatProps> = ({ chatId, apiKey }) => {
  const [chat, setChat] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lade Chat und PDF-Inhalt
  useEffect(() => {
    (async () => {
      const data = await getPdfChatById(chatId);
      setChat(data);
    })();
  }, [chatId]);

  const askGemini = async (question: string) => {
    if (!chat || !apiKey) return;
    setLoading(true);
    setError(null);

    try {
      const history = chat.chat_history || [];
      const lastQA = history.slice(-4); // max. 4 vorherige QA
      const contextQAs = lastQA.map(q => `Nutzer: ${q.content}\nKI: ${q.role === "assistant" ? q.content : ""}`).join('\n');

      // Prompt bauen: Nur die gewählte Seite!
      const pdfText = chat.pages_text[selectedPage - 1] || "";
      const prompt = `
Hier ist der Text von Seite ${selectedPage} des PDFs:

${pdfText}

${contextQAs ? `Bisheriger Chat:\n${contextQAs}` : ''}

Neue Nutzerfrage: ${question}

Antworte bitte nur auf Basis von Seite ${selectedPage} und dem bisherigen Chat.`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // oder dein Modell aus ENV
        contents: prompt,
        config: {
          responseMimeType: "text/plain",
          temperature: 0.4,
        },
      });

      const answer = response.text.trim();

      // Chatverlauf updaten (max 5 Einträge)
      const updatedHistory: ChatQA[] = [
        ...(history || []),
        { role: "user", content: question, page: selectedPage },
        { role: "assistant", content: answer, page: selectedPage },
      ].slice(-10); // max 5 Q&A

      await updatePdfChatHistory(chat.id, updatedHistory);
      setChat({ ...chat, chat_history: updatedHistory });
      setInput('');
    } catch (e: any) {
      setError(e.message ?? "Fehler bei KI-Antwort");
    }
    setLoading(false);
  };

  if (!chat) return <div>Lade PDF-Chat…</div>;

  return (
    <div className="max-w-2xl mx-auto mt-6 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-2">{chat.filename}</h2>
      <label className="block mb-2 font-semibold">Seite auswählen:</label>
      <select
        value={selectedPage}
        onChange={e => setSelectedPage(Number(e.target.value))}
        className="mb-4 border rounded p-2"
      >
        {chat.pages_text.map((_, i) => (
          <option key={i} value={i + 1}>Seite {i + 1}</option>
        ))}
      </select>
      <div className="mb-4 p-3 bg-gray-100 rounded h-40 overflow-y-scroll text-sm">
        <pre>{chat.pages_text[selectedPage - 1]}</pre>
      </div>

      <div className="mb-6">
        <div className="font-semibold mb-1">Chatverlauf (max. 5 Q&A):</div>
        <div className="space-y-2">
          {(chat.chat_history || []).slice(-10).map((entry: ChatQA, i: number) => (
            <div key={i} className={entry.role === "user" ? "text-blue-800" : "text-green-700"}>
              <b>{entry.role === "user" ? "Du" : "KI"}:</b> {entry.content}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (!loading && input.trim()) askGemini(input.trim());
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          className="flex-grow border rounded px-3 py-2"
          placeholder="Frage zur Seite stellen…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-primary-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          Senden
        </button>
      </form>
    </div>
  );
};
