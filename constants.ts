
export const APP_TITLE = "Visuelles Daten-Storytelling AI";

// Gemini Model. Use the one specified in prompt guidelines
export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

// Chart Colors (Example Palette - can be extended)
// Using Tailwind default colors programmatically is tricky without a full JS config,
// so define a palette here. These are inspired by Tailwind's blue, teal, indigo, pink, orange.
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#0ea5e9', // sky-500
];

export const MAX_SAMPLE_ROWS_FOR_GEMINI = 20; // Max data rows to send in prompt
export const MAX_PROMPT_CHARS_ESTIMATE = 15000; // Rough estimate for prompt size control

export const EXAMPLE_CSV_DATA = `Datum,Region,Produkt,Umsatz,Einheiten
2025-01-15,Nord,Alpha,1200,30
2025-01-20,Süd,Beta,800,20
2025-02-10,Nord,Alpha,1500,35
2025-02-13,West,Gamma,500,10
2025-02-25,Süd,Beta,950,25
2025-03-05,Nord,Alpha,1800,40
2025-03-15,Ost,Gamma,1100,22
2025-03-24,West,Beta,2200,50`;

// Placeholder for API Key if not set via process.env - App will show error.
// export const FALLBACK_API_KEY = "YOUR_GEMINI_API_KEY"; // DO NOT COMMIT ACTUAL KEYS
