import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData, DataEntry } from '../types';

/** Hilfsfunktion: Monat×Region pivot */
function aggregateByMonthAndRegion(
  rows: DataEntry[]
): { month: string; region: string; revenue: number }[] {
  const map: Record<string, { month: string; region: string; revenue: number }> = {};

  rows.forEach((row) => {
    const rawDate = String((row as any).Datum ?? row.date ?? '');
    const month = rawDate.slice(0, 7); // "YYYY-MM"
    const region = String((row as any).Region ?? row.region ?? '');
    const revenue = Number((row as any).Umsatz ?? row.revenue ?? 0);

    const key = `${month}|${region}`;
    if (!map[key]) {
      map[key] = { month, region, revenue: 0 };
    }
    map[key].revenue += revenue;
  });

  return Object.values(map);
}

export const parseDataFile = (file: File): Promise<ParsedData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) return reject(new Error('Fehler beim Lesen der Datei.'));

      try {
        let raw: DataEntry[] = [];

        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const text = result as string;
          const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });
          const [headers, ...rows] = data;
          raw = rows.map((r) => {
            const obj: any = {};
            headers.forEach((h, i) => (obj[h] = r[i]));
            return obj as DataEntry;
          });
        } else {
          const arrayBuffer = result as ArrayBuffer;
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<DataEntry>(sheet, {
            header: 1,
            defval: null,
          }) as any[][];
          const [headers, ...rows] = json;
          raw = rows.map((r) => {
            const obj: any = {};
            headers.forEach((h: string, i: number) => (obj[h] = r[i]));
            return obj as DataEntry;
          });
        }

        // **WICHTIG**: hier nicht mehr raw, sondern das Pivot zurückgeben
        const aggregated = aggregate
