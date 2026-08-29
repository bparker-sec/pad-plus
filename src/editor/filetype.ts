// Save-As filetype intelligence. Given a buffer's name, Language setting, and
// content, suggest a sensible filename extension and drive the "Save as type"
// selector. Pure + fully unit-tested — no Monaco, no React.

import { languageForFilename, languageLabel } from './languages';

export interface SaveType {
  /** Monaco language id (for reference; the ext is the stable key). */
  langId: string;
  label: string;
  ext: string;
}

// Curated list shown in the Save-as-type selector, most common first. Keyed by
// `ext` (unique); langId is informational — the saved extension drives the
// buffer language via languageForFilename after save.
export const SAVE_TYPES: SaveType[] = [
  { langId: 'plaintext', label: 'Plain Text', ext: 'txt' },
  { langId: 'markdown', label: 'Markdown', ext: 'md' },
  { langId: 'sql', label: 'SQL', ext: 'sql' },
  { langId: 'json', label: 'JSON', ext: 'json' },
  { langId: 'javascript', label: 'JavaScript', ext: 'js' },
  { langId: 'typescript', label: 'TypeScript', ext: 'ts' },
  { langId: 'html', label: 'HTML', ext: 'html' },
  { langId: 'css', label: 'CSS', ext: 'css' },
  { langId: 'scss', label: 'SCSS', ext: 'scss' },
  { langId: 'xml', label: 'XML', ext: 'xml' },
  { langId: 'yaml', label: 'YAML', ext: 'yaml' },
  { langId: 'python', label: 'Python', ext: 'py' },
  { langId: 'shell', label: 'Shell', ext: 'sh' },
  { langId: 'powershell', label: 'PowerShell', ext: 'ps1' },
  { langId: 'java', label: 'Java', ext: 'java' },
  { langId: 'c', label: 'C', ext: 'c' },
  { langId: 'cpp', label: 'C++', ext: 'cpp' },
  { langId: 'csharp', label: 'C#', ext: 'cs' },
  { langId: 'go', label: 'Go', ext: 'go' },
  { langId: 'rust', label: 'Rust', ext: 'rs' },
  { langId: 'php', label: 'PHP', ext: 'php' },
  { langId: 'ruby', label: 'Ruby', ext: 'rb' },
  { langId: 'ini', label: 'INI / TOML', ext: 'ini' },
  { langId: 'csv', label: 'CSV', ext: 'csv' },
  { langId: 'plaintext', label: 'Log', ext: 'log' },
];

// Canonical (default) extension per Monaco language id. Covers every language
// LANGUAGE_OPTIONS offers plus everything sniffContent can return.
const LANG_TO_EXT: Record<string, string> = {
  plaintext: 'txt',
  markdown: 'md',
  javascript: 'js',
  typescript: 'ts',
  json: 'json',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  xml: 'xml',
  python: 'py',
  ruby: 'rb',
  php: 'php',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
  kotlin: 'kt',
  swift: 'swift',
  shell: 'sh',
  bat: 'bat',
  powershell: 'ps1',
  yaml: 'yaml',
  ini: 'ini',
  sql: 'sql',
  lua: 'lua',
  perl: 'pl',
  r: 'r',
  dart: 'dart',
  scala: 'scala',
  clojure: 'clj',
  elixir: 'ex',
  graphql: 'graphql',
};

// Text extensions we treat as "known" even though they map to plaintext, so a
// user-typed `notes.txt` / `server.log` / `data.csv` is respected, not re-suffixed.
const TEXT_EXTS = new Set(['txt', 'text', 'log', 'csv', 'tsv', 'dat']);

/** The lowercased extension of a filename, or null if it has none. */
function extensionOf(name: string): string | null {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return null; // no dot, or a leading-dot dotfile like ".env"
  const ext = base.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : null;
}

/** True when the name carries any plausible extension. */
export function hasExtension(name: string): boolean {
  return extensionOf(name) !== null;
}

function isKnownExt(ext: string): boolean {
  return TEXT_EXTS.has(ext) || languageForFilename(`x.${ext}`) !== 'plaintext';
}

/** The recognized extension already on the name, or null. */
function knownExt(name: string): string | null {
  const ext = extensionOf(name);
  return ext && isKnownExt(ext) ? ext : null;
}

/** The SAVE_TYPES entry matching a filename's extension, or null. */
export function typeForFilename(name: string): SaveType | null {
  const ext = extensionOf(name);
  if (!ext) return null;
  return SAVE_TYPES.find((t) => t.ext === ext) ?? null;
}

/**
 * Normalize `base` to carry `ext`: replace a known code/text extension, or
 * append when there's none. Leaves unknown bases intact
 * (`config.local` → `config.local.txt`, never `config.txt`).
 */
export function applyExtension(base: string, ext: string): string {
  const trimmed = base.trim();
  if (!trimmed) return `untitled.${ext}`;
  const existing = knownExt(trimmed);
  if (existing) {
    const dot = trimmed.lastIndexOf('.');
    return `${trimmed.slice(0, dot)}.${ext}`;
  }
  return `${trimmed}.${ext}`;
}

// --- Content sniffing ------------------------------------------------------

const SNIFF_LIMIT = 2000; // chars of head inspected by the regex checks
const JSON_PARSE_LIMIT = 2_000_000; // don't attempt to parse absurdly large blobs

/**
 * Guess a Monaco language id from raw content, or null when unsure. Strongest,
 * least-ambiguous formats are checked first.
 */
