// Extracts text from a PDF entirely in the browser — the file is never uploaded.
// Values typed into form fields or text boxes are placed back into the text at
// their position on the page, e.g. "Rent: $______ [filled in: 8200]", so the AI
// knows which blank each value belongs to.
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const LINE_TOLERANCE = 4; // points: items closer than this vertically share a line

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

  const pages = [];
  let filledCount = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = [];

    for (const it of content.items) {
      if (!it.str || !it.str.trim()) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
    }

    for (const a of await page.getAnnotations()) {
      let value = '';
      const v = typeof a.fieldValue === 'string' ? a.fieldValue.trim() : '';
      if (a.fieldType === 'Tx' && v) value = v;
      else if (a.fieldType === 'Btn' && a.checkBox && v && v !== 'Off') value = '☑';
      else if (a.subtype === 'FreeText') value = (a.contentsObj?.str || a.contents || '').trim();
      if (!value || !a.rect) continue;

      filledCount++;
      // rect = [x1, y1, x2, y2]; use the vertical middle so it lands on the right line.
      items.push({ str: `[filled in: ${value}]`, x: a.rect[0], y: (a.rect[1] + a.rect[3]) / 2 - 3 });
    }

    pages.push(buildLines(items));
  }

  const text = pages.join('\n\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  if (text.length < 80 && !filledCount) {
    throw new Error(
      "This PDF looks like a scanned image, so there's no text to read. Paste the text instead."
    );
  }
  return text;
}

// Rebuild reading order: top-to-bottom lines, left-to-right within a line.
function buildLines(items) {
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - it.y) <= LINE_TOLERANCE) line.items.push(it);
    else lines.push({ y: it.y, items: [it] });
  }

  let out = '';
  let prevY = null;
  for (const line of lines) {
    // A big vertical gap usually means a new paragraph.
    if (prevY !== null && prevY - line.y > 22) out += '\n';
    out += line.items.sort((a, b) => a.x - b.x).map((i) => i.str).join(' ') + '\n';
    prevY = line.y;
  }
  return out;
}
