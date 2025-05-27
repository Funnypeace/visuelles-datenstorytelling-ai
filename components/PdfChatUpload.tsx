import React, { useState } from 'react';
// import { extractPdfPages } from '../services/pdfTextExtractor';   // <--- LÖSCHEN!
import { savePdfChat } from '../services/pdfChatService';

interface PdfChatUploadProps {
  onUploadSuccess: (chatId: string) => void;
}

const PdfChatUpload: React.FC<PdfChatUploadProps> = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      // const pages = await extractPdfPages(file); // <--- ENTFERNEN
      // Simuliere leeres Seiten-Array (kannst du später anpassen)
      const pages: string[] = [];
      const chat = await savePdfChat(file.name, pages);
      onUploadSuccess(chat.id);
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

export default PdfChatUpload;
