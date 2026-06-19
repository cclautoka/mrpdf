/** Backend configuration sourced from environment variables. */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || '0.0.0.0',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  /** Allowed CORS origin (the web app). */
  corsOrigin: process.env.CORS_ORIGIN || '*',
  /** Root directory for per-job temporary files. */
  storageDir: process.env.STORAGE_DIR || join(here, '..', 'storage'),
  /** How long to keep job files before purging (ms). */
  jobTtlMs: Number(process.env.JOB_TTL_MS || 60 * 60 * 1000),
  /** Max upload size in bytes. */
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 200 * 1024 * 1024),
  /** Run the queue worker in the same process as the HTTP server. */
  inlineWorker: process.env.INLINE_WORKER !== 'false',
};
