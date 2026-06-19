/** Editing tools: watermark, page numbers, header/footer, crop, stamp, N-up, resize. */
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { PAGE_SIZES, type PageSizeName, type PdfBytes } from './types';
import { loadPdf, parsePageRanges } from './utils';

export interface TextWatermarkOptions {
  text: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  color?: { r: number; g: number; b: number };
}

/** Stamp a repeating diagonal text watermark across every page. */
export async function addTextWatermark(
  bytes: PdfBytes,
  options: TextWatermarkOptions,
): Promise<Uint8Array> {
  const { text, fontSize = 48, opacity = 0.25, rotation = 45, color } = options;
  const doc = await loadPdf(bytes, true);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const c = color ? rgb(color.r, color.g, color.b) : rgb(0.5, 0.5, 0.5);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: c,
      opacity,
      rotate: degrees(rotation),
    });
  }
  return doc.save();
}

/** Stamp an image watermark (PNG/JPEG) centered on every page. */
export async function addImageWatermark(
  bytes: PdfBytes,
  image: { bytes: Uint8Array; type: 'png' | 'jpg' },
  opacity = 0.3,
  scale = 0.5,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const embedded =
    image.type === 'png' ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    page.drawImage(embedded, {
      x: (width - w) / 2,
      y: (height - h) / 2,
      width: w,
      height: h,
      opacity,
    });
  }
  return doc.save();
}

export interface PageNumberOptions {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right';
  fontSize?: number;
  startAt?: number;
  /** Template; {n} = current number, {total} = page count. */
  format?: string;
  margin?: number;
}

/** Draw page numbers on every page. */
export async function addPageNumbers(
  bytes: PdfBytes,
  options: PageNumberOptions = {},
): Promise<Uint8Array> {
  const {
    position = 'bottom-center',
    fontSize = 11,
    startAt = 1,
    format = '{n} / {total}',
    margin = 28,
  } = options;
  const doc = await loadPdf(bytes, true);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, i) => {
    const label = format
      .replace('{n}', String(startAt + i))
      .replace('{total}', String(startAt + total - 1));
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const isTop = position.startsWith('top');
    const y = isTop ? height - margin : margin;
    let x = width / 2 - textWidth / 2;
    if (position.endsWith('right')) x = width - margin - textWidth;
    if (position.endsWith('left')) x = margin;
    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
  });

  return doc.save();
}

/** Add a header and/or footer line to every page. */
export async function addHeaderFooter(
  bytes: PdfBytes,
  options: { header?: string; footer?: string; fontSize?: number; margin?: number },
): Promise<Uint8Array> {
  const { header, footer, fontSize = 11, margin = 28 } = options;
  const doc = await loadPdf(bytes, true);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    if (header) {
      const tw = font.widthOfTextAtSize(header, fontSize);
      page.drawText(header, { x: (width - tw) / 2, y: height - margin, size: fontSize, font });
    }
    if (footer) {
      const tw = font.widthOfTextAtSize(footer, fontSize);
      page.drawText(footer, { x: (width - tw) / 2, y: margin, size: fontSize, font });
    }
  }
  return doc.save();
}

/** Crop pages to a margin box (points removed from each side). Empty ranges = all pages. */
export async function cropPages(
  bytes: PdfBytes,
  margins: { top: number; right: number; bottom: number; left: number },
  ranges = '',
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const targets = new Set(parsePageRanges(ranges, doc.getPageCount()));
  doc.getPages().forEach((page, i) => {
    if (!targets.has(i)) return;
    const { width, height } = page.getSize();
    const x = margins.left;
    const y = margins.bottom;
    const w = Math.max(1, width - margins.left - margins.right);
    const h = Math.max(1, height - margins.top - margins.bottom);
    page.setCropBox(x, y, w, h);
    page.setMediaBox(x, y, w, h);
  });
  return doc.save();
}

/** Overlay (stamp) every page of `stampBytes` onto the matching page of `baseBytes`. */
export async function stampPdf(
  baseBytes: PdfBytes,
  stampBytes: PdfBytes,
  opacity = 1,
): Promise<Uint8Array> {
  const base = await loadPdf(baseBytes, true);
  const stampDoc = await loadPdf(stampBytes, true);
  const embedded = await base.embedPdf(stampDoc, stampDoc.getPageIndices());
  base.getPages().forEach((page, i) => {
    const stamp = embedded[Math.min(i, embedded.length - 1)];
    if (!stamp) return;
    const { width, height } = page.getSize();
    page.drawPage(stamp, { x: 0, y: 0, width, height, opacity });
  });
  return base.save();
}

/** Arrange N source pages onto one sheet (e.g. 2-up, 4-up). */
export async function nUpPages(
  bytes: PdfBytes,
  perSheet: 2 | 4 | 6 | 8 | 9 | 16,
  pageSize: PageSizeName = 'A4',
): Promise<Uint8Array> {
  const src = await loadPdf(bytes, true);
  const out = await PDFDocument.create();
  const embedded = await out.embedPdf(src, src.getPageIndices());
  const cols = perSheet <= 2 ? 1 : perSheet <= 6 ? 2 : perSheet <= 9 ? 3 : 4;
  const rows = Math.ceil(perSheet / cols);
  const [sheetW, sheetH] = PAGE_SIZES[pageSize];

  for (let i = 0; i < embedded.length; i += perSheet) {
    const page = out.addPage([sheetW, sheetH]);
    const cellW = sheetW / cols;
    const cellH = sheetH / rows;
    for (let slot = 0; slot < perSheet && i + slot < embedded.length; slot++) {
      const item = embedded[i + slot];
      if (!item) continue;
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const scale = Math.min(cellW / item.width, cellH / item.height) * 0.95;
      const drawW = item.width * scale;
      const drawH = item.height * scale;
      const x = col * cellW + (cellW - drawW) / 2;
      const y = sheetH - (row + 1) * cellH + (cellH - drawH) / 2;
      page.drawPage(item, { x, y, width: drawW, height: drawH });
    }
  }
  return out.save();
}

/** Scale every page to a target page size, centering content. */
export async function resizePages(bytes: PdfBytes, pageSize: PageSizeName): Promise<Uint8Array> {
  const src = await loadPdf(bytes, true);
  const out = await PDFDocument.create();
  const embedded = await out.embedPdf(src, src.getPageIndices());
  const [targetW, targetH] = PAGE_SIZES[pageSize];
  for (const item of embedded) {
    const page = out.addPage([targetW, targetH]);
    const scale = Math.min(targetW / item.width, targetH / item.height);
    const drawW = item.width * scale;
    const drawH = item.height * scale;
    page.drawPage(item, {
      x: (targetW - drawW) / 2,
      y: (targetH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }
  return out.save();
}
