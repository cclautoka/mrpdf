/** Edit-category tools (client-side). Interactive editors use custom components. */
import { bytesToBlob, fileToBytes, nativeImageType, runOp, withExtension } from '../engine';
import { normalizeImageToPng } from '@mr-pdf/pdf-core';
import type { ToolDefinition } from './types';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

export const editTools: ToolDefinition[] = [
  {
    slug: 'edit-pdf',
    name: 'Edit PDF',
    description: 'Add text, images, shapes, and freehand drawings onto your PDF.',
    category: 'edit',
    icon: 'PenLine',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive canvas editor (see PdfEditor).
  },
  {
    slug: 'annotate-pdf',
    name: 'Annotate PDF',
    description: 'Highlight, underline, and add comments to a PDF.',
    category: 'edit',
    icon: 'Highlighter',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive canvas editor (see PdfEditor).
  },
  {
    slug: 'watermark-pdf',
    name: 'Add Text Watermark',
    description: 'Stamp diagonal text across every page.',
    category: 'edit',
    icon: 'Stamp',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      { kind: 'text', key: 'text', label: 'Watermark text', default: 'CONFIDENTIAL' },
      { kind: 'number', key: 'fontSize', label: 'Font size', min: 8, max: 200, default: 48 },
      {
        kind: 'number',
        key: 'opacity',
        label: 'Opacity (0-1)',
        min: 0.05,
        max: 1,
        step: 0.05,
        default: 0.25,
      },
      { kind: 'number', key: 'rotation', label: 'Rotation (deg)', min: -90, max: 90, default: 45 },
      { kind: 'color', key: 'color', label: 'Color', default: '#808080' },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('addTextWatermark', [
        bytes,
        {
          text: String(options.text || 'WATERMARK'),
          fontSize: Number(options.fontSize || 48),
          opacity: Number(options.opacity || 0.25),
          rotation: Number(options.rotation || 45),
          color: hexToRgb01(String(options.color || '#808080')),
        },
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'image-watermark-pdf',
    name: 'Add Image Watermark',
    description: 'Overlay a logo or image as a watermark on every page.',
    category: 'edit',
    icon: 'ImagePlus',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    secondary: { label: 'Watermark image', accept: { 'image/*': ['.png', '.jpg', '.jpeg'] } },
    options: [
      {
        kind: 'number',
        key: 'opacity',
        label: 'Opacity (0-1)',
        min: 0.05,
        max: 1,
        step: 0.05,
        default: 0.3,
      },
      { kind: 'number', key: 'scale', label: 'Scale', min: 0.05, max: 2, step: 0.05, default: 0.5 },
    ],
    async run({ files, secondaryFiles, options }) {
      if (!secondaryFiles[0]) throw new Error('Please add a watermark image.');
      const pdfBytes = await fileToBytes(files[0]!);
      const native = nativeImageType(secondaryFiles[0]);
      const image = native
        ? { bytes: await fileToBytes(secondaryFiles[0]), type: native }
        : { bytes: await normalizeImageToPng(secondaryFiles[0]), type: 'png' as const };
      const out = await runOp<Uint8Array>('addImageWatermark', [
        pdfBytes,
        image,
        Number(options.opacity || 0.3),
        Number(options.scale || 0.5),
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'page-numbers',
    name: 'Add Page Numbers',
    description: 'Insert page numbers in the position and format you want.',
    category: 'edit',
    icon: 'Hash',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'position',
        label: 'Position',
        default: 'bottom-center',
        options: [
          { value: 'bottom-center', label: 'Bottom center' },
          { value: 'bottom-right', label: 'Bottom right' },
          { value: 'bottom-left', label: 'Bottom left' },
          { value: 'top-center', label: 'Top center' },
          { value: 'top-right', label: 'Top right' },
        ],
      },
      {
        kind: 'text',
        key: 'format',
        label: 'Format',
        default: '{n} / {total}',
        help: '{n} = number, {total} = total',
      },
      { kind: 'number', key: 'startAt', label: 'Start at', min: 0, default: 1 },
      { kind: 'number', key: 'fontSize', label: 'Font size', min: 6, max: 48, default: 11 },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('addPageNumbers', [
        bytes,
        {
          position: options.position || 'bottom-center',
          format: String(options.format || '{n} / {total}'),
          startAt: Number(options.startAt || 1),
          fontSize: Number(options.fontSize || 11),
        },
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'header-footer',
    name: 'Add Header & Footer',
    description: 'Add a header and/or footer line to every page.',
    category: 'edit',
    icon: 'PanelTop',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      { kind: 'text', key: 'header', label: 'Header text', placeholder: 'Optional' },
      { kind: 'text', key: 'footer', label: 'Footer text', placeholder: 'Optional' },
      { kind: 'number', key: 'fontSize', label: 'Font size', min: 6, max: 48, default: 11 },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('addHeaderFooter', [
        bytes,
        {
          header: String(options.header || ''),
          footer: String(options.footer || ''),
          fontSize: Number(options.fontSize || 11),
        },
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'crop-pdf',
    name: 'Crop PDF',
    description: 'Trim margins from pages by removing points from each side.',
    category: 'edit',
    icon: 'Crop',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      { kind: 'number', key: 'top', label: 'Top (pt)', min: 0, default: 0 },
      { kind: 'number', key: 'right', label: 'Right (pt)', min: 0, default: 0 },
      { kind: 'number', key: 'bottom', label: 'Bottom (pt)', min: 0, default: 0 },
      { kind: 'number', key: 'left', label: 'Left (pt)', min: 0, default: 0 },
      { kind: 'text', key: 'ranges', label: 'Pages (blank = all)', default: '' },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('cropPages', [
        bytes,
        {
          top: Number(options.top || 0),
          right: Number(options.right || 0),
          bottom: Number(options.bottom || 0),
          left: Number(options.left || 0),
        },
        String(options.ranges || ''),
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'stamp-pdf',
    name: 'Stamp / Overlay PDF',
    description: 'Overlay one PDF (e.g. a letterhead or stamp) on top of another.',
    category: 'edit',
    icon: 'Layers',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    secondary: { label: 'Stamp/overlay PDF', accept: PDF_ACCEPT },
    options: [
      {
        kind: 'number',
        key: 'opacity',
        label: 'Opacity (0-1)',
        min: 0.05,
        max: 1,
        step: 0.05,
        default: 1,
      },
    ],
    async run({ files, secondaryFiles, options }) {
      if (!secondaryFiles[0]) throw new Error('Please add a stamp/overlay PDF.');
      const base = await fileToBytes(files[0]!);
      const stamp = await fileToBytes(secondaryFiles[0]);
      const out = await runOp<Uint8Array>('stampPdf', [base, stamp, Number(options.opacity || 1)]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'n-up-pdf',
    name: 'N-up (Multi-page Layout)',
    description: 'Place multiple pages onto each sheet (2-up, 4-up, etc).',
    category: 'edit',
    icon: 'Grid2x2',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'perSheet',
        label: 'Pages per sheet',
        default: '2',
        options: ['2', '4', '6', '8', '9', '16'].map((v) => ({ value: v, label: `${v}-up` })),
      },
      {
        kind: 'select',
        key: 'pageSize',
        label: 'Sheet size',
        default: 'A4',
        options: [
          { value: 'A4', label: 'A4' },
          { value: 'Letter', label: 'Letter' },
          { value: 'A3', label: 'A3' },
        ],
      },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('nUpPages', [
        bytes,
        Number(options.perSheet || 2),
        options.pageSize || 'A4',
      ]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'resize-pdf',
    name: 'Resize / Scale Pages',
    description: 'Scale every page to a standard page size.',
    category: 'edit',
    icon: 'Scaling',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      {
        kind: 'select',
        key: 'pageSize',
        label: 'Target size',
        default: 'A4',
        options: [
          { value: 'A4', label: 'A4' },
          { value: 'A3', label: 'A3' },
          { value: 'A5', label: 'A5' },
          { value: 'Letter', label: 'Letter' },
          { value: 'Legal', label: 'Legal' },
        ],
      },
    ],
    async run({ files, options }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('resizePages', [bytes, options.pageSize || 'A4']);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
];

/** Convert a #rrggbb hex color to {r,g,b} in the 0..1 range. */
function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return { r: 0.5, g: 0.5, b: 0.5 };
  const value = m[1]!;
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}
