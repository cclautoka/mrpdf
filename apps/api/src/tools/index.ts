/** Registry mapping job endpoints to their backend runners. */
import { htmlToPdf, markdownToPdf, urlToPdf } from './browser.js';
import { epubToPdf, officeToPdf, pdfToExcel, pdfToPowerpoint, pdfToWord } from './office.js';
import { pdfToHtml, pdfToMarkdown } from './pdf-export.js';
import { compress, linearize, ocr, pdfToPdfa, repair } from './optimize.js';
import { protect, sign, unlock } from './security.js';
import type { Runner } from './types.js';

export const runners: Record<string, Runner> = {
  // Convert to PDF
  'office-to-pdf': officeToPdf,
  'epub-to-pdf': epubToPdf,
  'html-to-pdf': htmlToPdf,
  'url-to-pdf': urlToPdf,
  'markdown-to-pdf': markdownToPdf,
  // Convert from PDF
  'pdf-to-word': pdfToWord,
  'pdf-to-powerpoint': pdfToPowerpoint,
  'pdf-to-excel': pdfToExcel,
  'pdf-to-html': pdfToHtml,
  'pdf-to-markdown': pdfToMarkdown,
  'pdf-to-pdfa': pdfToPdfa,
  // Optimize
  compress,
  repair,
  ocr,
  linearize,
  // Security
  protect,
  unlock,
  sign,
};

/** Endpoints that do not require an uploaded file (input comes from options). */
export const fileOptionalEndpoints = new Set(['url-to-pdf']);

export function getRunner(endpoint: string): Runner | undefined {
  return runners[endpoint];
}
