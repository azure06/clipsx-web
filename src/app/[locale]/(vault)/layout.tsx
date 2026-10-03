import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { vaultPreviewEnabled } from '@/lib/vault/release';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function VaultGroupLayout({ children }: { children: React.ReactNode }) {
  if (!vaultPreviewEnabled()) notFound();
  return <>{children}</>;
}
