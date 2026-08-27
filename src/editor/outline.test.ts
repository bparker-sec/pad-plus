import { describe, it, expect } from 'vitest';
import { extractSymbols } from './outline';

describe('extractSymbols — JS/TS', () => {
  const src = [
    'import x from "y";',
    'export class Widget {',
    '  render() {}',
    '}',
    'interface Props {}',
    'type Id = string;',
    'enum Color { Red }',
    'function doThing(a) {}',
    'export const handler = () => {};',
    'const make = async () => {};',
    'let f = function () {};',
  ].join('\n');

  it('finds classes, interfaces, types, enums, functions, and arrow consts', () => {
    const syms = extractSymbols(src, 'typescript');
    expect(syms).toEqual([
      { name: 'Widget', line: 2, kind: 'class' },
      { name: 'Props', line: 5, kind: 'interface' },
      { name: 'Id', line: 6, kind: 'type' },
      { name: 'Color', line: 7, kind: 'enum' },
      { name: 'doThing', line: 8, kind: 'function' },
      { name: 'handler', line: 9, kind: 'function' },
      { name: 'make', line: 10, kind: 'function' },
      { name: 'f', line: 11, kind: 'function' },
    ]);
  });

  it('does not match control-flow keywords as functions', () => {
    const syms = extractSymbols('if (x) {\n  while (y) {}\n}', 'javascript');
    expect(syms).toEqual([]);
  });
});

describe('extractSymbols — Python & Markdown', () => {
  it('finds def and class in python', () => {
    const syms = extractSymbols('class A:\n    def method(self):\n        pass', 'python');
    expect(syms).toEqual([
      { name: 'A', line: 1, kind: 'class' },
      { name: 'method', line: 2, kind: 'function' },
    ]);
  });

  it('finds markdown headings by text', () => {
    const syms = extractSymbols('# Title\n\nbody\n## Section', 'markdown');
    expect(syms).toEqual([
      { name: 'Title', line: 1, kind: 'heading' },
      { name: 'Section', line: 4, kind: 'heading' },
    ]);
  });
});

describe('extractSymbols — unsupported / empty', () => {
  it('returns nothing for unknown languages', () => {
    expect(extractSymbols('anything', 'plaintext')).toEqual([]);
  });
  it('handles empty content', () => {
    expect(extractSymbols('', 'typescript')).toEqual([]);
  });
});
