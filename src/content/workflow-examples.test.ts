import { describe, it, expect } from 'vitest';
import { initialExampleState, selectExample, workflowExamples } from './workflow-examples';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { WorkflowDemo } from '@/components/marketing/WorkflowDemo';
describe('workflow illustrations', () => {
 it('preserves the original while changing operations and sources', () => {
  expect(selectExample(initialExampleState, 'operation', 2)).toEqual({...initialExampleState, operation:2});
  expect(selectExample(initialExampleState, 'source', 1).source).toBe(1);
  expect(selectExample(initialExampleState, 'matching', false).matching).toBe(false);
  expect(selectExample(initialExampleState, 'operation', 99)).toBe(initialExampleState);
 });
 it.each(['en', 'ja'] as const)('renders useful static defaults in %s', locale => {
  const c = workflowExamples[locale];
  for (const kind of ['meaning','recall','rewrite','decision','assistant'] as const) {
   const html=renderToStaticMarkup(createElement(WorkflowDemo,{locale,kind}));
   expect(html).toContain(c.illustrative);
   if(kind==='rewrite') {expect(html).toContain(c.originalText);expect(html).toContain(c.outputs[0]);}
   if(kind==='decision') expect(html).toContain(c.yes.replace('→','→'));
   if(kind==='assistant') { expect(html).toContain('search_clips'); expect(html).toContain('read_clip'); expect(html).toContain(c.sources[0]); }
   if(kind==='recall') {expect(html).toContain(c.sources[0]);expect(html).toContain('aria-pressed="true"');}
  }
  expect(c.outputs).toHaveLength(3);
  expect(c.preview).toBeTruthy();
 });
});
