/**
 * Browser-only helpers that depend on the DOM (canvas) or pdf.js rendering.
 * These must run on the main thread or in a worker with OffscreenCanvas.
 */
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfBytes } from './types';

let workerConfigured = false;

/** Configure the pdf.js worker once (uses the bundler-resolved worker URL). */
function ensureWorker(): void {
  if (workerConfigured) return;
  // Bundlers (Next.js/webpack/turbopack) resolve this URL to the emitted worker chunk.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  workerConfigured = true;
}

/** Load a pdf.js document proxy from bytes. */
export async function loadPdfJs(bytes: PdfBytes): Promise<PDFDocumentProxy> {
  ensureWorker();
  // pdf.js transfers/detaches the buffer, so hand it a copy.
  const data = bytes.slice();
  return pdfjs.getDocument({ data, useSystemFonts: true }).promise;
}

/** Extract all text from a PDF, page by page, separated by form feeds. */
export async function pdfToText(bytes: PdfBytes): Promise<string> {
  const doc = await loadPdfJs(bytes);
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    parts.push(line);
  }
  await doc.destroy();
  return parts.join('\n\n\f\n\n');
}

export interface RenderOptions {
  /** Render scale. 1 = 72 DPI. Use ~2 for 144 DPI exports. */
  scale?: number;
  format?: 'image/png' | 'image/jpeg';
  quality?: number;
}

/** Render a single page to a Blob (browser main thread). */
export async function renderPageToBlob(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: RenderOptions = {},
): Promise<Blob> {
  const { scale = 2, format = 'image/png', quality = 0.92 } = options;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image.'))),
      format,
      quality,
    ),
  );
}

/** Render every page of a PDF to image Blobs. */
export async function pdfToImages(bytes: PdfBytes, options: RenderOptions = {}): Promise<Blob[]> {
  const doc = await loadPdfJs(bytes);
  const blobs: Blob[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    blobs.push(await renderPageToBlob(doc, i, options));
  }
  await doc.destroy();
  return blobs;
}

/** Normalize any browser-decodable image (webp/tiff/gif/bmp/...) into PNG bytes. */
export async function normalizeImageToPng(file: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed.'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/** Produce a small thumbnail data URL for the first page (for previews). */
export async function firstPageThumbnail(bytes: PdfBytes, scale = 0.5): Promise<string> {
  const doc = await loadPdfJs(bytes);
  const blob = await renderPageToBlob(doc, 1, { scale, format: 'image/jpeg', quality: 0.8 });
  await doc.destroy();
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Best-effort extraction of embedded raster images using pdf.js operator lists. */
export async function extractRasterImages(
  bytes: PdfBytes,
): Promise<{ name: string; blob: Blob }[]> {
  const doc = await loadPdfJs(bytes);
  const out: { name: string; blob: Blob }[] = [];
  const imageOps = new Set<number>([
    pdfjs.OPS.paintImageXObject,
    pdfjs.OPS.paintInlineImageXObject,
  ]);
  let counter = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    const seen = new Set<string>();
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (!imageOps.has(ops.fnArray[i]!)) continue;
      const name = ops.argsArray[i]?.[0];
      if (typeof name !== 'string' || seen.has(name)) continue;
      seen.add(name);
      try {
        const img = await getPdfObject(page, name);
        const blob = await imageObjectToBlob(img);
        if (blob) out.push({ name: `image-${String(++counter).padStart(3, '0')}.png`, blob });
      } catch {
        // Skip images that cannot be decoded (e.g. masks, unusual color spaces).
      }
    }
  }
  await doc.destroy();
  return out;
}

/** Resolve a pdf.js page object (image XObject) by name. */
function getPdfObject(page: import('pdfjs-dist').PDFPageProxy, name: string): Promise<unknown> {
  return new Promise((resolve) => {
    const objs = (
      page as unknown as { objs: { get(n: string, cb?: (v: unknown) => void): unknown } }
    ).objs;
    try {
      const value = objs.get(name);
      if (value) return resolve(value);
    } catch {
      // Not ready yet; fall through to callback form.
    }
    objs.get(name, resolve);
  });
}

/** Convert a pdf.js image object (ImageBitmap or RGBA buffer) into a PNG Blob. */
async function imageObjectToBlob(img: unknown): Promise<Blob | null> {
  const obj = img as {
    width?: number;
    height?: number;
    data?: Uint8ClampedArray;
    bitmap?: ImageBitmap;
  };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (obj.bitmap) {
    canvas.width = obj.bitmap.width;
    canvas.height = obj.bitmap.height;
    ctx.drawImage(obj.bitmap, 0, 0);
  } else if (obj.data && obj.width && obj.height) {
    canvas.width = obj.width;
    canvas.height = obj.height;
    const expected = obj.width * obj.height * 4;
    const rgba =
      obj.data.length === expected ? obj.data : rgbToRgba(obj.data, obj.width, obj.height);
    if (!rgba) return null;
    const imageData = ctx.createImageData(obj.width, obj.height);
    imageData.data.set(rgba);
    ctx.putImageData(imageData, 0, 0);
  } else {
    return null;
  }

  return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Expand a 3-channel RGB buffer to RGBA, returning null if the size is unexpected. */
function rgbToRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  if (data.length !== width * height * 3) return null;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    rgba[j] = data[i]!;
    rgba[j + 1] = data[i + 1]!;
    rgba[j + 2] = data[i + 2]!;
    rgba[j + 3] = 255;
  }
  return rgba;
}

/** Simple line-based text diff between two PDFs. */
export async function comparePdfsText(
  a: PdfBytes,
  b: PdfBytes,
): Promise<{ added: string[]; removed: string[]; equal: boolean }> {
  const [textA, textB] = await Promise.all([pdfToText(a), pdfToText(b)]);
  const linesA = textA.split(/\n/).map((l) => l.trim());
  const linesB = textB.split(/\n/).map((l) => l.trim());
  const setA = new Set(linesA);
  const setB = new Set(linesB);
  const removed = linesA.filter((l) => l && !setB.has(l));
  const added = linesB.filter((l) => l && !setA.has(l));
  return { added, removed, equal: removed.length === 0 && added.length === 0 };
}
