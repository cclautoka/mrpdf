'use client';

import { checkBackendHealth } from '@/lib/api';
import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Status = 'checking' | 'online' | 'offline';

/**
 * Live backend status indicator shown on server-side tool pages.
 * Pings the backend's /health endpoint and only warns when it is unreachable.
 */
export function BackendNotice() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let active = true;
    checkBackendHealth().then((ok) => {
      if (active) setStatus(ok ? 'online' : 'offline');
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="mb-6 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking backend status…
      </div>
    );
  }

  if (status === 'online') {
    return (
      <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Backend connected
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        The conversion backend is currently unavailable. This tool needs the server to run — please
        try again in a moment.
      </span>
    </div>
  );
}
