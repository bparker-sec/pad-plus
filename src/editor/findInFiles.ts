// Pure text search used by Find in Files. Builds a matcher from the query +
// options and scans content line by line. No Monaco, no network — unit-testable.

export interface SearchOptions {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface LineMatch {
  line: number; // 1-based
  column: number; // 1-based
  preview: string; // the (trimmed) line text
}

const MAX_PREVIEW = 200;
const MAX_MATCHES_PER_FILE = 500;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a global RegExp from the query, or null if the query is empty or an
 * invalid regex.
 */
export function buildMatcher(
  query: string,
  opts: SearchOptions,
): RegExp | null {
  if (!query) return null;
  let pattern = opts.regex ? query : escapeRegExp(query);
  if (opts.wholeWord) pattern = `\\b(?:${pattern})\\b`;
  const flags = `g${opts.caseSensitive ? '' : 'i'}`;
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null; // invalid user-supplied regex
  }
}

/** All matches of `matcher` in `content`, capped per file. */
export function searchContent(content: string, matcher: RegExp): LineMatch[] {
  const out: LineMatch[] = [];
  const lines = content.split(/\r?\n/);
  for (
    let i = 0;
    i < lines.length && out.length < MAX_MATCHES_PER_FILE;
    i += 1
  ) {
    const line = lines[i];
    matcher.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = matcher.exec(line)) !== null) {
      out.push({
        line: i + 1,
        column: m.index + 1,
        preview:
          line.length > MAX_PREVIEW ? `${line.slice(0, MAX_PREVIEW)}…` : line,
      });
      if (out.length >= MAX_MATCHES_PER_FILE) break;
      if (m.index === matcher.lastIndex) matcher.lastIndex += 1; // zero-width guard
    }
  }
  return out;
}

/** Convenience: build the matcher and search in one call. */
export function search(
  content: string,
  query: string,
  opts: SearchOptions,
): LineMatch[] {
  const matcher = buildMatcher(query, opts);
  return matcher ? searchContent(content, matcher) : [];
}
