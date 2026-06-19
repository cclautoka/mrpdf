/** Optimization runners: compress, repair, OCR, linearize, PDF/A. */
import { join } from 'node:path';
import { run } from '../exec.js';
import { stem } from './util.js';
import type { Runner } from './types.js';

const GS_QUALITY: Record<string, string> = {
  screen: '/screen',
  ebook: '/ebook',
  printer: '/printer',
};

/** Compress a PDF with Ghostscript downsampling presets. */
export const compress: Runner = async ({ inputFiles, outputDir, options }) => {
  const input = inputFiles[0]!;
  const target = join(outputDir, `${stem(input)}-compressed.pdf`);
  const quality = GS_QUALITY[String(options.level || 'ebook')] || '/ebook';
  await run(
    'gs',
    [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.5',
      `-dPDFSETTINGS=${quality}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${target}`,
      input,
    ],
    { timeoutMs: 180_000 },
  );
  return { path: target, name: `${stem(input)}-compressed.pdf`, mime: 'application/pdf' };
};

/** Rewrite a damaged PDF through Ghostscript to recover it. */
export const repair: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const target = join(outputDir, `${stem(input)}-repaired.pdf`);
  await run(
    'gs',
    ['-sDEVICE=pdfwrite', '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${target}`, input],
    { timeoutMs: 180_000 },
  );
  return { path: target, name: `${stem(input)}-repaired.pdf`, mime: 'application/pdf' };
};

/** Make a scanned PDF searchable with OCRmyPDF. */
export const ocr: Runner = async ({ inputFiles, outputDir, options }) => {
  const input = inputFiles[0]!;
  const target = join(outputDir, `${stem(input)}-ocr.pdf`);
  const args = ['-l', String(options.language || 'eng'), '--skip-text'];
  if (options.deskew) args.push('--deskew');
  args.push(input, target);
  await run('ocrmypdf', args, { timeoutMs: 300_000 });
  return { path: target, name: `${stem(input)}-ocr.pdf`, mime: 'application/pdf' };
};

/** Linearize a PDF for fast web view with qpdf. */
export const linearize: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const target = join(outputDir, `${stem(input)}-web.pdf`);
  await run('qpdf', ['--linearize', input, target], { timeoutMs: 120_000 });
  return { path: target, name: `${stem(input)}-web.pdf`, mime: 'application/pdf' };
};

/** Convert a PDF to the PDF/A archival standard via Ghostscript. */
export const pdfToPdfa: Runner = async ({ inputFiles, outputDir, options }) => {
  const input = inputFiles[0]!;
  const level = String(options.level || '2');
  const target = join(outputDir, `${stem(input)}-pdfa.pdf`);
  await run(
    'gs',
    [
      '-dPDFA=' + level,
      '-dBATCH',
      '-dNOPAUSE',
      '-dQUIET',
      '-sColorConversionStrategy=UseDeviceIndependentColor',
      '-sDEVICE=pdfwrite',
      '-dPDFACompatibilityPolicy=1',
      `-sOutputFile=${target}`,
      input,
    ],
    { timeoutMs: 180_000 },
  );
  return { path: target, name: `${stem(input)}-pdfa.pdf`, mime: 'application/pdf' };
};
