/** Renders a lucide-react icon by name, with a safe fallback. */
'use client';

import { icons, type LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
}

export function Icon({ name, ...props }: IconProps) {
  const LucideIcon = icons[name as keyof typeof icons] ?? icons.FileText;
  return <LucideIcon {...props} />;
}
