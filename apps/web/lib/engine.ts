/** Client-side execution helpers: a shared Web Worker plus file utilities. */
'use client';

import { PdfWorkerClient, type WorkerOp } from '@mr-pdf/pdf-core';

let client: PdfWorkerClient | null = null;

/** Lazily create the single shared PDF worker (browser only). */
export function getWorker(): PdfWorkerClient {
  if (!client) {
    client = new PdfWorkerClient(
      () =>
        new Worker(new URL('@mr-pdf/pdf-core/worker', import.meta.url), {
          type: 'module',
        }),
    );
  }
  return client;
}

/** Run a worker op with the shared worker. */
export function runOp<T>(op: WorkerOp, args: unknown[]): Promise<T> {
  return getWorker().run<T>(op, args);
}

/** Read a File/Blob into a Uint8Array. */
export async function fileToBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Wrap bytes in a Blob with the given mime type. */
export function bytesToBlob(bytes: Uint8Array, mimeType = 'application/pdf'): Blob {
  return new Blob([bytes as BlobPart], { type: mimeType });
}

/** Detect a pdf-lib image embed type from a file. Returns null if unsupported natively. */
export function nativeImageType(file: File): 'jpg' | 'png' | null {
  const type = file.type.toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('png')) return 'png';
  return null;
}

/** Build an output filename by swapping the extension of a source name. */
export function withExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return `${base}.${ext.replace(/^\./, '')}`;
}
