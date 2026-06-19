/** Per-job temporary file storage with periodic purging. */
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config.js';

/** Absolute path to a job's working directory. */
export function jobDir(jobId: string): string {
  return join(config.storageDir, jobId);
}

/** Create (and return) directories for a job's input and output files. */
export async function createJobDirs(
  jobId: string,
): Promise<{ root: string; input: string; output: string }> {
  const root = jobDir(jobId);
  const input = join(root, 'input');
  const output = join(root, 'output');
  await mkdir(input, { recursive: true });
  await mkdir(output, { recursive: true });
  return { root, input, output };
}

/** Delete a single job's files. */
export async function removeJob(jobId: string): Promise<void> {
  await rm(jobDir(jobId), { recursive: true, force: true });
}

/** Delete job directories older than the configured TTL. */
export async function purgeExpired(): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(config.storageDir);
  } catch {
    return;
  }
  const now = Date.now();
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(config.storageDir, entry);
      try {
        const info = await stat(path);
        if (now - info.mtimeMs > config.jobTtlMs) {
          await rm(path, { recursive: true, force: true });
        }
      } catch {
        // Ignore races where the directory disappeared.
      }
    }),
  );
}

/** Start a recurring purge timer; returns a stop function. */
export function startPurgeLoop(intervalMs = 10 * 60 * 1000): () => void {
  const timer = setInterval(() => void purgeExpired(), intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
