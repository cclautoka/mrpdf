'use client';

import { Dropzone } from '@/components/Dropzone';
import { saveBlob } from '@/lib/download';
import { bytesToBlob, fileToBytes, runOp } from '@/lib/engine';
import type { FormFieldInfo } from '@mr-pdf/pdf-core';
import { Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };

export function FillSign() {
  const [files, setFiles] = useState<File[]>([]);
  const [fields, setFields] = useState<FormFieldInfo[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [flatten, setFlatten] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!files[0]) return;
      setLoading(true);
      const bytes = await fileToBytes(files[0]);
      const found = await runOp<FormFieldInfo[]>('getFormFields', [bytes]);
      if (cancelled) return;
      setFields(found);
      setValues(Object.fromEntries(found.map((f) => [f.name, f.value ?? ''])));
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
      const out = await runOp<Uint8Array>('fillForm', [bytes, values, flatten]);
      saveBlob(bytesToBlob(out), files[0].name.replace(/\.pdf$/i, '') + '-filled.pdf');
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
      ) : fields && fields.length > 0 ? (
        <div className="surface space-y-4 p-5">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="label">{field.name}</label>
              {field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={values[field.name] === 'true'}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: String(e.target.checked) }))
                  }
                />
              ) : field.options && field.options.length > 0 ? (
                <select
                  className="input"
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                >
                  <option value="">—</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={flatten}
              onChange={(e) => setFlatten(e.target.checked)}
            />
            Flatten after filling (lock the values)
          </label>
        </div>
      ) : (
        <div className="surface p-5 text-sm text-[hsl(var(--muted-foreground))]">
          This PDF has no interactive form fields. To add text or a signature manually, use the{' '}
          <Link href="/tool/sign-pdf" className="text-brand-600 underline">
            Sign PDF
          </Link>{' '}
          tool.
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => setFiles([])}>
          Change file
        </button>
        <button
          className="btn-primary"
          disabled={busy || !fields || fields.length === 0}
          onClick={save}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download filled PDF
        </button>
      </div>
    </div>
  );
}
