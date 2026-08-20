import { describe, it, expect } from 'vitest';
import { languageForFilename, languageLabel } from './languages';

describe('languageForFilename', () => {
  it.each([
    ['notes.txt', 'plaintext'],
    ['app.ts', 'typescript'],
    ['index.tsx', 'typescript'],
    ['main.js', 'javascript'],
    ['data.json', 'json'],
    ['page.html', 'html'],
    ['style.scss', 'scss'],
    ['script.py', 'python'],
    ['Program.cs', 'csharp'],
    ['server.go', 'go'],
    ['README.md', 'markdown'],
    ['query.SQL', 'sql'],
  ])('maps %s → %s', (name, expected) => {
    expect(languageForFilename(name)).toBe(expected);
  });

  it('handles special filenames without extensions', () => {
    expect(languageForFilename('Dockerfile')).toBe('dockerfile');
    expect(languageForFilename('Makefile')).toBe('makefile');
  });

  it('falls back to plaintext for unknown or missing extensions', () => {
    expect(languageForFilename('binary')).toBe('plaintext');
    expect(languageForFilename('weird.zzz')).toBe('plaintext');
    expect(languageForFilename('.hiddenonly')).toBe('plaintext');
  });

  it('uses the last path segment', () => {
    expect(languageForFilename('/OneDrive/docs/report.md')).toBe('markdown');
  });
});

describe('languageLabel', () => {
  it('returns the friendly label or the raw id', () => {
    expect(languageLabel('typescript')).toBe('TypeScript');
    expect(languageLabel('unknownlang')).toBe('unknownlang');
  });
});
