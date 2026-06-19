/** Client for the backend job API used by server-side (heavy) tools. */
'use client';

import type { OptionValues, ResultFile } from './tools/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8080';

interface JobStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  resultName?: string;
  resultMime?: string;
}

/**
 * Upload files to a backend conversion endpoint, wait for the job to finish,
 * and return the resulting file(s).
 *
 * @param endpoint  Backend tool route, e.g. "office-to-pdf" or "ocr".
 */
export async function processOnServer(
  endpoint: string,
  files: File[],
  options: OptionValues,
  onProgress?: (fraction: number, message?: string) => void,
): Promise<ResultFile[]> {
  const form = new FormData();
  files.forEach((file) => form.append('files', file, file.name));
  form.append('options', JSON.stringify(options));

  const createRes = await fetch(`${API_URL}/jobs/${endpoint}`, { method: 'POST', body: form });
  if (!createRes.ok) {
    throw new Error(`Backend rejected the job (${createRes.status}). Is the API running?`);
  }
  const { id } = (await createRes.json()) as { id: string };

  // Poll for completion.
  const status = await pollJob(id, onProgress);
  if (status.state === 'failed') {
    throw new Error(status.error || 'Server processing failed.');
  }

  const resultRes = await fetch(`${API_URL}/jobs/${id}/result`);
  if (!resultRes.ok) throw new Error('Failed to download result from backend.');
  const blob = await resultRes.blob();
  return [{ filename: status.resultName || 'result', blob }];
}

async function pollJob(
  id: string,
  onProgress?: (fraction: number, message?: string) => void,
): Promise<JobStatus> {
  const start = Date.now();
  const timeoutMs = 5 * 60 * 1000;
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${API_URL}/jobs/${id}`);
    if (!res.ok) throw new Error('Lost connection to backend job.');
    const status = (await res.json()) as JobStatus;
    if (typeof status.progress === 'number') onProgress?.(status.progress, status.state);
    if (status.state === 'completed' || status.state === 'failed') return status;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Server job timed out.');
}

/** Whether a backend URL is configured/healthy (used to gate server tools in the UI). */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
