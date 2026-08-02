import { describe, expect, it } from 'vitest';

import { parseEnvironmentPreview, redactEnvironmentValue } from './env-format';

describe('environment preview', () => {
  it('reads assignments without modifying the canonical source', () => {
    const source = '# production\nexport API_TOKEN = "abc def"\nEMPTY=\nINVALID LINE\n';
    expect(parseEnvironmentPreview(source)).toEqual([
      { line: 2, key: 'API_TOKEN', value: '"abc def"', raw: 'export API_TOKEN = "abc def"' },
      { line: 3, key: 'EMPTY', value: '', raw: 'EMPTY=' },
    ]);
    expect(source).toBe('# production\nexport API_TOKEN = "abc def"\nEMPTY=\nINVALID LINE\n');
  });

  it('redacts every non-empty value', () => {
    expect(redactEnvironmentValue('secret')).not.toContain('secret');
    expect(redactEnvironmentValue('')).toBe('(empty)');
  });
});
