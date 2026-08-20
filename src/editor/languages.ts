// Filename → Monaco language id mapping, plus a curated list for the picker.

export interface LanguageOption {
  id: string;
  label: string;
}

const EXT_TO_LANG: Record<string, string> = {
  txt: 'plaintext',
  log: 'plaintext',
  md: 'markdown',
  markdown: 'markdown',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  jsonc: 'json',
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  vue: 'html',
  svelte: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  xml: 'xml',
  svg: 'xml',
  xsl: 'xml',
  xsd: 'xml',
  py: 'python',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  bat: 'bat',
  cmd: 'bat',
  ps1: 'powershell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  sql: 'sql',
  lua: 'lua',
  pl: 'perl',
  pm: 'perl',
  r: 'r',
  dart: 'dart',
  scala: 'scala',
  clj: 'clojure',
  ex: 'elixir',
  exs: 'elixir',
  graphql: 'graphql',
  gql: 'graphql',
  diff: 'plaintext',
  patch: 'plaintext',
};

const SPECIAL_FILENAMES: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  '.gitignore': 'plaintext',
  '.env': 'ini',
};

export function languageForFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? name).toLowerCase();
  if (base in SPECIAL_FILENAMES) return SPECIAL_FILENAMES[base];
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return 'plaintext';
  const ext = base.slice(dot + 1);
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

// Curated set shown in the Language selector (labels shown to users).
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'plaintext', label: 'Plain Text' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'json', label: 'JSON' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
  { id: 'xml', label: 'XML' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'php', label: 'PHP' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'shell', label: 'Shell' },
  { id: 'powershell', label: 'PowerShell' },
  { id: 'yaml', label: 'YAML' },
  { id: 'ini', label: 'INI / TOML' },
  { id: 'sql', label: 'SQL' },
];

export function languageLabel(id: string): string {
  return LANGUAGE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
