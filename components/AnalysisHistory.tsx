import React from "react";

type AnalysisEntry = {
  id: number;
  filename: string;
  created_at: string;
  insights: string;
  data: any;
};

interface AnalysisHistoryProps {
  analyses: AnalysisEntry[];
  onReanalyze: (entry: AnalysisEntry) => void;
  onBack: () => void;
}

const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  analyses,
  onReanalyze,
  onBack,
}) => {
  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-primary-700 mb-6 text-center">
        Analyse-History
      </h2>
      <button
        className="mb-4 px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700"
        onClick={onBack}
      >
        Zurück zur App
      </button>
      {analyses.length === 0 ? (
        <p className="text-secondary-600 text-center">Keine Analysen gespeichert.</p>
      ) : (
        <ul className="space-y-4">
          {analyses.map((entry) => (
            <li key={entry.id} className="border p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <b>Dateiname:</b> {entry.filename}
                <br />
                <span className="text-secondary-500 text-sm">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                <br />
                <span className="italic text-secondary-600">
                  {entry.insights && entry.insights.slice(0, 80)}{entry.insights && entry.insights.length > 80 ? "..." : ""}
                </span>
              </div>
              <button
                className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700"
                onClick={() => onReanalyze(entry)}
              >
                Erneut analysieren
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnalysisHistory;
