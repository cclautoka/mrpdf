'use client';

import type { OptionField, OptionValues } from '@/lib/tools/types';

interface OptionsFormProps {
  fields: OptionField[];
  values: OptionValues;
  onChange: (values: OptionValues) => void;
}

/** Renders a tool's option fields and reports changes back to the parent. */
export function OptionsForm({ fields, values, onChange }: OptionsFormProps) {
  const set = (key: string, value: string | number | boolean) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className={field.kind === 'checkbox' ? 'sm:col-span-2' : ''}>
          {field.kind !== 'checkbox' && <label className="label">{field.label}</label>}

          {field.kind === 'text' && (
            <input
              className="input"
              placeholder={field.placeholder}
              value={String(values[field.key] ?? '')}
              onChange={(e) => set(field.key, e.target.value)}
            />
          )}

          {field.kind === 'number' && (
            <input
              type="number"
              className="input"
              min={field.min}
              max={field.max}
              step={field.step}
              value={String(values[field.key] ?? '')}
              onChange={(e) => set(field.key, e.target.value === '' ? '' : Number(e.target.value))}
            />
          )}

          {field.kind === 'select' && (
            <select
              className="input"
              value={String(values[field.key] ?? '')}
              onChange={(e) => set(field.key, e.target.value)}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.kind === 'color' && (
            <input
              type="color"
              className="h-10 w-full cursor-pointer rounded-lg border border-[hsl(var(--border))] bg-transparent"
              value={String(values[field.key] ?? '#808080')}
              onChange={(e) => set(field.key, e.target.value)}
            />
          )}

          {field.kind === 'checkbox' && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={Boolean(values[field.key])}
                onChange={(e) => set(field.key, e.target.checked)}
              />
              {field.label}
            </label>
          )}

          {field.help && (
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{field.help}</p>
          )}
        </div>
      ))}
    </div>
  );
}