export function sniffContent(content: string): string | null {
  const raw = content.slice(0, SNIFF_LIMIT);
  // Strip a leading UTF-8 BOM (U+FEFF) so the first-line checks still match.
  const head = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const trimmed = head.trimStart();
  if (!trimmed) return null;

  // 1. Shebang (first line).
  const shebang = /^#!.*\b(bash|zsh|sh|python\d?|node|ruby|perl)\b/.exec(
    trimmed,
  );
  if (shebang) {
    const tool = shebang[1];
    if (tool.startsWith('python')) return 'python';
    if (tool === 'node') return 'javascript';
    if (tool === 'ruby') return 'ruby';
    if (tool === 'perl') return 'perl';
    return 'shell'; // bash / zsh / sh
  }

  // 2. Structural markup.
  if (/^<\?xml\b/i.test(trimmed)) return 'xml';
  if (/^<\?php\b/i.test(trimmed)) return 'php';
  if (/^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return 'html';
  }

  // 3. JSON — structural start plus a real parse (of the full, bounded text).
  if (/^[[{]/.test(trimmed) && content.length <= JSON_PARSE_LIMIT) {
    try {
      JSON.parse(content.trim());
      return 'json';
    } catch {
      /* not valid JSON — fall through */
    }
  }

  // 4. SQL — a key use case, so dedicated strong + scored heuristics.
  if (looksLikeSql(head)) return 'sql';

  // 5. Weaker last: markdown, then yaml.
  if (looksLikeMarkdown(head)) return 'markdown';
  if (looksLikeYaml(head)) return 'yaml';

  return null;
}

/** SQL detection: any strong statement wins; otherwise ≥2 weak signals. */
function looksLikeSql(text: string): boolean {
  const strong = [
    // SELECT anchored to a statement start (line begin / open paren) so prose
    // like "select an option from the menu" doesn't match.
    /(^|\n)[ \t]*\(?[ \t]*select\b[\s\S]{0,400}?\bfrom\b/i,
    /\binsert\s+into\b/i,
    /\bupdate\b[\s\S]{0,200}\bset\b/i,
    /\bdelete\s+from\b/i,
    /\bcreate\s+(?:or\s+replace\s+)?(?:table|view|index|database|schema|procedure|function|trigger)\b/i,
    /\balter\s+table\b/i,
    /\bdrop\s+(?:table|view|index|database|schema)\b/i,
    /\btruncate\s+table\b/i,
    /\bmerge\s+into\b/i,
    /\bwith\b[\s\S]{0,120}\bas\s*\(/i, // CTE
  ];
  if (strong.some((re) => re.test(text))) return true;

  let score = 0;
  if (/(^|\n)\s*--[ \t]/.test(text) || /\/\*[\s\S]*?\*\//.test(text)) score++;
  if (/\bwhere\b/i.test(text)) score++;
  if (/\b(?:inner|left|right|full|cross)?\s*join\b/i.test(text)) score++;
  if (/\bgroup\s+by\b|\border\s+by\b|\bhaving\b/i.test(text)) score++;
  if (/\bunion\b/i.test(text) || /\bvalues\s*\(/i.test(text)) score++;
  if (/\b(?:primary|foreign)\s+key\b|\bnot\s+null\b/i.test(text)) score++;
  if (/;\s*(?:\n|$)/.test(text)) score++;
  return score >= 2;
}

function looksLikeMarkdown(text: string): boolean {
  if (/(^|\n)#{1,6}\s+\S/.test(text)) return true; // # Heading
  if (/(^|\n)```/.test(text)) return true; // fenced code block
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) return true; // [label](url)
  return false;
}

function looksLikeYaml(text: string): boolean {
  if (/^---\s*$/m.test(text)) return true; // document marker
  const lines = text.split('\n').slice(0, 40);
  const kv = lines.filter(
    (l) => /^[A-Za-z0-9_-]+:\s+\S/.test(l) || /^[A-Za-z0-9_-]+:\s*$/.test(l),
  ).length;
  return kv >= 2;
}

// --- Suggestion ------------------------------------------------------------

export type SuggestSource = 'filename' | 'language' | 'content' | 'default';

export interface FileTypeSuggestion {
  langId: string;
  ext: string;
  label: string;
  source: SuggestSource;
}

/**
 * Suggest a filetype for saving. Precedence: an explicit known extension in the
 * name → the tab's Language setting → a content sniff → Plain Text.
 */
export function suggestFileType(input: {
  name?: string;
  language?: string;
  content?: string;
}): FileTypeSuggestion {
  const { name = '', language = 'plaintext', content = '' } = input;

  const ext = knownExt(name);
  if (ext) return finalize(languageForFilename(`x.${ext}`), ext, 'filename');

  if (language && language !== 'plaintext' && LANG_TO_EXT[language]) {
    return finalize(language, LANG_TO_EXT[language], 'language');
  }

  const sniffed = sniffContent(content);
  if (sniffed && LANG_TO_EXT[sniffed]) {
    return finalize(sniffed, LANG_TO_EXT[sniffed], 'content');
  }

  return finalize('plaintext', 'txt', 'default');
}

function finalize(
  langId: string,
  ext: string,
  source: SuggestSource,
): FileTypeSuggestion {
  const label =
    SAVE_TYPES.find((t) => t.ext === ext)?.label ?? languageLabel(langId);
  return { langId, ext, label, source };
}
