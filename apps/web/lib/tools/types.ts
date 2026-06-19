/** Tool definition model that drives the generic tool runner UI. */
import type { ComponentType } from 'react';

export type ToolCategory = 'organize' | 'optimize' | 'convert' | 'edit' | 'security' | 'utilities';

export type Execution = 'client' | 'server' | 'hybrid';

/** A single configurable option rendered in the tool's options panel. */
export type OptionField =
  | {
      kind: 'text';
      key: string;
      label: string;
      placeholder?: string;
      default?: string;
      help?: string;
    }
  | {
      kind: 'number';
      key: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      default?: number;
      help?: string;
    }
  | { kind: 'checkbox'; key: string; label: string; default?: boolean; help?: string }
  | {
      kind: 'select';
      key: string;
      label: string;
      options: { value: string; label: string }[];
      default?: string;
      help?: string;
    }
  | { kind: 'color'; key: string; label: string; default?: string; help?: string };

export type OptionValues = Record<string, string | number | boolean>;

/** A produced file ready for download. */
export interface ResultFile {
  filename: string;
  blob: Blob;
}

/** Non-file textual output (e.g. extracted text, info, comparison report). */
export interface ReportOutput {
  kind: 'report';
  title: string;
  text: string;
}

export type ToolResult = { files: ResultFile[] } | ReportOutput;

export interface RunContext {
  files: File[];
  /** Files from the optional secondary dropzone (e.g. watermark image, stamp PDF). */
  secondaryFiles: File[];
  options: OptionValues;
  /** Report coarse progress (0..1) to the UI. */
  onProgress?: (fraction: number, message?: string) => void;
}

export interface ToolDefinition {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  /** lucide-react icon name handled by the IconMap. */
  icon: string;
  execution: Execution;
  /** Accepted file types for the dropzone (e.g. { 'application/pdf': ['.pdf'] }). */
  accept: Record<string, string[]>;
  multiple: boolean;
  /** Minimum number of files required to run. */
  minFiles?: number;
  /** Optional second input (e.g. a watermark image or a stamp/compare PDF). */
  secondary?: { label: string; accept: Record<string, string[]>; multiple?: boolean };
  options?: OptionField[];
  /** Optional custom UI component that fully replaces the generic runner. */
  customComponent?: ComponentType;
  /** Execute the tool and return downloadable files or a textual report. */
  run?: (ctx: RunContext) => Promise<ToolResult>;
}
