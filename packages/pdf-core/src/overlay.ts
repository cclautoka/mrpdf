/**
 * Burn vector overlay elements (text, rectangles, freehand lines, images) into a
 * PDF. Coordinates are expressed in PDF points with a top-left origin to match
 * how the browser editor positions elements; this module flips the Y axis.
 */
import { StandardFonts, rgb } from 'pdf-lib';
import type { PdfBytes } from './types';
import { loadPdf } from './utils';

export interface Color {
  r: number;
  g: number;
  b: number;
}

export type OverlayElement =
  | { type: 'text'; page: number; x: number; y: number; size: number; color: Color; text: string }
  | {
      type: 'rect';
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      color: Color;
      opacity: number;
    }
  | { type: 'line'; page: number; points: { x: number; y: number }[]; color: Color; width: number }
  | {
      type: 'image';
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      pngBytes: Uint8Array;
    };

/** Apply overlay elements (top-left origin coordinates in points) to a PDF. */
export async function applyOverlay(
  bytes: PdfBytes,
  elements: OverlayElement[],
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const el of elements) {
    const page = pages[el.page];
    if (!page) continue;
    const h = page.getSize().height;

    if (el.type === 'text') {
      const c = rgb(el.color.r, el.color.g, el.color.b);
      el.text.split('\n').forEach((line, i) => {
        page.drawText(line, {
          x: el.x,
          y: h - el.y - el.size - i * el.size * 1.2,
          size: el.size,
          font,
          color: c,
        });
      });
    } else if (el.type === 'rect') {
      page.drawRectangle({
        x: el.x,
        y: h - el.y - el.height,
        width: el.width,
        height: el.height,
        color: rgb(el.color.r, el.color.g, el.color.b),
        opacity: el.opacity,
      });
    } else if (el.type === 'line') {
      const c = rgb(el.color.r, el.color.g, el.color.b);
      for (let i = 1; i < el.points.length; i++) {
        const a = el.points[i - 1]!;
        const b = el.points[i]!;
        page.drawLine({
          start: { x: a.x, y: h - a.y },
          end: { x: b.x, y: h - b.y },
          thickness: el.width,
          color: c,
        });
      }
    } else if (el.type === 'image') {
      const png = await doc.embedPng(el.pngBytes);
      page.drawImage(png, {
        x: el.x,
        y: h - el.y - el.height,
        width: el.width,
        height: el.height,
      });
    }
  }

  return doc.save();
}
