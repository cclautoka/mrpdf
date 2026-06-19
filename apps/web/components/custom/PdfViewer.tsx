'use client';

import { Dropzone } from '@/components/Dropzone';
import { fileToBytes } from '@/lib/engine';
import { loadPdfJs, renderPageToBlob } from '@mr-pdf/pdf-core';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

type PdfDoc = Awaited<ReturnType<typeof loadPdfJs>>;

export function PdfViewer() {
  const [files, setFiles] = useState<File[]>([]);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!files[0]) return;
      setLoading(true);
      const bytes = await fileToBytes(files[0]);
      const loaded = await loadPdfJs(bytes);
      if (cancelled) return;
      setDoc(loaded);
      setPage(1);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [files]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!doc) return;
      setLoading(true);
      const blob = await renderPageToBlob(doc, page, { scale, format: 'image/png' });
      if (cancelled) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setImgUrl(url);
      setLoading(false);
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [doc, page, scale]);

  if (!doc) {
    return (
      <div className="surface p-5">
        <Dropzone accept={PDF_ACCEPT} multiple={false} files={files} onChange={setFiles} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost h-9 w-9 p-0"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm">
            Page {page} / {doc.numPages}
          </span>
          <button
            className="btn-ghost h-9 w-9 p-0"
            disabled={page >= doc.numPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost h-9 w-9 p-0"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            className="btn-ghost h-9 w-9 p-0"
            onClick={() => setScale((s) => Math.min(4, s + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button className="btn-ghost ml-2" onClick={() => setFiles([])}>
            Change file
          </button>
        </div>
      </div>

      <div className="surface flex min-h-[400px] items-center justify-center overflow-auto p-4">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-brand-600" />}
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={`Page ${page}`} className="max-w-full shadow-lg" />
        )}
      </div>
    </div>
  );
}
