/** LibreOffice-powered conversions (Office <-> PDF, ODF, EPUB). */
import { rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { run } from '../exec.js';
import { mimeFor, stem } from './util.js';
import type { Runner } from './types.js';

/** Throw a clear error if a conversion did not actually produce its output file. */
async function assertProduced(path: string, label: string): Promise<void> {
  const ok = await stat(path).then(
    (s) => s.isFile() && s.size > 0,
    () => false,
  );
  if (!ok) {
    throw new Error(`${label} did not produce an output file. The source file may be unsupported.`);
  }
}

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
  await assertProduced(path, 'Conversion to PDF');
  return { path, name: `${stem(input)}.pdf`, mime: 'application/pdf' };
};

/** EPUB -> PDF (LibreOffice handles EPUB import). */
export const epubToPdf: Runner = officeToPdf;

/**
 * PDF -> Word (.docx) via pdf2docx.
 *
 * LibreOffice cannot do this: it imports PDFs into a Draw document, which has
 * no Writer-format (docx) export, so `--convert-to docx` silently yields no
 * file. pdf2docx reconstructs an editable Word document from the PDF layout.
 */
export const pdfToWord: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const base = stem(input);
  const target = join(outputDir, `${base}.docx`);
  await run('pdf2docx', ['convert', input, target], { timeoutMs: 300_000 });
  await assertProduced(target, 'PDF to Word conversion');
  return { path: target, name: `${base}.docx`, mime: mimeFor('docx') };
};

/** Build a PDF -> office runner for a given target extension. */
function pdfToOffice(targetExt: 'pptx' | 'xlsx'): Runner {
  return async ({ inputFiles, outputDir }) => {
    const input = inputFiles[0]!;
    const path = await libreConvert(input, outputDir, targetExt);
    await assertProduced(path, `PDF to ${targetExt.toUpperCase()} conversion`);
    return { path, name: `${stem(input)}.${targetExt}`, mime: mimeFor(targetExt) };
  };
}

export const pdfToPowerpoint: Runner = pdfToOffice('pptx');
export const pdfToExcel: Runner = pdfToOffice('xlsx');

/** PDF -> HTML via LibreOffice (kept here to reuse the conversion helper). */
export const pdfToHtmlOffice: Runner = async ({ inputFiles, outputDir }) => {
  const input = inputFiles[0]!;
  const produced = await libreConvert(input, outputDir, 'html');
  const finalPath = join(outputDir, `${stem(input)}.html`);
  if (produced !== finalPath) await rename(produced, finalPath).catch(() => undefined);
  await assertProduced(finalPath, 'PDF to HTML conversion');
  return { path: finalPath, name: `${stem(input)}.html`, mime: 'text/html' };
};
