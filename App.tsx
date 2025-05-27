import React, { useState, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { DashboardDisplay } from './components/DashboardDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { parseDataFile } from './services/fileParserService';
import { analyzeDataWithGemini, askGeminiAboutData } from './services/geminiService';
import type { ParsedData, AnalysisResult } from './types';
import { APP_TITLE, GEMINI_MODEL_TEXT } from './constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { insertAnalysis, getAllAnalyses } from './services/analysisService';
import AnalysisHistory from './components/AnalysisHistory';
import DataChat from './components/DataChat';
import { PdfChat } from './components/PdfChat'; // <--- NEU!

type AppView = 'upload' | 'loading' | 'dashboard' | 'error' | 'history' | 'chat' | 'pdfchat'; // <--- NEU

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // PDF-Chat State
  const [currentPdfChatId, setCurrentPdfChatId] = useState<string | null>(null);

  const resetState = () => {
    setCurrentView('upload');
    setParsedData(null);
    setAnalysisResult(null);
    setFileName('');
    setErrorMessage(null);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setCurrentView('loading');
    setErrorMessage(null);
    setFileName(file.name);
    try {
      const data = await parseDataFile(file);
      setParsedData(data);
      if (data.length === 0) {
        setErrorMessage("Die Datei enthält keine Daten oder konnte nicht korrekt gelesen werden.");
        setCurrentView('error');
        return;
      }

      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setErrorMessage('Gemini API Key ist nicht konfiguriert. Bitte setzen Sie die Umgebungsvariable VITE_GEMINI_API_KEY.');
        setCurrentView('error');
        return;
      }

      const analysis = await analyzeDataWithGemini(data, file.name, GEMINI_MODEL_TEXT);
      setAnalysisResult(analysis);
      setCurrentView('dashboard');

      // Speichere Analyse in Supabase
      try {
        await insertAnalysis(
          file.name,
          data,
          analysis.result || (typeof analysis === "string" ? analysis : "")
        );
      } catch (err) {
        console.error("Supabase Insert Error:", err);
      }
    } catch (error) {
      console.error("Fehler bei der Datenverarbeitung oder Analyse:", error);
      setErrorMessage(error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.");
      setCurrentView('error');
    }
  }, []);

  const handleExportToImage = useCallback(() => {
    if (dashboardRef.current) {
      html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f1f5f9' }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${fileName.split('.')[0]}_dashboard.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  }, [fileName]);

  const handleExportToPDF = useCallback(() => {
    if (dashboardRef.current) {
      html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f1f5f9' }).then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileName.split('.')[0]}_dashboard.pdf`);
      });
    }
  }, [fileName]);

  // HISTORY: Lädt die History und zeigt die History-Ansicht an
  const showHistory = async () => {
    setCurrentView('loading');
    try {
      const entries = await getAllAnalyses();
      setHistoryEntries(entries);
      setCurrentView('history');
    } catch (e: any) {
      setErrorMessage(e.message || "Fehler beim Laden der History");
      setCurrentView('error');
    }
  };

  // HISTORY: Erneut analysieren
  const handleReanalyze = async (entry: any) => {
    setCurrentView('loading');
    setFileName(entry.filename);
    setParsedData(entry.data);
    setAnalysisResult(null);
    try {
      const analysis = await analyzeDataWithGemini(entry.data, entry.filename, GEMINI_MODEL_TEXT);
      setAnalysisResult(analysis);
      setCurrentView('dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
      setCurrentView('error');
    }
  };

  // HISTORY: Zurück zur App
  const handleBackToApp = () => {
    setCurrentView('upload');
  };

  // CHAT: Öffnet Chat-Ansicht
  const handleOpenChat = () => {
    setCurrentView('chat');
  };

  // CHAT: Schließen und zurück zum Dashboard
  const handleCloseChat = () => {
    setCurrentView('dashboard');
  };

  // CHAT: Fragt die KI zum aktuellen Datensatz
  const handleAskQuestion = async (question: string): Promise<string> => {
    if (!parsedData || !fileName) {
      return "Fehler: Es ist kein Datensatz geladen.";
    }
    try {
      return await askGeminiAboutData(parsedData, fileName, question);
    } catch (e: any) {
      return e?.message || "Fehler bei der KI-Anfrage.";
    }
  };

  // PDFCHAT: Öffnen
  const handleOpenPdfChat = (chatId: string) => {
    setCurrentPdfChatId(chatId);
    setCurrentView('pdfchat');
  };

  // PDFCHAT: Schließen (zurück zum Upload, du kannst es anpassen)
  const handleClosePdfChat = () => {
    setCurrentPdfChatId(null);
    setCurrentView('upload');
  };

  return (
    <div className="min-h-screen bg-secondary-100 text-secondary-800 flex flex-col">
      <header className="bg-primary-600 text-white p-6 shadow-md">
        <h1 className="text-3xl font-bold text-center">{APP_TITLE}</h1>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Button für History-Ansicht oben rechts */}
{currentView !== 'history' && (
  <div className="flex justify-end mb-4 gap-2">
    <button
      onClick={showHistory}
      className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition duration-150"
    >
      Analyse-History
    </button>
    {/* NEU: Test-Button für PDF-Chat */}
    <button
      onClick={() => setCurrentView('pdfchat')}
      className="px-4 py-2 bg-secondary-600 text-white font-semibold rounded-lg shadow-md hover:bg-secondary-700 transition duration-150"
    >
      Test: PDF-Chat öffnen (Demo)
    </button>
  </div>
)}

        {currentView === 'loading' && <LoadingSpinner message="Analysiere Daten..." />}

        {currentView === 'upload' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-2xl font-semibold text-primary-700 mb-6">Daten hochladen und Story entdecken</h2>
            <p className="text-secondary-600 mb-8">
              Laden Sie Ihre Excel- (.xlsx) oder CSV-Datei hoch. Unsere KI analysiert die Daten und erstellt
              automatisch ein interaktives Dashboard mit Visualisierungen, Trends und Empfehlungen.
            </p>
            <FileUpload onFileUpload={handleFileUpload} />

            {/* TEST-BUTTON FÜR PDF-CHAT */}
            <div className="mt-6">
              <button
                onClick={() => handleOpenPdfChat('DEMO_CHAT_ID')}
                className="px-4 py-2 bg-secondary-600 text-white rounded-md"
              >
                Test: PDF-Chat öffnen (Demo)
              </button>
            </div>
          </div>
        )}

        {currentView === 'error' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Fehler</h2>
            <p className="text-secondary-700 mb-6">{errorMessage}</p>
            <button
              onClick={resetState}
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition duration-150"
            >
              Neue Datei hochladen
            </button>
          </div>
        )}

        {currentView === 'dashboard' && analysisResult && parsedData && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleOpenChat}
                className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition duration-150"
              >
                KI-Chat zum Dokument
              </button>
            </div>
            <DashboardDisplay
              ref={dashboardRef}
              analysis={analysisResult}
              rawData={parsedData}
              fileName={fileName}
              onExportImage={handleExportToImage}
              onExportPDF={handleExportToPDF}
              onReset={resetState}
            />
          </>
        )}

        {currentView === 'chat' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleCloseChat}
                className="px-4 py-2 bg-secondary-500 text-white font-semibold rounded-lg shadow-md hover:bg-secondary-700 transition duration-150"
              >
                Zurück zum Dashboard
              </button>
            </div>
            <DataChat onAsk={handleAskQuestion} />
          </div>
        )}

        {currentView === 'pdfchat' && currentPdfChatId && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleClosePdfChat}
                className="px-4 py-2 bg-secondary-500 text-white font-semibold rounded-lg shadow-md hover:bg-secondary-700 transition duration-150"
              >
                Zurück
              </button>
            </div>
            <PdfChat
              chatId={currentPdfChatId}
              apiKey={import.meta.env.VITE_GEMINI_API_KEY!}
            />
          </div>
        )}

        {currentView === 'history' && (
          <AnalysisHistory
            analyses={historyEntries}
            onReanalyze={handleReanalyze}
            onBack={handleBackToApp}
          />
        )}
      </main>

      <footer className="text-center p-4 text-secondary-500 text-sm">
        Powered by React, Tailwind CSS, and Google Gemini API.
      </footer>
    </div>
  );
};

export default App;
