import { notFound } from 'next/navigation';
import { vaultPreviewEnabled } from '@/lib/vault/release';

export default function VaultGroupLayout({ children }: { children: React.ReactNode }) {
  if (!vaultPreviewEnabled()) notFound();
  return <>{children}</>;
}
