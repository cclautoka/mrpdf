/**
 * Web Worker entry point. Runs DOM-free pdf-lib operations off the main thread
 * so the UI stays responsive on large documents.
 */
/// <reference lib="webworker" />
import * as organize from '../organize';
import * as images from '../images';
import * as text from '../text';
import * as edit from '../edit';
import * as metadata from '../metadata';
import * as forms from '../forms';
import * as outline from '../outline';
import * as overlay from '../overlay';
import type { WorkerOp, WorkerRequest, WorkerResponse } from './protocol';

type Handler = (...args: never[]) => Promise<unknown> | unknown;

const handlers: Record<WorkerOp, Handler> = {
  merge: organize.mergePdfs,
  split: organize.splitPdf,
  extractPages: organize.extractPages,
  removePages: organize.removePages,
  reorderPages: organize.reorderPages,
  rebuildPages: organize.rebuildPages,
  rotatePages: organize.rotatePages,
  insertBlankPages: organize.insertBlankPages,
  imagesToPdf: images.imagesToPdf,
  textToPdf: text.textToPdf,
  addTextWatermark: edit.addTextWatermark,
  addImageWatermark: edit.addImageWatermark,
  addPageNumbers: edit.addPageNumbers,
  addHeaderFooter: edit.addHeaderFooter,
  cropPages: edit.cropPages,
  stampPdf: edit.stampPdf,
  nUpPages: edit.nUpPages,
  resizePages: edit.resizePages,
  getInfo: metadata.getInfo,
  setMetadata: metadata.setMetadata,
  clearMetadata: metadata.clearMetadata,
  getFormFields: forms.getFormFields,
  fillForm: forms.fillForm,
  flattenForm: forms.flattenForm,
  setOutline: outline.setOutline,
  generatePerPageBookmarks: outline.generatePerPageBookmarks,
  applyOverlay: overlay.applyOverlay,
} as Record<WorkerOp, Handler>;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, op, args } = event.data;
  try {
    const handler = handlers[op];
    if (!handler) throw new Error(`Unknown worker op: ${op}`);
    const result = await handler(...(args as never[]));
    const response: WorkerResponse = { id, ok: true, result };
    // Transfer any ArrayBuffers in the result for zero-copy hand-back.
    (self as unknown as Worker).postMessage(response, collectTransferables(result));
  } catch (error) {
    const response: WorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    (self as unknown as Worker).postMessage(response);
  }
};

/** Find ArrayBuffers in common result shapes so they can be transferred. */
function collectTransferables(result: unknown): Transferable[] {
  if (result instanceof Uint8Array) return [result.buffer];
  if (Array.isArray(result)) {
    return result.flatMap((item) =>
      item && typeof item === 'object' && 'bytes' in item && item.bytes instanceof Uint8Array
        ? [item.bytes.buffer]
        : [],
    );
  }
  return [];
}
