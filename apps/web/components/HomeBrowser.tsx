'use client';

import { allTools, categories } from '@/lib/tools';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { ToolCard } from './ToolCard';

export function HomeBrowser() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTools.filter((tool) => {
      const matchesCategory = active === 'all' || tool.category === active;
      const matchesQuery =
        !q || tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, active]);

  const grouped = useMemo(() => {
    return categories
      .map((cat) => ({ cat, tools: filtered.filter((t) => t.category === cat.id) }))
      .filter((g) => g.tools.length > 0);
  }, [filtered]);

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 mb-6 bg-[hsl(var(--background))]/90 px-4 py-3 backdrop-blur">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            className="input pl-9"
            placeholder={`Search ${allTools.length} tools…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <CategoryChip
            label="All"
            icon="LayoutGrid"
            active={active === 'all'}
            onClick={() => setActive('all')}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.label}
              icon={cat.icon}
              active={active === cat.id}
              onClick={() => setActive(cat.id)}
            />
          ))}
        </div>
      </div>

      {grouped.length === 0 && (
        <p className="py-16 text-center text-[hsl(var(--muted-foreground))]">
          No tools match “{query}”.
        </p>
      )}

      <div className="space-y-10">
        {grouped.map(({ cat, tools }) => (
          <section key={cat.id}>
            <div className="mb-3 flex items-center gap-2">
              <Icon name={cat.icon} className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold">{cat.label}</h2>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                — {cat.description}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ' +
        (active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]')
      }
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
