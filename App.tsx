// App.tsx
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
import { PdfChat } from './components/PdfChat';
import PdfChatUpload from './components/PdfChatUpload';

type AppView = 
  | 'upload'
  | 'loading'
  | 'dashboard'
  | 'error'
  | 'history'
  | 'chat'
  | 'pdfchat';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [parsedData, setParsedData] = useState<ParsedData[] | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const dashboardRef = useRef<HTMLDivElement>(null);
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
        setErrorMessage('Gemini API Key ist nicht konfiguriert. Bitte setzen Sie VITE_GEMINI_API_KEY.');
        setCurrentView('error');
        return;
      }

      const analysis = await analyzeDataWithGemini(data, file.name, GEMINI_MODEL_TEXT);
      setAnalysisResult(analysis);
      setCurrentView('dashboard');

      try {
        await insertAnalysis(file.name, data, JSON.stringify(analysis));
      } catch (err) {
        console.error("Supabase Insert Error:", err);
      }
    } catch (err: any) {
      console.error("Fehler bei der Datenverarbeitung oder Analyse:", err);
      setErrorMessage(err.message || "Ein unbekannter Fehler ist aufgetreten.");
      setCurrentView('error');
    }
  }, []);

  const handleExportToImage = useCallback(() => {
    if (!dashboardRef.current) return;
    html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f1f5f9' })
      .then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${fileName.split('.')[0]}_dashboard.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  }, [fileName]);

  const handleExportToPDF = useCallback(() => {
    if (!dashboardRef.current) return;
    html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f1f5f9' })
      .then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileName.split('.')[0]}_dashboard.pdf`);
      });
  }, [fileName]);

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

  const handleReanalyze = async (entry: any) => {
    setCurrentView('loading');
    setFileName(entry.filename);
    setParsedData(entry.data);
    setAnalysisResult(null);
    try {
      const analysis = await analyzeDataWithGemini(entry.data, entry.filename, GEMINI_MODEL_TEXT);
      setAnalysisResult(analysis);
      setCurrentView('dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || "Ein Fehler ist aufgetreten");
      setCurrentView('error');
    }
  };

  const handleBackToApp = () => {
    setCurrentView('upload');
  };

  const handleOpenChat = () => {
    setCurrentView('chat');
  };

  const handleCloseChat = () => {
    setCurrentView('dashboard');
  };

  const handleAskQuestion = async (question: string): Promise<string> => {
    if (!parsedData || !fileName) {
      return "Fehler: Kein Datensatz geladen.";
    }
    // Debug: Roh-Daten anzeigen
    console.log('💬 CHAT parsedData:', parsedData);

    // Fehlende Region×Monat-Kombinationen auffüllen
    const regions = Array.from(new Set(parsedData.map(d => d.region)));
    const compareMonths = ['2025-02', '2025-03'];
    const filledData: ParsedData[] = regions.flatMap(region =>
      compareMonths.map(month => {
        const existing = parsedData.find(d => d.region === region && d.month === month);
        return existing ?? { month, region, revenue: 0 };
      })
    );
    console.log('💬 filledData for comparison:', filledData);

    // Chat-Anfrage an Gemini
    try {
      return await askGeminiAboutData(filledData, fileName, question);
    } catch (e: any) {
      return e.message || "Fehler bei der KI-Anfrage.";
    }
  };

  const handleOpenPdfChat = (chatId: string) => {
    setCurrentPdfChatId(chatId);
    setCurrentView('pdfchat');
  };

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
        {currentView !== 'history' && (
          <div className="flex justify-end mb-4 gap-2">
            <button
              onClick={showHistory}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700"
            >
              Analyse-History
            </button>
          </div>
        )}
        {currentView === 'loading' && <LoadingSpinner message="Analysiere Daten..." />}
        {currentView === 'upload' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-2xl font-semibold text-primary-700 mb-6">
              Daten hochladen und Story entdecken
            </h2>
            <p className="text-secondary-600 mb-8">
              Laden Sie Ihre Excel- (.xlsx) oder CSV-Datei hoch. Unsere KI analysiert
              Ihre Daten und erstellt automatisch ein Dashboard mit Trends und Empfehlungen.
            </p>
            <FileUpload onFileUpload={handleFileUpload} />
            <div className="mt-8">
              <PdfChatUpload onUploadSuccess={handleOpenPdfChat} />
            </div>
          </div>
        )}
        {currentView === 'error' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Fehler</h2>
            <p className="text-secondary-700 mb-6">{errorMessage}</p>
            <button
              onClick={resetState}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700"
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
                className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700"
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
                className="px-4 py-2 bg-secondary-500 text-white rounded-lg shadow-md hover:bg-secondary-700"
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
                className="px-4 py-2 bg-secondary-500 text-white rounded-lg shadow-md hover:bg-secondary-700"
            >
              Zurück
            </button>
          </div>
          <PdfChat chatId={currentPdfChatId} apiKey={import.meta.env.VITE_GEMINI_API_KEY!} />
        </div>
      )}
      {currentView === 'history' && (
        <AnalysisHistory analyses={historyEntries} onReanalyze={handleReanalyze} onBack={handleBackToApp} />
      )}
    </main>
    <footer className="text-center p-4 text-secondary-500 text-sm">
      Powered by React, Tailwind CSS & Google Gemini API
    </footer>
  </div>
  );
};

export default App;
