// services/pdfTextExtractor.ts
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker.entry';

/**
 * Extrahiert alle Seiten als Text aus einem PDF.
 * @param file File-Objekt (PDF)
 * @returns Promise<string[]> – Array: Eine Seite = ein String
 */
export async function extractPdfPages(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const numPages = pdf.numPages;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    pages.push(strings.join(' '));
  }

  return pages;
}
