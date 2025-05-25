
import React from 'react';
import type { AnalysisResult, ParsedData, ChartSuggestion } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { Card } from './common/Card';
import { Button } from './common/Button';

interface DashboardDisplayProps {
  analysis: AnalysisResult;
  rawData: ParsedData;
  fileName: string;
  onExportImage: () => void;
  onExportPDF: () => void;
  onReset: () => void;
}

const DownloadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ArrowPathIcon: React.FC = () => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
</svg>
);


export const DashboardDisplay = React.forwardRef<HTMLDivElement, DashboardDisplayProps>(
  ({ analysis, rawData, fileName, onExportImage, onExportPDF, onReset }, ref) => {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-700">
            Analyse für: <span className="font-semibold">{fileName}</span>
          </h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button onClick={onExportImage} variant="secondary" size="sm"><DownloadIcon />Als Bild</Button>
            <Button onClick={onExportPDF} variant="secondary" size="sm"><DownloadIcon />Als PDF</Button>
            <Button onClick={onReset} variant="outline" size="sm"><ArrowPathIcon />Neue Analyse</Button>
          </div>
        </div>

        <div ref={ref} className="p-4 sm:p-6 bg-white rounded-xl shadow-lg printable-area">
          <Card>
            <h3 className="text-xl font-semibold text-primary-600 mb-3">Zusammenfassung</h3>
            <p className="text-secondary-700 whitespace-pre-wrap">{analysis.summaryText}</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <h3 className="text-xl font-semibold text-primary-600 mb-3">Wichtige Erkenntnisse</h3>
              <ul className="list-disc list-inside space-y-2 text-secondary-700">
                {analysis.keyInsights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="text-xl font-semibold text-primary-600 mb-3">Handlungsempfehlungen</h3>
              <ul className="list-disc list-inside space-y-2 text-secondary-700">
                {analysis.actionableRecommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </Card>
          </Card>
          
          <Card className="mt-6">
             <h3 className="text-xl font-semibold text-primary-600 mb-3">Visualisierungs-Vorschlag</h3>
             <p className="text-secondary-700 italic">"{analysis.visualizationThemeSuggestion.description}"</p>
             <p className="text-sm text-secondary-500 mt-1">(Empfohlener Diagrammtyp: {analysis.visualizationThemeSuggestion.suggestedChartTypeForTheme})</p>
          </Card>

          <div className="mt-8">
            <h3 className="text-2xl font-semibold text-primary-700 mb-6 text-center">Datenvisualisierungen</h3>
            {analysis.chartSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
                {analysis.chartSuggestions.map((suggestion: ChartSuggestion, index: number) => (
                  <Card key={index} className="flex flex-col">
                    <h4 className="text-lg font-semibold text-primary-600 mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-secondary-500 mb-3">{suggestion.description}</p>
                    <div className="flex-grow min-h-[300px] sm:min-h-[400px]"> {/* Ensure charts have space */}
                       <ChartRenderer suggestion={suggestion} data={rawData} />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-secondary-600 py-8">Keine Diagrammvorschläge von der KI erhalten.</p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

DashboardDisplay.displayName = 'DashboardDisplay';
