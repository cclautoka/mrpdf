import { Header } from '@/components/Header';
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'MR PDF — Free Open-Source PDF Tools',
  description:
    'The full suite of PDF tools: merge, split, convert, compress, edit, sign, OCR and more. Privacy-first, processed in your browser where possible.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mt-16 border-t border-[hsl(var(--border))] py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            MR PDF — open source under the MIT license. Files stay on your device for in-browser
            tools.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
