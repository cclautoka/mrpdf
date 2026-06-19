/** Aggregated tool registry and lookup helpers. */
import { convertTools } from './convert';
import { editTools } from './edit';
import { optimizeTools } from './optimize';
import { organizeTools } from './organize';
import { securityTools } from './security';
import type { ToolCategory, ToolDefinition } from './types';
import { utilityTools } from './utilities';

export const allTools: ToolDefinition[] = [
  ...organizeTools,
  ...optimizeTools,
  ...convertTools,
  ...editTools,
  ...securityTools,
  ...utilityTools,
];

export interface CategoryMeta {
  id: ToolCategory;
  label: string;
  description: string;
  icon: string;
}

export const categories: CategoryMeta[] = [
  {
    id: 'organize',
    label: 'Organize',
    description: 'Merge, split, and arrange pages',
    icon: 'LayoutGrid',
  },
  { id: 'optimize', label: 'Optimize', description: 'Compress, repair, and OCR', icon: 'Gauge' },
  { id: 'convert', label: 'Convert', description: 'To and from PDF', icon: 'Repeat' },
  { id: 'edit', label: 'Edit', description: 'Annotate, watermark, and lay out', icon: 'PenLine' },
  {
    id: 'security',
    label: 'Security & Sign',
    description: 'Protect, sign, and redact',
    icon: 'ShieldCheck',
  },
  {
    id: 'utilities',
    label: 'Utilities',
    description: 'View, compare, and inspect',
    icon: 'Wrench',
  },
];

const bySlug = new Map(allTools.map((tool) => [tool.slug, tool]));

/** Find a tool by its URL slug. */
export function getTool(slug: string): ToolDefinition | undefined {
  return bySlug.get(slug);
}

/** All tools belonging to a category. */
export function toolsByCategory(category: ToolCategory): ToolDefinition[] {
  return allTools.filter((tool) => tool.category === category);
}

export type { ToolDefinition, ToolCategory } from './types';
