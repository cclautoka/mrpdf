/** Security + forms/signing tools. */
import { bytesToBlob, fileToBytes, runOp, withExtension } from '../engine';
import { serverTool } from './server';
import type { ToolDefinition } from './types';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

export const securityTools: ToolDefinition[] = [
  {
    slug: 'fill-sign',
    name: 'Fill & Sign',
    description: 'Fill in form fields and add your signature, then download.',
    category: 'security',
    icon: 'PenTool',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive form + signature component (see FillSign).
  },
  {
    slug: 'sign-pdf',
    name: 'Sign PDF',
    description: 'Draw, type, or upload a signature and place it on the page.',
    category: 'security',
    icon: 'Signature',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive signing component (see PdfEditor signature mode).
  },
  {
    slug: 'flatten-pdf',
    name: 'Flatten PDF',
    description: 'Flatten form fields and annotations so they become static content.',
    category: 'security',
    icon: 'Layers2',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    async run({ files }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('flattenForm', [bytes]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  {
    slug: 'redact-pdf',
    name: 'Redact PDF',
    description: 'Permanently black out sensitive areas (content is rasterized away).',
    category: 'security',
    icon: 'SquareSlash',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    // Interactive redaction component (see RedactTool).
  },
  {
    slug: 'sanitize-pdf',
    name: 'Sanitize Metadata',
    description: 'Strip title, author, and other metadata from the document.',
    category: 'security',
    icon: 'ShieldCheck',
    execution: 'client',
    accept: PDF_ACCEPT,
    multiple: false,
    async run({ files }) {
      const bytes = await fileToBytes(files[0]!);
      const out = await runOp<Uint8Array>('clearMetadata', [bytes]);
      return {
        files: [{ filename: withExtension(files[0]!.name, 'pdf'), blob: bytesToBlob(out) }],
      };
    },
  },
  serverTool({
    slug: 'protect-pdf',
    name: 'Protect PDF',
    description: 'Encrypt a PDF with a password (qpdf, AES-256).',
    category: 'security',
    icon: 'Lock',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      { kind: 'text', key: 'password', label: 'Password', placeholder: 'Choose a password' },
    ],
    endpoint: 'protect',
  }),
  serverTool({
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    description: 'Remove a known password from a PDF (qpdf).',
    category: 'security',
    icon: 'LockOpen',
    accept: PDF_ACCEPT,
    multiple: false,
    options: [
      { kind: 'text', key: 'password', label: 'Current password', placeholder: 'Current password' },
    ],
    endpoint: 'unlock',
  }),
  serverTool({
    slug: 'digital-signature',
    name: 'Digital Signature',
    description: 'Apply a certificate-based digital signature (.p12/.pfx).',
    category: 'security',
    icon: 'BadgeCheck',
    accept: PDF_ACCEPT,
    multiple: false,
    secondary: {
      label: 'Certificate (.p12/.pfx)',
      accept: { 'application/x-pkcs12': ['.p12', '.pfx'] },
    },
    options: [{ kind: 'text', key: 'password', label: 'Certificate password' }],
    endpoint: 'sign',
  }),
];
