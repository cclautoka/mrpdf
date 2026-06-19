/** LibreOffice-powered conversions (Office <-> PDF, ODF, EPUB). */
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { run } from '../exec.js';
import { mimeFor, stem } from './util.js';
import type { Runner } from './types.js';

/**
 * Convert an input document to the target format using headless LibreOffice.
 * A private user profile dir avoids clashes between concurrent conversions.
 */
async function libreConvert(
  input: string,
  outputDir: string,
  targetExt: string,
  filter?: string,
): Promise<string> {
  const convertArg = filter ? `${targetExt}:${filter}` : targetExt;
  await run(
    'soffice',
    [
      '--headless',
      '--norestore',
      `-env:UserInstallation=file://${join(outputDir, '.lo-profile')}`,
      '--convert-to',
      convertArg,
      '--outdir',
      outputDir,
      input,
    ],
    { timeoutMs: 120_000 },
  );
  return join(outputDir, `${stem(input)}.${targetExt}`);
}

/** Any office/ODF/EPUB document -> PDF. */
export const officeToPdf: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const path = await libreConvert(input, outputDir, 'pdf');
  return { path, name: `${stem(input)}.pdf`, mime: 'application/pdf' };
};

/** EPUB -> PDF (LibreOffice handles EPUB import). */
export const epubToPdf: Runner = officeToPdf;

/** Build a PDF -> office runner for a given target extension and import filter. */
function pdfToOffice(targetExt: 'docx' | 'pptx' | 'xlsx'): Runner {
  return async ({ inputFiles, outputDir }) => {
    const input = inputFiles[0]!;
    const path = await libreConvert(input, outputDir, targetExt);
    return { path, name: `${stem(input)}.${targetExt}`, mime: mimeFor(targetExt) };
  };
}

export const pdfToWord: Runner = pdfToOffice('docx');
export const pdfToPowerpoint: Runner = pdfToOffice('pptx');
export const pdfToExcel: Runner = pdfToOffice('xlsx');

/** PDF -> HTML via LibreOffice (kept here to reuse the conversion helper). */
export const pdfToHtmlOffice: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const produced = await libreConvert(input, outputDir, 'html');
  const finalPath = join(outputDir, `${stem(input)}.html`);
  if (produced !== finalPath) await rename(produced, finalPath).catch(() => undefined);
  return { path: finalPath, name: `${stem(input)}.html`, mime: 'text/html' };
};
