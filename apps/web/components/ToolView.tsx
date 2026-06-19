'use client';

import { ToolRunner } from '@/components/ToolRunner';
import { getTool } from '@/lib/tools';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const loading = () => (
  <div className="surface flex items-center justify-center p-12">
    <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
  </div>
);

// Browser-only interactive tools are loaded client-side (they use canvas / pdf.js).
const PdfViewer = dynamic(() => import('@/components/custom/PdfViewer').then((m) => m.PdfViewer), {
  ssr: false,
  loading,
});
const PageOrganizer = dynamic(
  () => import('@/components/custom/PageOrganizer').then((m) => m.PageOrganizer),
  { ssr: false, loading },
);
const ScanToPdf = dynamic(() => import('@/components/custom/ScanToPdf').then((m) => m.ScanToPdf), {
  ssr: false,
  loading,
});
const MetadataEditor = dynamic(
  () => import('@/components/custom/MetadataEditor').then((m) => m.MetadataEditor),
  { ssr: false, loading },
);
const BookmarksEditor = dynamic(
  () => import('@/components/custom/BookmarksEditor').then((m) => m.BookmarksEditor),
  { ssr: false, loading },
);
const FillSign = dynamic(() => import('@/components/custom/FillSign').then((m) => m.FillSign), {
  ssr: false,
  loading,
});
const PdfEditor = dynamic(() => import('@/components/custom/PdfEditor').then((m) => m.PdfEditor), {
  ssr: false,
  loading,
});

const customComponents: Record<string, ComponentType> = {
  'view-pdf': PdfViewer,
  'organize-pages': PageOrganizer,
  'scan-to-pdf': ScanToPdf,
  'edit-metadata': MetadataEditor,
  'edit-bookmarks': BookmarksEditor,
  'fill-sign': FillSign,
  'edit-pdf': () => <PdfEditor mode="edit" />,
  'annotate-pdf': () => <PdfEditor mode="annotate" />,
  'sign-pdf': () => <PdfEditor mode="sign" />,
  'redact-pdf': () => <PdfEditor mode="redact" />,
};

export function ToolView({ slug }: { slug: string }) {
  const tool = getTool(slug);
  if (!tool) return null;
  const Custom = customComponents[slug];
  if (Custom) return <Custom />;
  return <ToolRunner tool={tool} />;
}
