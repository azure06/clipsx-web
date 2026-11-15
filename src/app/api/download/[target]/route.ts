import { unavailableTargets } from '@/config/download';
import { siteConfig } from '@/config/site';
import { getPublishedRelease } from '@/lib/releases';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ target: string }> },
) {
  const { target } = await params;
  if (!unavailableTargets.some((item) => item.id === target)) {
    return new Response('Unknown download target', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const release = await getPublishedRelease();
  const installer = release?.targets.find((item) => item.id === target);
  const destination = installer?.status === 'available' && installer.url
    ? installer.url
    : siteConfig.releases;

  // Cache the verified manifest, not redirects or temporary upstream failures.
  return new Response(null, {
    status: 307,
    headers: { Location: destination, 'Cache-Control': 'no-store' },
  });
}
