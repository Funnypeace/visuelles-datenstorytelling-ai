
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData, DataEntry } from '../types';

export const parseDataFile = (file: File): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (!event.target?.result) {
        return reject(new Error("Fehler beim Lesen der Datei."));
      }
      try {
        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const csvText = event.target.result as string;
          Papa.parse<DataEntry>(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Automatically convert numbers and booleans
            complete: (results) => {
              if (results.errors.length > 0) {
                console.error("CSV Parsing errors:", results.errors);
                // Potentially return partial data or specific error
              }
              resolve(results.data);
            },
            error: (error: Error) => reject(new Error(`CSV Parsing Fehler: ${error.message}`)),
          });
        } else if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          const binaryStr = event.target.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(binaryStr), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<DataEntry>(worksheet, { header: 1, defval: null });
          
          if (jsonData.length === 0) {
            resolve([]);
            return;
          }

          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);

          const formattedData = dataRows.map(rowArray => {
            const rowObject: DataEntry = {};
            headers.forEach((header, index) => {
              // Attempt to convert to number if possible, otherwise keep as string
              const value = (rowArray as any[])[index];
              if (typeof value === 'number') {
                rowObject[header] = value;
              } else if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(value as any)) {
                 // Check if it's a string that can be a number (e.g. "123.45")
                 // But also ensure it doesn't have non-numeric characters like currency symbols for this basic parse.
                 // A more robust solution would handle currency, dates specifically.
                 if (/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(value)) {
                    rowObject[header] = parseFloat(value);
                 } else {
                    rowObject[header] = value;
                 }
              } else {
                rowObject[header] = value;
              }
            });
            return rowObject;
          });
          resolve(formattedData);

        } else {
          reject(new Error("Nicht unterstützter Dateityp."));
        }
      } catch (parseError) {
        reject(new Error(`Fehler beim Verarbeiten der Datei: ${(parseError as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error("Dateilesefehler."));

    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Nicht unterstützter Dateityp."));
    }
  });
};
