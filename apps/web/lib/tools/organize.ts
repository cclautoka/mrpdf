/** Organize-category tools (all client-side via the PDF worker). */
import type { NamedFile, Rotation, SplitResult } from '@mr-pdf/pdf-core';
import { bytesToBlob, fileToBytes, runOp, withExtension } from '../engine';
import type { ToolDefinition } from './types';

/** Read every input File into a NamedFile for multi-file worker ops. */
async function toNamedFiles(files: File[]): Promise<NamedFile[]> {
  return Promise.all(files.map(async (f) => ({ name: f.name, bytes: await fileToBytes(f) })));
}

export const organizeTools: ToolDefinition[] = [
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into a single document in the order you choose.',
    category: 'organize',
    icon: 'Combine',
    execution: 'client',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    minFiles: 2,
    async run({ files }) {
      const named = await toNamedFiles(files);
      const bytes = await runOp<Uint8Array>('merge', [named]);
      return { files: [{ filename: 'merged.pdf', blob: bytesToBlob(bytes) }] };
    },
  },
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    description: 'Split a PDF by page ranges, every N pages, or into single pages.',
    category: 'organize',
    icon: 'Scissors',
    execution: 'client',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'mode',
        label: 'Split mode',
        default: 'ranges',
        options: [
          { value: 'ranges', label: 'By ranges (e.g. 1-3, 4-6)' },
          { value: 'every', label: 'Every N pages' },
          { value: 'each', label: 'Each page separately' },
        ],
      },
      { kind: 'text', key: 'ranges', label: 'Ranges', placeholder: '1-3, 4-6', default: '1-1' },
      { kind: 'number', key: 'pagesPer', label: 'Pages per file', min: 1, default: 1 },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const mode = String(options.mode || 'ranges');
      const arg =
        mode === 'ranges'
          ? { mode, ranges: String(options.ranges || '') }
          : mode === 'every'
            ? { mode, pagesPer: Number(options.pagesPer || 1) }
            : { mode: 'each' as const };
      const parts = await runOp<SplitResult[]>('split', [bytes, arg]);
      return {
        files: parts.map((p) => ({ filename: p.name, blob: bytesToBlob(p.bytes) })),
      };
    },
  },
  {
    slug: 'extract-pages',
    name: 'Extract Pages',
    description: 'Pull selected pages into a brand new PDF.',
    category: 'organize',
    icon: 'CopyPlus',
    execution: 'client',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    options: [
      {
        kind: 'text',
        key: 'ranges',
        label: 'Pages to extract',
        placeholder: '1-3, 7',
        default: '1',
      },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('extractPages', [bytes, String(options.ranges || '')]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'remove-pages',
    name: 'Remove Pages',
    description: 'Delete specific pages and keep the rest.',
    category: 'organize',
    icon: 'Eraser',
    execution: 'client',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    options: [
      {
        kind: 'text',
        key: 'ranges',
        label: 'Pages to remove',
        placeholder: '2, 5-6',
        default: '1',
      },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('removePages', [bytes, String(options.ranges || '')]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'organize-pages',
    name: 'Organize Pages',
    description: 'Reorder, rotate, and delete pages visually with thumbnails.',
    category: 'organize',
    icon: 'LayoutGrid',
    execution: 'client',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    // Uses a dedicated interactive component (see PageOrganizer).
  },
  {
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate all or selected pages by 90, 180, or 270 degrees.',
    category: 'organize',
    icon: 'RotateCw',
    execution: 'client',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'rotation',
        label: 'Rotation',
        default: '90',
        options: [
          { value: '90', label: '90 clockwise' },
          { value: '180', label: '180' },
          { value: '270', label: '270 (90 counter-clockwise)' },
        ],
      },
      {
        kind: 'text',
        key: 'ranges',
        label: 'Pages (blank = all)',
        placeholder: 'all',
        default: '',
      },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const rotation = Number(options.rotation || 90) as Rotation;
      const out = await runOp<Uint8Array>('rotatePages', [
        bytes,
        rotation,
        String(options.ranges || ''),
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'insert-blank-pages',
    name: 'Insert Blank Pages',
    description: 'Add one or more blank pages at a chosen position.',
    category: 'organize',
    icon: 'FilePlus',
    execution: 'client',
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    options: [
      { kind: 'number', key: 'position', label: 'Insert before page #', min: 1, default: 1 },
      { kind: 'number', key: 'count', label: 'How many', min: 1, default: 1 },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('insertBlankPages', [
        bytes,
        Number(options.position || 1),
        Number(options.count || 1),
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'scan-to-pdf',
    name: 'Scan to PDF',
    description: 'Capture photos from your camera or upload scans and turn them into a PDF.',
    category: 'organize',
    icon: 'ScanLine',
    execution: 'client',
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: true,
    // Uses a dedicated capture component (see ScanToPdf).
  },
];
