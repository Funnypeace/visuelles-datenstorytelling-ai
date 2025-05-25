
export type DataValue = string | number | boolean | null;

export interface DataEntry extends Record<string, DataValue> {}

export type ParsedData = DataEntry[];

export interface ChartSuggestionDataKeys {
  x?: string; // For Line, Bar, Scatter
  y?: string | string[]; // For Line, Bar (string or string[] for multiple series), Scatter (string)
  name?: string; // For PieChart (category name)
  value?: string; // For PieChart (numerical value)
  z?: string; // Optional for Scatter (bubble size)
}

export interface ChartSuggestion {
  type: 'LineChart' | 'BarChart' | 'PieChart' | 'ScatterChart'; // Add more as supported
  title: string;
  dataKeys: ChartSuggestionDataKeys;
  description: string;
}

export interface AnalysisResult {
  summaryText: string;
  keyInsights: string[];
  chartSuggestions: ChartSuggestion[];
  actionableRecommendations: string[];
  visualizationThemeSuggestion: {
    description: string;
    suggestedChartTypeForTheme: string; // e.g., "BarChart"
  };
}

// Represents the structure Gemini is expected to return
export interface GeminiAnalysisResponseSchema {
  summaryText: string;
  keyInsights: string[];
  chartSuggestions: Array<{
    type: 'LineChart' | 'BarChart' | 'PieChart' | 'ScatterChart';
    title: string;
    dataKeys: {
      x?: string;
      y?: string | string[];
      name?: string;
      value?: string;
      z?: string;
    };
    description: string;
  }>;
  actionableRecommendations: string[];
  visualizationThemeSuggestion: {
    description: string;
    suggestedChartTypeForTheme: string;
  };
}
