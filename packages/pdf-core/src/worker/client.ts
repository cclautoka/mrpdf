/**
 * Typed client for the PDF Web Worker. Lazily spawns a single worker and
 * multiplexes requests over it with promise-based responses.
 */
import type { WorkerOp, WorkerRequest, WorkerResponse } from './protocol';

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

export class PdfWorkerClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private readonly factory: () => Worker;

  /**
   * @param factory Creates the underlying Worker. In Next.js this is typically
   *   `() => new Worker(new URL('@mr-pdf/pdf-core/worker', import.meta.url), { type: 'module' })`.
   */
  constructor(factory: () => Worker) {
    this.factory = factory;
  }

  private ensure(): Worker {
    if (this.worker) return this.worker;
    const worker = this.factory();
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id } = event.data;
      const entry = this.pending.get(id);
      if (!entry) return;
      this.pending.delete(id);
      if (event.data.ok) entry.resolve(event.data.result);
      else entry.reject(new Error(event.data.error));
    };
    worker.onerror = (err) => {
      const message = err.message || 'Worker crashed.';
      for (const { reject } of this.pending.values()) reject(new Error(message));
      this.pending.clear();
    };
    this.worker = worker;
    return worker;
  }

  /** Run an operation in the worker and resolve with its typed result. */
  run<T>(op: WorkerOp, args: unknown[], transfer: Transferable[] = []): Promise<T> {
    const worker = this.ensure();
    const id = this.nextId++;
    const request: WorkerRequest = { id, op, args };
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage(request, transfer);
    });
  }

  /** Terminate the worker and reject any in-flight requests. */
  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const { reject } of this.pending.values()) reject(new Error('Worker disposed.'));
    this.pending.clear();
  }
}
