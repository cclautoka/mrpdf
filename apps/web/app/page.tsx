import { HomeBrowser } from '@/components/HomeBrowser';
import { allTools } from '@/lib/tools';
import { ShieldCheck, Sparkles, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      <section className="mb-10 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Every PDF tool you need, <span className="text-brand-600">in one place</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--muted-foreground))]">
          {allTools.length} free, open-source tools to convert, edit, organize, and secure your
          PDFs. Most run entirely in your browser — your files never leave your device.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Privacy-first" />
          <Feature icon={<Zap className="h-4 w-4" />} text="Fast, no signup" />
          <Feature icon={<Sparkles className="h-4 w-4" />} text="100% open source" />
        </div>
      </section>

      <HomeBrowser />
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-3 py-1.5">
      <span className="text-brand-600">{icon}</span>
      {text}
    </span>
  );
}
