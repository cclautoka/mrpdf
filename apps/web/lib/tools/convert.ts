/** Conversion tools: images/text/office <-> PDF and PDF -> images/text/office. */
import { normalizeImageToPng, pdfToImages, pdfToText, type ImageInput } from '@mr-pdf/pdf-core';
import JSZip from 'jszip';
import { bytesToBlob, fileToBytes, nativeImageType, runOp, withExtension } from '../engine';
import { serverTool } from './server';
import type { ToolDefinition } from './types';

/** Convert any uploaded image into an ImageInput (PNG/JPEG) the worker can embed. */
async function toImageInput(file: File): Promise<ImageInput> {
  const native = nativeImageType(file);
  if (native) return { bytes: await fileToBytes(file), type: native };
  // webp/tiff/gif/bmp -> normalize to PNG via canvas.
  return { bytes: await normalizeImageToPng(file), type: 'png' };
}

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

export const convertTools: ToolDefinition[] = [
  // ---- TO PDF (client) ----
  {
    slug: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG, WebP, GIF, or TIFF images into a single PDF.',
    category: 'convert',
    icon: 'Image',
    execution: 'client',
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.bmp'] },
    multiple: true,
    options: [
      {
        kind: 'select',
        key: 'pageSize',
        label: 'Page size',
        default: 'fit',
        options: [
          { value: 'fit', label: 'Fit to image' },
          { value: 'A4', label: 'A4' },
          { value: 'Letter', label: 'Letter' },
        ],
      },
      {
        kind: 'select',
        key: 'orientation',
        label: 'Orientation',
        default: 'portrait',
        options: [
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' },
        ],
      },
      { kind: 'number', key: 'margin', label: 'Margin (pt)', min: 0, default: 0 },
    ],
    async run({ files, options, onProgress }) {
      const inputs: ImageInput[] = [];
      for (let i = 0; i < files.length; i++) {
        inputs.push(await toImageInput(files[i]!));
        onProgress?.((i + 1) / (files.length + 1), 'Decoding images');
      }
      const bytes = await runOp<Uint8Array>('imagesToPdf', [
        inputs,
        {
          pageSize: options.pageSize || 'fit',
          orientation: options.orientation || 'portrait',
          margin: Number(options.margin || 0),
        },
      ]);
      return { files: [{ filename: 'images.pdf', blob: bytesToBlob(bytes) }] };
    },
  },
  {
    slug: 'text-to-pdf',
    name: 'Text to PDF',
    description: 'Turn a plain .txt file into a clean, paginated PDF.',
    category: 'convert',
    icon: 'FileType',
    execution: 'client',
    accept: { 'text/plain': ['.txt'] },
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'pageSize',
        label: 'Page size',
        default: 'A4',
        options: [
          { value: 'A4', label: 'A4' },
          { value: 'Letter', label: 'Letter' },
          { value: 'Legal', label: 'Legal' },
        ],
      },
      { kind: 'number', key: 'fontSize', label: 'Font size', min: 6, max: 48, default: 12 },
    ],
    async run({ files, options }) {
      const text = await files[0]!.text();
      const bytes = await runOp<Uint8Array>('textToPdf', [
        text,
        { pageSize: options.pageSize || 'A4', fontSize: Number(options.fontSize || 12) },
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(bytes) }],
      };
    },
  },

  // ---- FROM PDF (client) ----
  {
    slug: 'pdf-to-image',
    name: 'PDF to JPG/PNG',
    description: 'Render each PDF page to an image. Multiple pages are zipped.',
    category: 'convert',
    icon: 'Images',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'format',
        label: 'Format',
        default: 'image/png',
        options: [
          { value: 'image/png', label: 'PNG' },
          { value: 'image/jpeg', label: 'JPEG' },
        ],
      },
      {
        kind: 'select',
        key: 'scale',
        label: 'Resolution',
        default: '2',
        options: [
          { value: '1', label: '72 DPI (screen)' },
          { value: '2', label: '144 DPI (default)' },
          { value: '4', label: '288 DPI (print)' },
        ],
      },
    ],
    async run({ files, options, onProgress }) {
      const bytes = await fileToBytes(files[0]!);
      const format = (options.format as 'image/png' | 'image/jpeg') || 'image/png';
      const ext = format === 'image/png' ? 'png' : 'jpg';
      onProgress?.(0.2, 'Rendering pages');
      const blobs = await pdfToImages(bytes, { format, scale: Number(options.scale || 2) });
      const base = files[0]!.name.replace(/\.[^.]+$/, '');
      if (blobs.length === 1) {
        return { files: [{ filename: `${base}.${ext}`, blob: blobs[0]! }] };
      }
      const zip = new JSZip();
      blobs.forEach((b, i) => zip.file(`${base}-${String(i + 1).padStart(3, '0')}.${ext}`, b));
      const zipped = await zip.generateAsync({ type: 'blob' }, (meta) =>
        onProgress?.(0.2 + meta.percent / 125, 'Packaging'),
      );
      return { files: [{ filename: `${base}-images.zip`, blob: zipped }] };
    },
  },
  {
    slug: 'pdf-to-text',
    name: 'PDF to Text',
    description: 'Extract all selectable text from a PDF.',
    category: 'convert',
    icon: 'FileText',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    async run({ files }) {
      const bytes = await fileToBytes(files[0]!);
      const text = await pdfToText(bytes);
      return { kind: 'report', title: 'Extracted text', text };
    },
  },

  // ---- TO PDF (server) ----
  serverTool({
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Convert .doc/.docx documents to PDF with high fidelity (LibreOffice).',
    category: 'convert',
    icon: 'FileText',
    accept: {
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    endpoint: 'office-to-pdf',
  }),
  serverTool({
    slug: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    description: 'Convert .ppt/.pptx presentations to PDF (LibreOffice).',
    category: 'convert',
    icon: 'Presentation',
    accept: {
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    multiple: false,
    endpoint: 'office-to-pdf',
  }),
  serverTool({
    slug: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert .xls/.xlsx spreadsheets to PDF (LibreOffice).',
    category: 'convert',
    icon: 'Sheet',
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    endpoint: 'office-to-pdf',
  }),
  serverTool({
    slug: 'odf-to-pdf',
    name: 'OpenDocument to PDF',
    description: 'Convert ODT/ODS/ODP files to PDF (LibreOffice).',
    category: 'convert',
    icon: 'FileText',
    accept: {
      'application/vnd.oasis.opendocument.text': ['.odt'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
      'application/vnd.oasis.opendocument.presentation': ['.odp'],
    },
    multiple: false,
    endpoint: 'office-to-pdf',
  }),
  serverTool({
    slug: 'html-to-pdf',
    name: 'HTML to PDF',
    description: 'Convert an .html file into a PDF using a headless browser.',
    category: 'convert',
    icon: 'Code',
    accept: { 'text/html': ['.html', '.htm'] },
    multiple: false,
    endpoint: 'html-to-pdf',
  }),
  serverTool({
    slug: 'url-to-pdf',
    name: 'Webpage (URL) to PDF',
    description: 'Capture any public web page as a PDF.',
    category: 'convert',
    icon: 'Globe',
    accept: {},
    multiple: false,
    options: [{ kind: 'text', key: 'url', label: 'Page URL', placeholder: 'https://example.com' }],
    endpoint: 'url-to-pdf',
  }),
  serverTool({
    slug: 'markdown-to-pdf',
    name: 'Markdown to PDF',
    description: 'Render a Markdown (.md) file to a styled PDF.',
    category: 'convert',
    icon: 'Hash',
    accept: { 'text/markdown': ['.md', '.markdown'] },
    multiple: false,
    endpoint: 'markdown-to-pdf',
  }),
  serverTool({
    slug: 'epub-to-pdf',
    name: 'EPUB to PDF',
    description: 'Convert EPUB e-books to PDF (LibreOffice/Calibre).',
    category: 'convert',
    icon: 'BookOpen',
    accept: { 'application/epub+zip': ['.epub'] },
    multiple: false,
    endpoint: 'epub-to-pdf',
  }),

  // ---- FROM PDF (server) ----
  serverTool({
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert a PDF into an editable .docx document.',
    category: 'convert',
    icon: 'FileText',
    accept: PDF_ACCEPT,
    multiple: false,
    endpoint: 'pdf-to-word',
  }),
  serverTool({
    slug: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    description: 'Convert a PDF into an editable .pptx presentation.',
    category: 'convert',
    icon: 'Presentation',
    accept: PDF_ACCEPT,
    multiple: false,
    endpoint: 'pdf-to-powerpoint',
  }),
  serverTool({
    slug: 'pdf-to-excel',
    name: 'PDF to Excel',
    description: 'Extract tables from a PDF into an .xlsx spreadsheet.',
    category: 'convert',
    icon: 'Sheet',
    accept: PDF_ACCEPT,
    multiple: false,
    endpoint: 'pdf-to-excel',
  }),
  serverTool({
    slug: 'pdf-to-html',
    name: 'PDF to HTML',
    description: 'Convert a PDF into an HTML document (Poppler).',
    category: 'convert',
    icon: 'Code',
    accept: PDF_ACCEPT,
    multiple: false,
    endpoint: 'pdf-to-html',
  }),
  serverTool({
    slug: 'pdf-to-markdown',
    name: 'PDF to Markdown',
    description: 'Convert a PDF into Markdown text.',
    category: 'convert',
    icon: 'Hash',
    accept: PDF_ACCEPT,
    multiple: false,
    endpoint: 'pdf-to-markdown',
  }),
  serverTool({
    slug: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    description: 'Convert to the PDF/A archival standard (Ghostscript).',
    category: 'convert',
    icon: 'Archive',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'level',
        label: 'PDF/A level',
        default: '2',
        options: [
          { value: '1', label: 'PDF/A-1b' },
          { value: '2', label: 'PDF/A-2b' },
          { value: '3', label: 'PDF/A-3b' },
        ],
      },
    ],
    endpoint: 'pdf-to-pdfa',
  }),
];
