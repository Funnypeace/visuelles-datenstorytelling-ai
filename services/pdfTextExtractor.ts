// services/pdfTextExtractor.ts

/**
 * Extrahiert alle Seiten als Text aus einem PDF.
 * @param file File-Objekt (PDF)
 * @returns Promise<string[]> – Array: Eine Seite = ein String
 */
export async function extractPdfPages(file: File): Promise<string[]> {
  // Dynamischer Import von pdfjs-dist, damit es nur im Browser geladen wird!
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  await import('pdfjs-dist/build/pdf.worker.entry');

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
