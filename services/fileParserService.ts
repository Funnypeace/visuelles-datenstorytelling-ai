import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData, DataEntry } from '../types';

/** NEU: Aggregiert Datum+Region auf Monats-Umsatz */
function aggregateByMonthAndRegion(
  rows: DataEntry[]
): { month: string; region: string; revenue: number }[] {
  const map: Record<string, {
    month: string;
    region: string;
    revenue: number;
  }> = {};

  rows.forEach((row) => {
    // Passe hier ggf. die Feldnamen an, falls deine Spalten anders heißen:
    const rawDate = String((row as any).Datum ?? row.date);
    const month = rawDate.slice(0, 7);        // "YYYY-MM"
    const region = String((row as any).Region ?? row.region);
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

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (!event.target?.result) {
        return reject(new Error("Fehler beim Lesen der Datei."));
      }
      try {
        let formattedData: DataEntry[] = [];

        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const csvText = event.target.result as string;
          const { data } = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
          const [headers, ...rows] = data;
          formattedData = rows.map((row) => {
            const obj: any = {};
            headers.forEach((h, i) => (obj[h] = row[i]));
            return obj as DataEntry;
          });
        } else {
          const arrayBuffer = event.target.result as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const sheetJson = XLSX.utils.sheet_to_json<DataEntry>(worksheet, { header: 1, defval: null }) as any[][];
          const [headers, ...rows] = sheetJson;
          formattedData = rows.map((row) => {
            const obj: any = {};
            headers.forEach((h, i) => (obj[h as string] = row[i]));
            return obj as DataEntry;
          });
        }

        // === HIER ÄNDERN ===
        // Anstelle von: resolve(formattedData);
        // geben wir jetzt das monatliche Pivot zurück:
        const aggregated = aggregateByMonthAndRegion(formattedData);
        resolve(aggregated);

      } catch (parseError: any) {
        reject(new Error(`Fehler beim Verarbeiten der Datei: ${parseError.message}`));
      }
    };

    reader.onerror = () => reject(new Error("Dateilesefehler."));
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      reader.readAsText(file);
    } else if (
      file.name.endsWith('.xlsx') ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Nicht unterstützter Dateityp."));
    }
  });
};
