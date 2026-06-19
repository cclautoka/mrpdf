'use client';

import { Dropzone } from '@/components/Dropzone';
import { saveBlob } from '@/lib/download';
import { bytesToBlob, fileToBytes, runOp } from '@/lib/engine';
import type { PdfInfo, PdfMetadata } from '@mr-pdf/pdf-core';
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };
const FIELDS: { key: keyof PdfMetadata; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'subject', label: 'Subject' },
  { key: 'keywords', label: 'Keywords (comma separated)' },
  { key: 'creator', label: 'Creator' },
  { key: 'producer', label: 'Producer' },
];

export function MetadataEditor() {
  const [files, setFiles] = useState<File[]>([]);
  const [meta, setMeta] = useState<PdfMetadata>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!files[0]) return;
      setLoading(true);
      const bytes = await fileToBytes(files[0]);
      const info = await runOp<PdfInfo>('getInfo', [bytes]);
      if (cancelled) return;
      setMeta({
        title: info.title ?? '',
        author: info.author ?? '',
        subject: info.subject ?? '',
        keywords: info.keywords ?? '',
        creator: info.creator ?? '',
        producer: info.producer ?? '',
      });
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [files]);

  async function save() {
    if (!files[0]) return;
    setBusy(true);
    try {
      const bytes = await fileToBytes(files[0]);
      const out = await runOp<Uint8Array>('setMetadata', [bytes, meta]);
      saveBlob(bytesToBlob(out), files[0].name.replace(/\.pdf$/i, '') + '-metadata.pdf');
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
      {loading ? (
        <div className="surface flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="surface grid gap-4 p-5 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className={field.key === 'keywords' ? 'sm:col-span-2' : ''}>
              <label className="label">{field.label}</label>
              <input
                className="input"
                value={String(meta[field.key] ?? '')}
                onChange={(e) => setMeta((m) => ({ ...m, [field.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => setFiles([])}>
          Change file
        </button>
        <button className="btn-primary" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save metadata
        </button>
      </div>
    </div>
  );
}
