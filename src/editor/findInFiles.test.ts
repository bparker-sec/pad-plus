import { describe, it, expect } from 'vitest';
import { buildMatcher, search } from './findInFiles';

const OPTS = { regex: false, caseSensitive: false, wholeWord: false };

describe('buildMatcher', () => {
  it('returns null for an empty query', () => {
    expect(buildMatcher('', OPTS)).toBeNull();
  });
  it('returns null for an invalid regex', () => {
    expect(buildMatcher('(', { ...OPTS, regex: true })).toBeNull();
  });
  it('escapes special chars in literal mode', () => {
    const re = buildMatcher('a.b', OPTS)!;
    expect(re.test('axb')).toBe(false);
    expect(re.test('a.b')).toBe(true);
  });
});

describe('search', () => {
  const doc = 'const Foo = 1;\nfunction foo() {}\n// foo again: foo';

  it('is case-insensitive by default and reports line/column', () => {
    const hits = search(doc, 'foo', OPTS);
    expect(hits.map((h) => [h.line, h.column])).toEqual([
      [1, 7], // Foo
      [2, 10], // foo (in function foo)
      [3, 4], // "// foo again: foo" -> first foo
      [3, 15], // -> second foo
    ]);
  });

  it('respects case sensitivity', () => {
    const hits = search(doc, 'Foo', { ...OPTS, caseSensitive: true });
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(1);
  });

  it('respects whole-word', () => {
    const hits = search('foobar foo foo_', 'foo', { ...OPTS, wholeWord: true });
    expect(hits).toHaveLength(1);
    expect(hits[0].column).toBe(8);
  });

  it('supports regex mode', () => {
    const hits = search('a1 b2 c3', '[a-z]\\d', { ...OPTS, regex: true });
    expect(hits).toHaveLength(3);
  });

  it('does not infinite-loop on a zero-width pattern', () => {
    const hits = search('abc', 'x*', { ...OPTS, regex: true });
    expect(hits.length).toBeGreaterThan(0);
  });

  it('returns nothing for an empty query', () => {
    expect(search(doc, '', OPTS)).toEqual([]);
  });
});
