/** Form tools: inspect, fill, and flatten AcroForm fields. */
import type { PdfBytes } from './types';
import { loadPdf } from './utils';

export interface FormFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionList' | 'button' | 'unknown';
  value?: string;
  options?: string[];
}

/** List the interactive form fields in a PDF. */
export async function getFormFields(bytes: PdfBytes): Promise<FormFieldInfo[]> {
  const doc = await loadPdf(bytes, true);
  const form = doc.getForm();
  return form.getFields().map((field) => {
    const name = field.getName();
    const ctor = field.constructor.name;
    if (ctor === 'PDFTextField') {
      return { name, type: 'text', value: (field as never as { getText(): string }).getText?.() };
    }
    if (ctor === 'PDFCheckBox') {
      return { name, type: 'checkbox' };
    }
    if (ctor === 'PDFDropdown' || ctor === 'PDFOptionList') {
      const opts = (field as never as { getOptions(): string[] }).getOptions?.() ?? [];
      return { name, type: ctor === 'PDFDropdown' ? 'dropdown' : 'optionList', options: opts };
    }
    if (ctor === 'PDFRadioGroup') {
      const opts = (field as never as { getOptions(): string[] }).getOptions?.() ?? [];
      return { name, type: 'radio', options: opts };
    }
    return { name, type: 'unknown' };
  });
}

/** Fill text/checkbox/dropdown fields by name. Checkbox values: 'true'/'false'. */
export async function fillForm(
  bytes: PdfBytes,
  values: Record<string, string>,
  flatten = false,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  const form = doc.getForm();
  for (const [name, value] of Object.entries(values)) {
    const field = form.getFieldMaybe(name);
    if (!field) continue;
    const ctor = field.constructor.name;
    try {
      if (ctor === 'PDFTextField') {
        (field as never as { setText(v: string): void }).setText(value);
      } else if (ctor === 'PDFCheckBox') {
        const cb = field as never as { check(): void; uncheck(): void };
        if (value === 'true') cb.check();
        else cb.uncheck();
      } else if (ctor === 'PDFDropdown' || ctor === 'PDFRadioGroup' || ctor === 'PDFOptionList') {
        (field as never as { select(v: string): void }).select(value);
      }
    } catch {
      // Ignore individual field errors so one bad value does not abort the whole fill.
    }
  }
  if (flatten) form.flatten();
  return doc.save();
}

/** Flatten all form fields, making their values a permanent part of the page content. */
export async function flattenForm(bytes: PdfBytes): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, true);
  try {
    doc.getForm().flatten();
  } catch {
    // No form present; saving is still valid.
  }
  return doc.save();
}
