import React, { useState } from 'react';
import { extractPdfPages } from '../services/pdfTextExtractor'; // das wie beschrieben anlegen!
import { savePdfChat } from '../services/pdfChatService';

export const PdfChatUpload: React.FC<{ onChatCreated: (chatId: string) => void }> = ({ onChatCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      // PDF Seiten extrahieren
      const pages = await extractPdfPages(file); // gibt Array mit Seiten-Texten
      // PDF in Supabase speichern
      const chat = await savePdfChat(file.name, pages);
      onChatCreated(chat.id); // UUID!
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Verarbeiten oder Speichern der PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4">PDF hochladen und KI-Chat starten</h2>
      <input
        type="file"
        accept="application/pdf"
        disabled={loading}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="mb-4"
      />
      {loading && <p>PDF wird verarbeitet…</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
};
