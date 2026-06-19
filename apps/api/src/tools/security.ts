/** Security runners: password protect, unlock, and digital signing. */
import { join } from 'node:path';
import { run } from '../exec.js';
import { stem } from './util.js';
import type { Runner } from './types.js';

/** Encrypt a PDF with a password (AES-256) via qpdf. */
export const protect: Runner = async ({ inputFiles, outputDir, options }) => {
  const input = inputFiles[0]!;
  const password = String(options.password || '');
  if (!password) throw new Error('A password is required.');
  const target = join(outputDir, `${stem(input)}-protected.pdf`);
  await run('qpdf', ['--encrypt', password, password, '256', '--', input, target], {
    timeoutMs: 60_000,
  });
  return { path: target, name: `${stem(input)}-protected.pdf`, mime: 'application/pdf' };
};

/** Remove a known password from a PDF via qpdf. */
export const unlock: Runner = async ({ inputFiles, outputDir, options }) => {
  const input = inputFiles[0]!;
  const password = String(options.password || '');
  const target = join(outputDir, `${stem(input)}-unlocked.pdf`);
  await run('qpdf', [`--password=${password}`, '--decrypt', input, target], { timeoutMs: 60_000 });
  return { path: target, name: `${stem(input)}-unlocked.pdf`, mime: 'application/pdf' };
};

/**
 * Apply a certificate-based digital signature using JSignPdf.
 * Expects the PDF as the first input and a .p12/.pfx certificate as the second.
 */
export const sign: Runner = async ({ inputFiles, outputDir, options }) => {
  const input = inputFiles[0]!;
  const cert = inputFiles[1];
  if (!cert) throw new Error('A .p12/.pfx certificate file is required.');
  const password = String(options.password || '');
  await run(
    'jsignpdf',
    ['-kst', 'PKCS12', '-ksf', cert, '-ksp', password, '-d', outputDir, input],
    { timeoutMs: 120_000 },
  );
  // JSignPdf writes "<name>_signed.pdf".
  const name = `${stem(input)}_signed.pdf`;
  return { path: join(outputDir, name), name, mime: 'application/pdf' };
};
