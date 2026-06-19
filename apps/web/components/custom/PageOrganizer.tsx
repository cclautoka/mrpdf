'use client';

import { Dropzone } from '@/components/Dropzone';
import { saveBlob } from '@/lib/download';
import { bytesToBlob, fileToBytes, runOp } from '@/lib/engine';
import { loadPdfJs, renderPageToBlob, type Rotation } from '@mr-pdf/pdf-core';
import { ArrowLeft, ArrowRight, Download, Loader2, RotateCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

interface PageThumb {
  /** Original 0-based source index. */
  index: number;
  rotation: Rotation;
  url: string;
}

export function PageOrganizer() {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageThumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!files[0]) return;
      setLoading(true);
      const bytes = await fileToBytes(files[0]);
      const doc = await loadPdfJs(bytes);
      const thumbs: PageThumb[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const blob = await renderPageToBlob(doc, i, {
          scale: 0.4,
          format: 'image/jpeg',
          quality: 0.7,
        });
        thumbs.push({ index: i - 1, rotation: 0, url: URL.createObjectURL(blob) });
      }
      await doc.destroy();
      if (cancelled) return;
      setPages(thumbs);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  const rotate = (i: number) =>
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === i ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation } : p,
      ),
    );

  const remove = (i: number) => setPages((prev) => prev.filter((_, idx) => idx !== i));

  async function exportPdf() {
    if (!files[0] || pages.length === 0) return;
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const ops = pages.map((p) => ({ index: p.index, rotation: p.rotation }));
      const out = await runOp<Uint8Array>('rebuildPages', [bytes, ops]);
      saveBlob(bytesToBlob(out), files[0].name.replace(/\.pdf$/i, '') + '-organized.pdf');
    } finally {
      setBusy(false);
    }
  }

  if (!files[0]) {
    return (
      <div className="surface p-5">
        <Dropzone accept={PDF_ACCEPT} multiple={false} files={files} onChange={setFiles} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {pages.length} page{pages.length === 1 ? '' : 's'} — reorder, rotate, or delete, then
          export.
        </p>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setFiles([])}>
            Change file
          </button>
          <button className="btn-primary" disabled={busy || pages.length === 0} onClick={exportPdf}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="surface flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {pages.map((p, i) => (
            <div key={`${p.index}-${i}`} className="surface overflow-hidden">
              <div className="flex items-center justify-center bg-[hsl(var(--muted))] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Page ${p.index + 1}`}
                  className="max-h-44 w-auto"
                  style={{ transform: `rotate(${p.rotation}deg)` }}
                />
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">#{p.index + 1}</span>
                <div className="flex gap-1">
                  <IconBtn onClick={() => move(i, i - 1)} label="Move left">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => move(i, i + 1)} label="Move right">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => rotate(i)} label="Rotate">
                    <RotateCw className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => remove(i)} label="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded p-1 hover:bg-[hsl(var(--muted))]"
    >
      {children}
    </button>
  );
}
