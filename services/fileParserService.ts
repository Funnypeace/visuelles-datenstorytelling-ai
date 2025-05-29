// services/fileParserService.ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData, DataEntry } from '../types';

/** Deutsche Monatsnamen in YYYY-MM umwandeln */
const germanMonthNames = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Pivotiert auf Monat × Region und summiert den Umsatz */
function aggregateByMonthAndRegion(
  rows: DataEntry[]
): { month: string; region: string; revenue: number }[] {
  const map: Record<string, { month: string; region: string; revenue: number }> = {};

  rows.forEach((row) => {
    const monName = String((row as any).Monat ?? '').trim();
    const idx = germanMonthNames.indexOf(monName);
    if (idx < 0) return; // Unbekannte Monatsnamen überspringen

    // Jahr statisch 2025 – passe hier an, falls dein Sheet ein Jahr-Feld enthält
    const monthKey = `2025-${String(idx + 1).padStart(2, '0')}`; // "2025-02"

    const region = String((row as any).Region ?? '').trim();
    const revenue = Number((row as any).Umsatz ?? 0);

    const key = `${monthKey}|${region}`;
    if (!map[key]) {
      map[key] = { month: monthKey, region, revenue: 0 };
    }
    map[key].revenue += revenue;
  });

  return Object.values(map);
}

export const parseDataFile = (file: File): Promise<ParsedData[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (!result) return reject(new Error('Fehler beim Lesen der Datei.'));

      try {
        let rawRows: DataEntry[] = [];

        // CSV?
        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const text = result as string;
          const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });
          const [headers, ...rows] = data;
          rawRows = rows.map((r) => {
            const obj: any = {};
            headers.forEach((h, i) => (obj[h] = r[i]));
            return obj as DataEntry;
          });
        } else {
          // XLSX
          const buffer = result as ArrayBuffer;
          const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json<DataEntry>(sheet, {
            defval: null,
            raw: false,
          }) as DataEntry[];
        }

        // Pivotieren
        const aggregated = aggregateByMonthAndRegion(rawRows);
        resolve(aggregated);
      } catch (err: any) {
        reject(new Error('Verarbeitungsfehler: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Datei-Lese-Fehler.'));
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
