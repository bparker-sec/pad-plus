// Regex-based symbol extraction for the Function List panel. Per-language regex
// rules keep it working without a language server and fully unit-testable.
// Pure — no Monaco.

export interface OutlineSymbol {
  name: string;
  line: number; // 1-based
  kind:
    'function' | 'class' | 'interface' | 'type' | 'enum' | 'heading' | 'rule';
}

interface Rule {
  re: RegExp;
  kind: OutlineSymbol['kind'];
  /** Capture group holding the display name (default 1). */
  group?: number;
}

const JS_TS: Rule[] = [
  {
    re: /^\s*(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/,
    kind: 'class',
  },
  { re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: 'interface' },
  { re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=/, kind: 'type' },
  {
    re: /^\s*(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/,
    kind: 'enum',
  },
  {
    re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/,
    kind: 'function',
  },
  {
    // const foo = () => / async () => / function / x =>
    re: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|[A-Za-z_$][\w$]*\s*=>)/,
    kind: 'function',
  },
];

const PYTHON: Rule[] = [
  { re: /^\s*class\s+([A-Za-z_]\w*)/, kind: 'class' },
  { re: /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/, kind: 'function' },
];

const MARKDOWN: Rule[] = [
  { re: /^(#{1,6})\s+(.+?)\s*#*$/, kind: 'heading', group: 2 },
];

const CSS: Rule[] = [{ re: /^\s*([^{}@/]+?)\s*\{\s*$/, kind: 'rule' }];

function rulesFor(language: string): Rule[] {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return JS_TS;
    case 'python':
      return PYTHON;
    case 'markdown':
      return MARKDOWN;
    case 'css':
    case 'scss':
    case 'less':
      return CSS;
    default:
      return [];
  }
}

/** Extract a flat, source-ordered symbol list from document text. */
export function extractSymbols(
  content: string,
  language: string,
): OutlineSymbol[] {
  const rules = rulesFor(language);
  if (!rules.length || !content) return [];
  const out: OutlineSymbol[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    for (const rule of rules) {
      const m = rule.re.exec(lines[i]);
      if (m) {
        const name = (m[rule.group ?? 1] ?? '').trim();
        if (name) out.push({ name, line: i + 1, kind: rule.kind });
        break; // one symbol per line
      }
    }
  }
  return out;
}
