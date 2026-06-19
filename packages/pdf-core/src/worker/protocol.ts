/** Message protocol shared between the Web Worker and its client. */

/** Operations the worker can run (all pdf-lib based, i.e. DOM-free). */
export type WorkerOp =
  | 'merge'
  | 'split'
  | 'extractPages'
  | 'removePages'
  | 'reorderPages'
  | 'rebuildPages'
  | 'rotatePages'
  | 'insertBlankPages'
  | 'imagesToPdf'
  | 'textToPdf'
  | 'addTextWatermark'
  | 'addImageWatermark'
  | 'addPageNumbers'
  | 'addHeaderFooter'
  | 'cropPages'
  | 'stampPdf'
  | 'nUpPages'
  | 'resizePages'
  | 'getInfo'
  | 'setMetadata'
  | 'clearMetadata'
  | 'getFormFields'
  | 'fillForm'
  | 'flattenForm'
  | 'setOutline'
  | 'generatePerPageBookmarks'
  | 'applyOverlay';

export interface WorkerRequest {
  id: number;
  op: WorkerOp;
  // Arguments are op-specific; validated inside each handler.
  args: unknown[];
}

export interface WorkerSuccess {
  id: number;
  ok: true;
  result: unknown;
}

export interface WorkerFailure {
  id: number;
  ok: false;
  error: string;
}

export type WorkerResponse = WorkerSuccess | WorkerFailure;
