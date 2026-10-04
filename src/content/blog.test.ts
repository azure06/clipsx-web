import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { blogPosts, blogText, readingMinutes } from './blog';
import { pick } from './marketing';

describe('published blog content', () => {
  it('keeps existing slugs and presents the selected dates newest first, two weeks apart', () => {
    expect(blogPosts.map(post => post.slug)).toEqual([
      'why-clipboard-extensions-need-boundaries', 'meaning-search-with-ollama', 'local-first-is-a-data-boundary',
    ]);
    expect(blogPosts.map(post => post.date)).toEqual(['2026-10-04', '2026-09-20', '2026-09-06']);
    for (let index = 1; index < blogPosts.length; index++) {
      expect(Date.parse(blogPosts[index - 1].date) - Date.parse(blogPosts[index].date)).toBe(14 * 86400000);
    }
  });

  it('provides complete localized guides, stable anchors, and reading estimates from their text', () => {
    for (const post of blogPosts) {
      const ids = post.sections.map(section => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every(id => /^[a-z][a-z0-9-]+$/.test(id))).toBe(true);
      expect(post.sections.length).toBeGreaterThanOrEqual(5);
      expect(blogText(post, 'en').split(/\s+/).length).toBeGreaterThanOrEqual(600);
      expect(blogText(post, 'en').split(/\s+/).length).toBeLessThanOrEqual(900);
      for (const locale of ['en', 'ja'] as const) {
        for (const section of post.sections) {
          expect(pick(section.title, locale)).toBeTruthy();
          expect(section.paragraphs.every(paragraph => pick(paragraph, locale).length > 30)).toBe(true);
        }
        expect(pick(post.takeaway, locale)).toBeTruthy();
        const units = locale === 'ja' ? Array.from(blogText(post, locale).replace(/\s/g, '')).length : blogText(post, locale).split(/\s+/).length;
        expect(readingMinutes(post, locale)).toBe(Math.ceil(units / (locale === 'ja' ? 500 : 220)));
      }
    }
  });

  it('uses distinct published WebP illustrations with dimensions and localized descriptions', async () => {
    expect(new Set(blogPosts.map(post => post.image.src)).size).toBe(blogPosts.length);
    for (const post of blogPosts) {
      const path = join(process.cwd(), 'public', post.image.src);
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
      expect(bytes.length).toBeLessThan(100000);
      expect(post.image).toMatchObject({ width: 1600, height: 900 });
      expect(await sharp(bytes).metadata()).toMatchObject({ width: post.image.width, height: post.image.height });
      for (const locale of ['en', 'ja'] as const) {
        expect(pick(post.image.alt, locale)).toBeTruthy();
        expect(pick(post.image.caption, locale)).toBeTruthy();
      }
    }
  });
});
