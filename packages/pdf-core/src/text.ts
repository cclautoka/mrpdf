/** Plain-text -> PDF (worker/Node-safe via pdf-lib standard fonts). */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PAGE_SIZES, type PageSizeName } from './types';

export interface TextToPdfOptions {
  pageSize?: PageSizeName;
  fontSize?: number;
  margin?: number;
}

/** Render plain text into a paginated PDF with simple greedy word wrapping. */
export async function textToPdf(text: string, options: TextToPdfOptions = {}): Promise<Uint8Array> {
  const { pageSize = 'A4', fontSize = 12, margin = 56 } = options;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const [pageW, pageH] = PAGE_SIZES[pageSize];
  const maxWidth = pageW - margin * 2;
  const lineHeight = fontSize * 1.4;

  const wrapped = wrapText(text, font, fontSize, maxWidth);

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;
  for (const line of wrapped) {
    if (y < margin) {
      page = doc.addPage([pageW, pageH]);
      y = pageH - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }

  return doc.save();
}

/** Greedy word-wrap that also respects explicit newlines in the source text. */
function wrapText(
  text: string,
  font: import('pdf-lib').PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    if (rawLine.trim() === '') {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of rawLine.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}
