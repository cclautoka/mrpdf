/** Utility-category tools: view, compare, extract, info, metadata, bookmarks. */
import {
  comparePdfsText,
  extractRasterImages,
  getInfo,
  pdfToText,
  type PdfInfo,
} from '@mr-pdf/pdf-core';
import { formatBytes } from '@mr-pdf/ui';
import JSZip from 'jszip';
import { fileToBytes } from '../engine';
import type { ToolDefinition } from './types';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

export const utilityTools: ToolDefinition[] = [
  {
    slug: 'view-pdf',
    name: 'View PDF',
    description: 'Open and page through a PDF entirely in your browser.',
    category: 'utilities',
    icon: 'Eye',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive viewer (see PdfViewer).
  },
  {
    slug: 'compare-pdf',
    name: 'Compare PDFs',
    description: 'See which text lines were added or removed between two PDFs.',
    category: 'utilities',
    icon: 'GitCompare',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    secondary: { label: 'Second PDF', accept: PDF_ACCEPT },
    async run({ files, secondaryFiles }) {
      if (!secondaryFiles[0]) throw new Error('Please add a second PDF to compare.');
      const [a, b] = await Promise.all([fileToBytes(files[0]!), fileToBytes(secondaryFiles[0])]);
      const diff = await comparePdfsText(a, b);
      const lines: string[] = [];
      if (diff.equal) lines.push('The two documents contain the same text.');
      if (diff.removed.length) {
        lines.push(`# Removed (${diff.removed.length})`, ...diff.removed.map((l) => `- ${l}`), '');
      }
      if (diff.added.length) {
        lines.push(`# Added (${diff.added.length})`, ...diff.added.map((l) => `+ ${l}`));
      }
      return { kind: 'report', title: 'Comparison result', text: lines.join('\n') };
    },
  },
  {
    slug: 'extract-images',
    name: 'Extract Images',
    description: 'Pull embedded images out of a PDF and download them as a zip.',
    category: 'utilities',
    icon: 'ImageDown',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    async run({ files, onProgress }) {
      const bytes = await fileToBytes(files[0]!);
      onProgress?.(0.3, 'Scanning for images');
      const images = await extractRasterImages(bytes);
      if (images.length === 0) throw new Error('No extractable images found in this PDF.');
      if (images.length === 1) {
        return { files: [{ filename: images[0]!.name, blob: images[0]!.blob }] };
      }
      const zip = new JSZip();
      images.forEach((img) => zip.file(img.name, img.blob));
      const blob = await zip.generateAsync({ type: 'blob' });
      const base = files[0]!.name.replace(/\.[^.]+$/, '');
      return { files: [{ filename: `${base}-images.zip`, blob }] };
    },
  },
  {
    slug: 'extract-text',
    name: 'Extract Text',
    description: 'Copy all selectable text from a PDF.',
    category: 'utilities',
    icon: 'ClipboardCopy',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    async run({ files }) {
      const bytes = await fileToBytes(files[0]!);
      const text = await pdfToText(bytes);
      return { kind: 'report', title: 'Extracted text', text };
    },
  },
  {
    slug: 'pdf-info',
    name: 'PDF Info',
    description: 'Inspect page count, sizes, encryption status, and metadata.',
    category: 'utilities',
    icon: 'Info',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    async run({ files }) {
      const bytes = await fileToBytes(files[0]!);
      const info: PdfInfo = await getInfo(bytes);
      const text = [
        `File: ${files[0]!.name}`,
        `Size: ${formatBytes(files[0]!.size)}`,
        `Pages: ${info.pageCount}`,
        `Encrypted: ${info.isEncrypted ? 'Yes' : 'No'}`,
        `Title: ${info.title || '-'}`,
        `Author: ${info.author || '-'}`,
        `Subject: ${info.subject || '-'}`,
        `Keywords: ${info.keywords || '-'}`,
        `Creator: ${info.creator || '-'}`,
        `Producer: ${info.producer || '-'}`,
        `Created: ${info.creationDate || '-'}`,
        `Modified: ${info.modificationDate || '-'}`,
        '',
        'Page sizes (pt):',
        ...info.pageSizes.map(
          (s, i) => `  Page ${i + 1}: ${Math.round(s.width)} x ${Math.round(s.height)}`,
        ),
      ].join('\n');
      return { kind: 'report', title: 'Document info', text };
    },
  },
  {
    slug: 'edit-metadata',
    name: 'Edit Metadata',
    description: 'View and change the title, author, and other document properties.',
    category: 'utilities',
    icon: 'Tags',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive metadata editor (see MetadataEditor).
  },
  {
    slug: 'edit-bookmarks',
    name: 'Edit Bookmarks',
    description: 'View, replace, or auto-generate the document outline (table of contents).',
    category: 'utilities',
    icon: 'Bookmark',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive bookmarks editor (see BookmarksEditor).
  },
];
