/** Optimize-category tools (server-backed: compress, repair, OCR, linearize). */
import { serverTool } from './server';
import type { ToolDefinition } from './types';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

export const optimizeTools: ToolDefinition[] = [
  serverTool({
    slug: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce file size by downsampling images and optimizing streams (Ghostscript).',
    category: 'optimize',
    icon: 'Minimize2',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'level',
        label: 'Compression level',
        default: 'ebook',
        options: [
          { value: 'screen', label: 'Maximum (72 DPI)' },
          { value: 'ebook', label: 'Recommended (150 DPI)' },
          { value: 'printer', label: 'Light (300 DPI)' },
        ],
      },
    ],
    endpoint: 'compress',
  }),
  serverTool({
    slug: 'repair-pdf',
    name: 'Repair PDF',
    description: 'Attempt to recover a damaged or corrupted PDF (qpdf/Ghostscript).',
    category: 'optimize',
    icon: 'Wrench',
    accept: PDF_ACCEPT,
    multiple: false,
    endpoint: 'repair',
  }),
  serverTool({
    slug: 'ocr-pdf',
    name: 'OCR PDF',
    description: 'Make scanned PDFs searchable and selectable (OCRmyPDF + Tesseract).',
    category: 'optimize',
    icon: 'ScanText',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'language',
        label: 'Language',
        default: 'eng',
        options: [
          { value: 'eng', label: 'English' },
          { value: 'fra', label: 'French' },
          { value: 'deu', label: 'German' },
          { value: 'spa', label: 'Spanish' },
          { value: 'ita', label: 'Italian' },
          { value: 'por', label: 'Portuguese' },
          { value: 'ara', label: 'Arabic' },
          { value: 'chi_sim', label: 'Chinese (Simplified)' },
        ],
      },
      { kind: 'checkbox', key: 'deskew', label: 'Deskew pages', default: true },
    ],
    endpoint: 'ocr',
  }),
  serverTool({
    slug: 'linearize-pdf',
    name: 'Web-Optimize (Linearize)',
    description: 'Linearize for fast web view ("fast web view" / qpdf).',
    category: 'optimize',
    icon: 'Gauge',
    accept: PDF_ACCEPT,
    multiple: false,
    endpoint: 'linearize',
  }),
];
