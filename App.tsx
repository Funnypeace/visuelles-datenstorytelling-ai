import React, { useState, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { DashboardDisplay } from './components/DashboardDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { parseDataFile } from './services/fileParserService';
import { analyzeDataWithGemini } from './services/geminiService';
import type { ParsedData, AnalysisResult } from './types';
import { APP_TITLE, GEMINI_MODEL_TEXT } from './constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// NEU: Supabase-Service importieren
import { insertAnalysis } from './services/analysisService';

type AppView = 'upload' | 'loading' | 'dashboard' | 'error';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

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

      // KORREKT: Vite-Umgebungsvariable prüfen
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setErrorMessage('Gemini API Key ist nicht konfiguriert. Bitte setzen Sie die Umgebungsvariable VITE_GEMINI_API_KEY.');
        setCurrentView('error');
        return;
      }

      const analysis = await analyzeDataWithGemini(data, file.name, GEMINI_MODEL_TEXT);
      setAnalysisResult(analysis);
      setCurrentView('dashboard');

      // NEU: Ergebnis & Daten in Supabase speichern
      try {
        await insertAnalysis(
          file.name,
          data,
          analysis.result || (typeof analysis === "string" ? analysis : "")
        );
      } catch (err) {
        // Optional: Speichere-Fehler anzeigen (App läuft trotzdem weiter)
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

  return (
    <div className="min-h-screen bg-secondary-100 text-secondary-800 flex flex-col">
      <header className="bg-primary-600 text-white p-6 shadow-md">
        <h1 className="text-3xl font-bold text-center">{APP_TITLE}</h1>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === 'loading' && <LoadingSpinner message="Analysiere Daten..." />}

        {currentView === 'upload' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-2xl font-semibold text-primary-700 mb-6">Daten hochladen und Story entdecken</h2>
            <p className="text-secondary-600 mb-8">
              Laden Sie Ihre Excel- (.xlsx) oder CSV-Datei hoch. Unsere KI analysiert die Daten und erstellt
              automatisch ein interaktives Dashboard mit Visualisierungen, Trends und Empfehlungen.
            </p>
            <FileUpload onFileUpload={handleFileUpload} />
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
          <DashboardDisplay
            ref={dashboardRef}
            analysis={analysisResult}
            rawData={parsedData}
            fileName={fileName}
            onExportImage={handleExportToImage}
            onExportPDF={handleExportToPDF}
            onReset={resetState}
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
