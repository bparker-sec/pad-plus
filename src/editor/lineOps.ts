// Pure line-transform helpers used by the editor's Line Operations. Kept
// Monaco-free so they're unit-testable; MonacoPane applies them to the model.

/** Remove duplicate lines, keeping the first occurrence and preserving order. */
export function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/** Sort lines lexicographically (locale-aware); descending reverses the order. */
export function sortLines(
  lines: string[],
  opts: { descending?: boolean } = {},
): string[] {
  const asc = (a: string, b: string) => a.localeCompare(b);
  return [...lines].sort(opts.descending ? (a, b) => asc(b, a) : asc);
}

/** Strip trailing spaces/tabs from every line. */
export function trimTrailing(lines: string[]): string[] {
  return lines.map((l) => l.replace(/[ \t]+$/, ''));
}
