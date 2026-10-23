import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HomeWorkflows } from './HomeWorkflows';
import { workflowExamples } from '@/content/workflow-examples';
vi.mock('@/i18n/routing', () => ({ Link: ({href, children, ...props}: ComponentProps<'a'>) => <a href={href} {...props}>{children}</a> }));
describe('role-based Home workflows', () => {
 it.each(['en','ja'] as const)('connects grounded tasks to evidence and setup in %s', locale => {
  const html=renderToStaticMarkup(<HomeWorkflows locale={locale}/>);
  expect(html).toContain(workflowExamples[locale].preview);
  expect(html).toContain('search_clips');
  expect(html).toContain('read_clip');
  expect(html).toContain(workflowExamples[locale].sources[0]);
  expect(html).toContain('/product#decision-rules');
  expect(html).toContain('/recall#integrations');
  expect(html).toContain(locale==='ja'?'未確認事項':'unanswered questions');
  expect(html).not.toContain('<form');
 });
});
