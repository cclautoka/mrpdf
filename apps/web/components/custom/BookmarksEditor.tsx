'use client';

import { Dropzone } from '@/components/Dropzone';
import { saveBlob } from '@/lib/download';
import { bytesToBlob, fileToBytes, runOp } from '@/lib/engine';
import { loadPdfJs, type OutlineItem } from '@mr-pdf/pdf-core';
import { Download, ListOrdered, Loader2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

export function BookmarksEditor() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!files[0]) return;
      setLoading(true);
      const bytes = await fileToBytes(files[0]);
      const doc = await loadPdfJs(bytes);
      const outline = await doc.getOutline().catch(() => null);
      const lines: string[] = [];
      if (outline) {
        for (const item of outline) {
          // We only know the title reliably; default page to 1 for editing.
          lines.push(`${item.title} | 1`);
        }
      }
      if (cancelled) return;
      setPageCount(doc.numPages);
      setText(lines.join('\n'));
      await doc.destroy();
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [files]);

  function autoGenerate() {
    setText(Array.from({ length: pageCount }, (_, i) => `Page ${i + 1} | ${i + 1}`).join('\n'));
  }

  function parseItems(): OutlineItem[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, page] = line.split('|').map((s) => s.trim());
        return { title: title || 'Untitled', pageIndex: Math.max(0, (Number(page) || 1) - 1) };
      });
  }

  async function exportPdf() {
    if (!files[0]) return;
    setBusy(true);
    setError(null);
    try {
      const items = parseItems();
      if (items.length === 0) throw new Error('Add at least one bookmark (Title | page).');
      const bytes = await fileToBytes(files[0]);
      const out = await runOp<Uint8Array>('setOutline', [bytes, items]);
      saveBlob(bytesToBlob(out), files[0].name.replace(/\.pdf$/i, '') + '-bookmarks.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
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
      <div className="surface p-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">
            Bookmarks — one per line, format <code>Title | pageNumber</code> ({pageCount} pages)
          </label>
          <button className="btn-ghost h-8" onClick={autoGenerate}>
            <Wand2 className="h-4 w-4" /> One per page
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : (
          <textarea
            className="input min-h-48 font-mono"
            value={text}
            placeholder={'Introduction | 1\nChapter 1 | 3\nSummary | 12'}
            onChange={(e) => setText(e.target.value)}
          />
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => setFiles([])}>
          Change file
        </button>
        <button className="btn-primary" disabled={busy} onClick={exportPdf}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <ListOrdered className="h-4 w-4" /> Apply bookmarks
        </button>
      </div>
    </div>
  );
}
