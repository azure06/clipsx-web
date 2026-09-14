'use client';

import { useEffect, useState } from 'react';
import { GitHubIcon } from '@/components/auth/ProviderIcon';
import { siteConfig } from '@/config/site';

const repository = new URL(siteConfig.repository).pathname.slice(1);
const repositoryApi = `https://api.github.com/repos/${repository}`;

function formatStars(stars: number) {
  return new Intl.NumberFormat('en').format(stars);
}

export function GitHubRepositoryLink({ className, label }: { className: string; label: string }) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(repositoryApi, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(async (response) => response.ok ? response.json() as Promise<{ stargazers_count?: unknown }> : null)
      .then((repository) => {
        if (typeof repository?.stargazers_count === 'number') setStars(repository.stargazers_count);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <a href={siteConfig.repository} target="_blank" rel="noreferrer" className={className}>
      <GitHubIcon />
      {stars !== null && <span aria-hidden="true" className="tabular-nums">{formatStars(stars)}</span>}
      <span className="sr-only">{label}{stars === null ? '' : `, ${formatStars(stars)} stars`}</span>
    </a>
  );
}
