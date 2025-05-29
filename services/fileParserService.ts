// services/fileParserService.ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData, DataEntry } from '../types';

/** Hilfsfunktion: Monat×Region-Pivot */
function aggregateByMonthAndRegion(
  rows: DataEntry[]
): { month: string; region: string; revenue: number }[] {
  const map: Record<string, { month: string; region: string; revenue: number }> = {};

  rows.forEach((row) => {
    const raw = (row as any).Datum;
    let dateString: string;
    if (raw instanceof Date) {
      dateString = raw.toISOString().slice(0, 10);
    } else {
      dateString = String(raw ?? '').slice(0, 10);
    }

    const month = dateString.slice(0, 7);       // "YYYY-MM"
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

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (!result) return reject(new Error('Fehler beim Lesen der Datei.'));

      try {
        let rawRows: DataEntry[] = [];

        // CSV
        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const text = result as string;
          const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });
          const [headers, ...rows] = data;
          rawRows = rows.map((r) => {
            const obj: any = {};
            headers.forEach((h, i) => (obj[h] = r[i]));
            return obj as DataEntry;
          });

        // XLSX
        } else {
          const arrayBuffer = result as ArrayBuffer;
          const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json<DataEntry>(sheet, {
            defval: null,
            raw: false,
          }) as DataEntry[];
        }

        const aggregated = aggregateByMonthAndRegion(rawRows);
        resolve(aggregated);

      } catch (err: any) {
        reject(new Error('Fehler beim Verarbeiten der Datei: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Datei-Lese-Fehler.'));

    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};
