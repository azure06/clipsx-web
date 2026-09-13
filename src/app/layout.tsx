import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { metadataBase: new URL(siteConfig.url) };

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
