// Output encodings the editor can convert a buffer to on save. Reading detects
// UTF-8 / UTF-8-BOM / UTF-16 LE / UTF-16 BE (see graph.ts detectEncodingEol);
// these are the encodings graph.ts encodeText can write.

export const ENCODINGS = [
  'UTF-8',
  'UTF-8-BOM',
  'UTF-16 LE',
  'UTF-16 BE',
  'Windows-1252',
] as const;

export type Encoding = (typeof ENCODINGS)[number];

const LABELS: Record<string, string> = {
  'UTF-8': 'UTF-8',
  'UTF-8-BOM': 'UTF-8 with BOM',
  'UTF-16 LE': 'UTF-16 LE',
  'UTF-16 BE': 'UTF-16 BE',
  'Windows-1252': 'Windows-1252 (ANSI)',
};

export function encodingLabel(encoding: string): string {
  return LABELS[encoding] ?? encoding;
}
