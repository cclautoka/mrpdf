'use client';

import type { ToolDefinition } from '@/lib/tools/types';
import { cn } from '@mr-pdf/ui';
import { Cloud, Laptop } from 'lucide-react';
import Link from 'next/link';
import { Icon } from './Icon';

const badge: Record<ToolDefinition['execution'], { label: string; icon: typeof Cloud }> = {
  client: { label: 'In-browser', icon: Laptop },
  server: { label: 'Server', icon: Cloud },
  hybrid: { label: 'Hybrid', icon: Cloud },
};

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const b = badge[tool.execution];
  return (
    <Link
      href={`/tool/${tool.slug}`}
      className="surface group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30">
          <Icon name={tool.icon} className="h-5 w-5" />
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
            tool.execution === 'client'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
          )}
        >
          <b.icon className="h-3 w-3" />
          {b.label}
        </span>
      </div>
      <div>
        <h3 className="font-semibold group-hover:text-brand-600">{tool.name}</h3>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{tool.description}</p>
      </div>
    </Link>
  );
}
