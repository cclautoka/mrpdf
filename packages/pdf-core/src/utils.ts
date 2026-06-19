/** Generic helpers shared by the PDF tools. */
import { PDFDocument } from 'pdf-lib';
import type { PdfBytes } from './types';

/**
 * Parse a human page-range string (1-based, inclusive) into a sorted, de-duplicated
 * list of 0-based page indices.
 *
 * Examples: "1-3, 5, 8-10" -> [0,1,2,4,7,8,9]
 *
 * @param input  Range expression. Empty string means "all pages".
 * @param pageCount Total number of pages, used to clamp ranges and resolve "all".
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const indices = new Set<number>();
  for (const part of trimmed.split(',')) {
    const segment = part.trim();
    if (!segment) continue;

    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const [lo, hi] = start <= end ? [start, end] : [end, start];
      for (let p = lo; p <= hi; p++) addIndex(indices, p, pageCount);
    } else if (/^\d+$/.test(segment)) {
      addIndex(indices, Number(segment), pageCount);
    } else {
      throw new Error(`Invalid page range segment: "${segment}"`);
    }
  }

  return [...indices].sort((a, b) => a - b);
}

function addIndex(set: Set<number>, oneBased: number, pageCount: number): void {
  const idx = oneBased - 1;
  if (idx >= 0 && idx < pageCount) set.add(idx);
}

/** Load a PDF document from bytes. `ignoreEncryption` lets us inspect protected files. */
export async function loadPdf(bytes: PdfBytes, ignoreEncryption = false): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption });
}

/** Ensure a value is a Uint8Array (accepts ArrayBuffer for convenience). */
export function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/** Strip any directory/extension and return a safe base name for output files. */
export function baseName(filename: string): string {
  const noPath = filename.split(/[\\/]/).pop() ?? filename;
  return noPath.replace(/\.[^.]+$/, '');
}
