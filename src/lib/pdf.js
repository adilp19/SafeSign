// Extracts text from a PDF entirely in the browser — the file is never uploaded.
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt') || file.type === 'text/plain') {
    return (await file.text()).trim();
  }

  if (!name.endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF or .txt file, or paste the text instead.');
  }

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      text += item.str + (item.hasEOL ? '\n' : ' ');
    }
    text += '\n\n';
  }

  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  if (text.length < 80) {
    throw new Error(
      "This PDF looks like a scanned image, so there's no text to read. Paste the text instead."
    );
  }
  return text;
}
