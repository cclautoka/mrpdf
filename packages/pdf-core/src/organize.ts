/** Page-organization tools: merge, split, extract, remove, reorder, rotate, insert. */
import { PDFDocument, degrees } from 'pdf-lib';
import type { NamedFile, PdfBytes, Rotation } from './types';
import { loadPdf, parsePageRanges } from './utils';

/** Merge multiple PDFs into one, preserving order. */
export async function mergePdfs(files: NamedFile[]): Promise<Uint8Array> {
  if (files.length === 0) throw new Error('No files to merge.');
  const out = await PDFDocument.create();
  for (const file of files) {
    const src = await loadPdf(file.bytes, true);
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((page) => out.addPage(page));
  }
  return out.save();
}

/** Result of a split: one or more named output documents. */
export interface SplitResult {
  name: string;
  bytes: Uint8Array;
}

/**
 * Split a PDF into separate documents.
 *
 * - mode "ranges": one output per comma-separated range (e.g. "1-3, 4-6").
 * - mode "every": a new document every N pages.
 * - mode "each": one document per page.
 */
export async function splitPdf(
  bytes: PdfBytes,
  options:
    | { mode: 'ranges'; ranges: string }
    | { mode: 'every'; pagesPer: number }
    | { mode: 'each' },
): Promise<SplitResult[]> {
  const src = await loadPdf(bytes, true);
  const pageCount = src.getPageCount();
  const groups: number[][] = [];

  if (options.mode === 'ranges') {
    for (const part of options.ranges.split(',')) {
      const seg = part.trim();
      if (seg) groups.push(parsePageRanges(seg, pageCount));
    }
  } else if (options.mode === 'every') {
    const per = Math.max(1, Math.floor(options.pagesPer));
    for (let i = 0; i < pageCount; i += per) {
      groups.push(Array.from({ length: Math.min(per, pageCount - i) }, (_, k) => i + k));
    }
  } else {
    for (let i = 0; i < pageCount; i++) groups.push([i]);
  }

  const results: SplitResult[] = [];
  for (let g = 0; g < groups.length; g++) {
    const indices = groups[g];
    if (!indices || indices.length === 0) continue;
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
    results.push({ name: `part-${g + 1}.pdf`, bytes: await out.save() });
  }
  return results;
}

/** Extract the given pages (1-based range string) into a single new PDF. */
export async function extractPages(bytes: PdfBytes, ranges: string): Promise<Uint8Array> {
  const src = await loadPdf(bytes, true);
  const indices = parsePageRanges(ranges, src.getPageCount());
  if (indices.length === 0) throw new Error('No pages selected.');
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

/** Remove the given pages (1-based range string), keeping the rest. */
export async function removePages(bytes: PdfBytes, ranges: string): Promise<Uint8Array> {
  const src = await loadPdf(bytes, true);
  const remove = new Set(parsePageRanges(ranges, src.getPageCount()));
  const keep = src.getPageIndices().filter((i) => !remove.has(i));
  if (keep.length === 0) throw new Error('Cannot remove every page.');
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, keep);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

/** Reorder pages to an explicit 0-based order. The order must cover all pages exactly once. */
export async function reorderPages(bytes: PdfBytes, order: number[]): Promise<Uint8Array> {
  const src = await loadPdf(bytes, true);
  const pageCount = src.getPageCount();
  if (order.length !== pageCount || new Set(order).size !== pageCount) {
    throw new Error('Order must be a permutation of all pages.');
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

/** Rotate pages by a relative amount. Empty `ranges` rotates all pages. */
export async function rotatePages(
  bytes: PdfBytes,
  rotation: Rotation,
  ranges = '',
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const targets = new Set(parsePageRanges(ranges, doc.getPageCount()));
  doc.getPages().forEach((page, i) => {
    if (!targets.has(i)) return;
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + rotation) % 360));
  });
  return doc.save();
}

/**
 * Rebuild a document from an explicit list of page operations. Each entry selects
 * a source page (0-based) and an absolute rotation. This powers the visual page
 * organizer (reorder + rotate + delete in a single pass).
 */
export async function rebuildPages(
  bytes: PdfBytes,
  ops: { index: number; rotation: Rotation }[],
): Promise<Uint8Array> {
  const src = await loadPdf(bytes, true);
  if (ops.length === 0) throw new Error('No pages selected.');
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    ops.map((o) => o.index),
  );
  copied.forEach((page, i) => {
    const op = ops[i]!;
    const base = page.getRotation().angle;
    page.setRotation(degrees((base + op.rotation) % 360));
    out.addPage(page);
  });
  return out.save();
}

/** Insert blank pages at a 1-based position. Size defaults to the first existing page. */
export async function insertBlankPages(
  bytes: PdfBytes,
  position: number,
  count = 1,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const first = doc.getPage(0);
  const { width, height } = first.getSize();
  const insertAt = Math.max(0, Math.min(position - 1, doc.getPageCount()));
  for (let i = 0; i < count; i++) {
    doc.insertPage(insertAt + i, [width, height]);
  }
  return doc.save();
}
