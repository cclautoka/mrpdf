'use client';

import { FileText, Github } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <FileText className="h-4 w-4" />
          </span>
          MR PDF
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost h-9 w-9 p-0"
            aria-label="GitHub repository"
          >
            <Github className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
