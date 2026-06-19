/** Image <-> PDF conversion that relies only on pdf-lib (worker/Node-safe). */
import { PDFDocument } from 'pdf-lib';
import { PAGE_SIZES, type PageSizeName } from './types';

export interface ImageInput {
  bytes: Uint8Array;
  /** Only 'jpg' and 'png' embed natively; other formats must be pre-converted to PNG. */
  type: 'jpg' | 'png';
}

export interface ImagesToPdfOptions {
  /** Page size; 'fit' makes each page exactly the image size. */
  pageSize?: PageSizeName | 'fit';
  orientation?: 'portrait' | 'landscape';
  /** Margin in points applied around images on fixed-size pages. */
  margin?: number;
}

/** Combine images into a single PDF, one image per page. */
export async function imagesToPdf(
  images: ImageInput[],
  options: ImagesToPdfOptions = {},
): Promise<Uint8Array> {
  if (images.length === 0) throw new Error('No images provided.');
  const { pageSize = 'fit', orientation = 'portrait', margin = 0 } = options;
  const doc = await PDFDocument.create();

  for (const image of images) {
    const embedded =
      image.type === 'jpg' ? await doc.embedJpg(image.bytes) : await doc.embedPng(image.bytes);

    if (pageSize === 'fit') {
      const page = doc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      continue;
    }

    const sized = PAGE_SIZES[pageSize];
    let w: number = sized[0];
    let h: number = sized[1];
    if (orientation === 'landscape') [w, h] = [h, w];
    const page = doc.addPage([w, h]);
    const maxW = w - margin * 2;
    const maxH = h - margin * 2;
    const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
    const drawW = embedded.width * scale;
    const drawH = embedded.height * scale;
    page.drawImage(embedded, {
      x: (w - drawW) / 2,
      y: (h - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  return doc.save();
}
