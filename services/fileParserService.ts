// services/fileParserService.ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData, DataEntry } from '../types';

/** Deutsche Monatsnamen in YYYY-MM umwandeln, wenn „Monat“ z. B. "Mai 2024" oder "Juni 2023" ist */
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

/**
 * Extrahiert aus einem Text wie "Mai 2024" o.ä. das Jahr und den Monat-Index.
 * 
 * @param rawMon Dieses Feld kommt aus row.Monat (z. B. "Mai 2024" oder nur "Mai").
 * @returns { year: string, monthIndex: number } – monthIndex von 1–12; year ist vierstellig, falls nicht vorhanden, wird null zurückgegeben.
 */
function parseGermanMonthYear(rawMon: unknown): { year: string | null; monthIndex: number | null } {
  if (rawMon == null) return { year: null, monthIndex: null };

  const txt = String(rawMon).trim();
  // Teile an Leerzeichen: ["Mai", "2024"] oder nur ["Mai"]
  const parts = txt.split(/\s+/);
  const monthName = parts[0];
  const idx = germanMonthNames.indexOf(monthName);
  if (idx < 0) {
    return { year: null, monthIndex: null };
  }

  // Wenn nach dem Monatsnamen noch etwas folgt, nehmen wir das als Jahr an
  let year: string | null = null;
  if (parts.length > 1) {
    // Suche in parts[1] nach vierstelliger Jahreszahl
    const candidate = parts[1];
    if (/^\d{4}$/.test(candidate)) {
      year = candidate;
    }
  }

  return { year, monthIndex: idx + 1 };
}

/** Pivotiert auf (Jahr-Monat) × Region und summiert den Umsatz */
function aggregateByMonthAndRegion(
  rows: DataEntry[]
): { month: string; region: string; revenue: number }[] {
  const map: Record<string, { month: string; region: string; revenue: number }> = {};

  rows.forEach((row) => {
    // 1) Extrahiere Monat und Jahr aus row.Monat
    const rawMon = (row as any).Monat ?? '';
    const { year, monthIndex } = parseGermanMonthYear(rawMon);

    if (monthIndex == null) {
      // Überspringe Zeilen, bei denen sich keine eindeutige Monatszahl ermitteln lässt
      return;
    }

    // Wenn kein Jahr im String angegeben, kann man hier als Fallback das aktuelle Jahr nehmen,
    // oder ein Standardjahr. Wir verwenden null → überspringe, falls kein Jahr da ist.
    if (!year) {
      return;
    }

    const monthKey = `${year}-${String(monthIndex).padStart(2, '0')}`; // Bsp.: "2024-05"

    // 2) Region: Falls kein Feld 'Region' existiert, Default "Gesamt"
    const region = (row as any).Region
      ? String((row as any).Region).trim()
      : 'Gesamt';

    // 3) Umsatz auslesen: Zuerst `Umsatz`, sonst suche key mit "Umsatz" oder "Verkaufszahlen"
    let revenue = 0;
    if ((row as any).Umsatz !== undefined) {
      revenue = Number((row as any).Umsatz);
    } else {
      for (const key of Object.keys(row as any)) {
        if (/Umsatz|Verkaufszahlen/i.test(key)) {
          revenue = Number((row as any)[key]);
          break;
        }
      }
    }
    if (isNaN(revenue)) revenue = 0;

    // 4) Key für Pivot: "YYYY-MM|Region"
    const pivotKey = `${monthKey}|${region}`;
    if (!map[pivotKey]) {
      map[pivotKey] = { month: monthKey, region, revenue: 0 };
    }
    map[pivotKey].revenue += revenue;
  });

  return Object.values(map);
}

export const parseDataFile = (file: File): Promise<ParsedData[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (!result) {
        return reject(new Error('Fehler beim Lesen der Datei.'));
      }

      try {
        let rawRows: DataEntry[] = [];

        // 1) CSV-Fall
        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const text = result as string;
          const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });
          const [headers, ...rows] = data;
          rawRows = rows.map((r) => {
            const obj: any = {};
            headers.forEach((h, i) => {
              obj[h] = r[i];
            });
            return obj as DataEntry;
          });

        // 2) XLSX-Fall
        } else {
          const arrayBuffer = result as ArrayBuffer;
          const wb = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
          });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json<DataEntry>(sheet, {
            defval: null,
            raw: false,
          }) as DataEntry[];
        }

        // 3) Pivotieren: Jedes Objekt → { month: "YYYY-MM", region, revenue }
        const aggregated = aggregateByMonthAndRegion(rawRows);

        resolve(aggregated);
      } catch (err: any) {
        reject(new Error('Verarbeitungsfehler: ' + err.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Datei-Lese-Fehler.'));
    };

    // Starte das Lesen der Datei (Text für CSV, ArrayBuffer für XLSX)
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
