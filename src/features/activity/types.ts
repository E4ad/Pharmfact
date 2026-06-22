import type { ReactNode } from 'react';

export type QuickAction = {
  title: string;
  description?: string;
  href: string;
  icon: ReactNode;
  badge?: string;
  testId: string;
  primary?: boolean;
};
