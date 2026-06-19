import { BackendNotice } from '@/components/BackendNotice';
import { Icon } from '@/components/Icon';
import { ToolView } from '@/components/ToolView';
import { allTools, getTool } from '@/lib/tools';
import { Cloud, Laptop, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return allTools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: 'Tool not found — MR PDF' };
  return { title: `${tool.name} — MR PDF`, description: tool.description };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const isClient = tool.execution === 'client';

  return (
    <div>
      <nav className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>{' '}
        / <span className="capitalize">{tool.category}</span> / {tool.name}
      </nav>

      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30">
          <Icon name={tool.icon} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          <p className="mt-1 text-[hsl(var(--muted-foreground))]">{tool.description}</p>
          <div className="mt-3">
            {isClient ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Laptop className="h-3.5 w-3.5" />
                <ShieldCheck className="h-3.5 w-3.5" />
                Processed in your browser — files never uploaded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                <Cloud className="h-3.5 w-3.5" />
                Runs on the backend service
              </span>
            )}
          </div>
        </div>
      </div>

      {!isClient && <BackendNotice />}

      <ToolView slug={tool.slug} />
    </div>
  );
}
