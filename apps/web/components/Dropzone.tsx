'use client';

import { cn, formatBytes } from '@mr-pdf/ui';
import { UploadCloud, X } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface DropzoneProps {
  accept: Record<string, string[]>;
  multiple: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
}

/** Drag-and-drop file input with a selected-file list. */
export function Dropzone({ accept, multiple, files, onChange, label }: DropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onChange(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
    },
    [files, multiple, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.keys(accept).length ? accept : undefined,
    multiple,
  });

  const removeAt = (index: number) => onChange(files.filter((_, i) => i !== index));

  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragActive
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10'
            : 'border-[hsl(var(--border))] hover:border-brand-400',
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mb-3 h-8 w-8 text-brand-500" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop files here' : 'Drag & drop or click to choose'}
        </p>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          {multiple ? 'You can add multiple files' : 'Single file'}
        </p>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="surface flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="truncate">
                {file.name}{' '}
                <span className="text-[hsl(var(--muted-foreground))]">
                  ({formatBytes(file.size)})
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="ml-2 rounded p-1 hover:bg-[hsl(var(--muted))]"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
