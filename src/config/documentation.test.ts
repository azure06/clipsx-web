import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { documentationConfig, getDocumentationConfig, localizeDocumentationUrl } from './site';
import { footerNav, mainNavLinks } from './nav';

const config = JSON.parse(readFileSync('docs.json', 'utf8'));
const userPages = ['index', 'getting-started', 'platform-support', 'core-workflows',
  'local-ai', 'meaning-search', 'recall', 'extensions', 'sync', 'privacy', 'troubleshooting'];

describe('documentation journey', () => {
  it('preserves English URLs and localizes user guides without rewriting other destinations', () => {
    expect(getDocumentationConfig('en')).toEqual(documentationConfig);
    expect(getDocumentationConfig('ja').root).toBe('https://docs.clipsx.app/ja/index');
    expect(getDocumentationConfig('ja').meaningSearch).toBe('https://docs.clipsx.app/ja/meaning-search');
    expect(getDocumentationConfig('ja').developerExtensions).toBe(documentationConfig.developerExtensions);
    expect(localizeDocumentationUrl(documentationConfig.localAi + '#generation-models', 'ja'))
      .toBe('https://docs.clipsx.app/ja/local-ai#generation-models');
    for (const href of ['/product', 'https://ollama.com/library/gemma3', 'https://docs.clipsx.app/ja/local-ai']) {
      expect(localizeDocumentationUrl(href, 'ja')).toBe(href);
    }
  });

  it('routes header and footer Docs to the localized introduction', () => {
    for (const item of [...mainNavLinks, ...footerNav.company].filter(item => item.href === documentationConfig.root)) {
      expect(localizeDocumentationUrl(item.href, 'ja')).toBe(getDocumentationConfig('ja').root);
    }
  });

  it('publishes matching user pages and stable deep-link targets in both languages', () => {
    for (const prefix of ['', 'ja/']) {
      for (const page of userPages) expect(existsSync(prefix + page + '.mdx')).toBe(true);
      const ai = readFileSync(prefix + 'local-ai.mdx', 'utf8');
      for (const id of ['starting-setup', 'embedding-models', 'generation-models', 'recovery']) {
        expect(ai).toContain('{#' + id + '}');
      }
      expect(readFileSync(prefix + 'meaning-search.mdx', 'utf8')).toContain('{#first-result}');
      expect(readFileSync(prefix + 'recall.mdx', 'utf8')).toContain('{#first-answer}');
      expect(readFileSync(prefix + 'extensions.mdx', 'utf8')).toContain('{#rewrite}');
    }
    expect(config.navigation.languages.map((language: { language: string }) => language.language)).toEqual(['en', 'ja']);
    expect(config.seo.metatags).not.toHaveProperty('canonical');
  });
});
