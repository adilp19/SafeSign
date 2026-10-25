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
  const filled = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      text += item.str + (item.hasEOL ? '\n' : ' ');
    }
    text += '\n\n';

    // Values typed into a fillable PDF live in form fields, not in the page text.
    const annots = await page.getAnnotations();
    for (const a of annots) {
      const v = typeof a.fieldValue === 'string' ? a.fieldValue.trim() : '';
      if (a.fieldType === 'Tx' && v) filled.push(`${a.fieldName || 'Field'}: ${v}`);
      if (a.fieldType === 'Btn' && a.checkBox && v && v !== 'Off') filled.push(`${a.fieldName || 'Checkbox'}: checked`);
      // Text typed on top of the page with a text-box tool (e.g. Preview → Markup → Text).
      const note = a.subtype === 'FreeText' ? (a.contentsObj?.str || a.contents || '').trim() : '';
      if (note) filled.push(`Typed note on page ${p}: ${note}`);
    }
  }

  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (filled.length) {
    text += `\n\nVALUES FILLED INTO THE FORM FIELDS OF THIS DOCUMENT:\n${filled.join('\n')}`;
  }

  if (text.length < 80 && !filled.length) {
    throw new Error(
      "This PDF looks like a scanned image, so there's no text to read. Paste the text instead."
    );
  }
  return text;
}
