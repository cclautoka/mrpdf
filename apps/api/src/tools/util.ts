/** Shared helpers for backend runners. */
import { basename, extname, join } from 'node:path';

/** Strip the extension from a file path's base name. */
export function stem(path: string): string {
  return basename(path, extname(path));
}

/** Build an output path inside the job's output directory. */
export function outPath(outputDir: string, name: string): string {
  return join(outputDir, name);
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  html: 'text/html',
  md: 'text/markdown',
  txt: 'text/plain',
  zip: 'application/zip',
};

/** Map a file extension to a MIME type (defaults to octet-stream). */
export function mimeFor(ext: string): string {
  return MIME[ext.replace(/^\./, '').toLowerCase()] || 'application/octet-stream';
}
