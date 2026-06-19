'use client';

import { saveBlob } from '@/lib/download';
import type { OptionValues, ResultFile, ToolDefinition, ToolResult } from '@/lib/tools/types';
import { AlertTriangle, Download, Loader2, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Dropzone } from './Dropzone';
import { OptionsForm } from './OptionsForm';

/** Compute the default option values declared by a tool. */
function defaultOptions(tool: ToolDefinition): OptionValues {
  const values: OptionValues = {};
  for (const field of tool.options ?? []) {
    if ('default' in field && field.default !== undefined) values[field.key] = field.default;
    else if (field.kind === 'checkbox') values[field.key] = false;
    else values[field.key] = '';
  }
  return values;
}

/** Generic runner UI that drives any tool defined with a `run` function. */
export function ToolRunner({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<File[]>([]);
  const [secondaryFiles, setSecondaryFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<OptionValues>(() => defaultOptions(tool));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ value: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResult | null>(null);

  const minFiles = tool.minFiles ?? 1;
  const canRun = useMemo(
    () => files.length >= minFiles && !busy && Boolean(tool.run),
    [files.length, minFiles, busy, tool.run],
  );

  async function handleRun() {
    if (!tool.run) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ value: 0 });
    try {
      const output = await tool.run({
        files,
        secondaryFiles,
        options,
        onProgress: (value, message) => setProgress({ value, message }),
      });
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface p-5">
        <Dropzone accept={tool.accept} multiple={tool.multiple} files={files} onChange={setFiles} />
      </div>

      {tool.secondary && (
        <div className="surface p-5">
          <Dropzone
            accept={tool.secondary.accept}
            multiple={tool.secondary.multiple ?? false}
            files={secondaryFiles}
            onChange={setSecondaryFiles}
            label={tool.secondary.label}
          />
        </div>
      )}

      {tool.options && tool.options.length > 0 && (
        <div className="surface p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Options
          </h3>
          <OptionsForm fields={tool.options} values={options} onChange={setOptions} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={!canRun} onClick={handleRun}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {busy ? 'Processing…' : `Run ${tool.name}`}
        </button>
        {files.length < minFiles && (
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Add at least {minFiles} file{minFiles > 1 ? 's' : ''} to continue.
          </span>
        )}
      </div>

      {progress && (
        <div className="surface p-4">
          <div className="mb-2 flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>{progress.message || 'Working…'}</span>
            <span>{Math.round(progress.value * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
            <div
              className="h-full bg-brand-600 transition-all"
              style={{ width: `${Math.min(100, Math.round(progress.value * 100))}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: ToolResult }) {
  if ('kind' in result && result.kind === 'report') {
    return (
      <div className="surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{result.title}</h3>
          <button
            className="btn-ghost"
            onClick={() => saveBlob(new Blob([result.text], { type: 'text/plain' }), 'output.txt')}
          >
            <Download className="h-4 w-4" /> Download .txt
          </button>
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-[hsl(var(--muted))] p-4 text-sm">
          {result.text || '(empty)'}
        </pre>
      </div>
    );
  }

  const files = (result as { files: ResultFile[] }).files;
  return (
    <div className="surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          Done — {files.length} file{files.length > 1 ? 's' : ''}
        </h3>
        {files.length > 1 && (
          <button
            className="btn-ghost"
            onClick={() => files.forEach((f) => saveBlob(f.blob, f.filename))}
          >
            <Download className="h-4 w-4" /> Download all
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {files.map((file, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-sm"
          >
            <span className="truncate">{file.filename}</span>
            <button
              className="btn-primary h-8 px-3"
              onClick={() => saveBlob(file.blob, file.filename)}
            >
              <Download className="h-4 w-4" /> Save
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
