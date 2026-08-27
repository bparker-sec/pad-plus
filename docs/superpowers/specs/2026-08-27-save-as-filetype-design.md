# Smarter Save-As Filetype — Design Spec

**Date:** 2026-08-27
**Status:** Approved
**Goal:** When saving an unsaved buffer to OneDrive, intelligently suggest a
filename **extension** and expose a "Save as type" selector, so users stop
accidentally saving extensionless files. Detection combines the buffer's
Language setting with lightweight content sniffing. SQL gets extra-robust
detection as a key use case.

---

## 1. Problem

New buffers are named `new 1`, `new 2`, … with `language: 'plaintext'`. The Save
dialog pre-fills the filename from `app.active?.name` — i.e. `new 1`, with **no
extension**. If the user doesn't add one, the file lands in OneDrive as an
extensionless blob with no language association and no syntax highlighting when
reopened.

## 2. Scope

**In scope**
- A pure, unit-tested `filetype` module: curated save types, a reverse
  language→extension map, content sniffing, a suggestion decision function, and
  an extension-application helper.
- Save-dialog UX: smart pre-filled filename (with extension), a "Save as type"
  selector, live two-way sync between selector and filename, and
  auto-application of the selected extension on save when none is typed.
- Strong SQL content detection.

**Out of scope (YAGNI)**
- Live language auto-detection while typing in the editor (save-time only).
- MIME/binary detection; this is a text editor.
- Renaming the `new N` base itself — we only fix the extension.
- Changing `commitSaveAs`'s signature or the post-save language mapping.

## 3. New module: `src/editor/filetype.ts`

Mirrors the existing `languages.ts` pure-logic + Vitest pattern.

- `SaveType { langId: string; label: string; ext: string }`.
- `SAVE_TYPES: SaveType[]` — curated ~15 common types the selector shows, each
  as `Label (.ext)`: Plain Text `.txt`, Markdown `.md`, JSON `.json`,
  JavaScript `.js`, TypeScript `.ts`, HTML `.html`, CSS `.css`, XML `.xml`,
  YAML `.yaml`, Python `.py`, Shell `.sh`, SQL `.sql`, INI `.ini`, CSV `.csv`,
  Log `.log`. Ordered with the most common text/code types first.
- `LANG_TO_EXT: Record<string, string>` — canonical (default) extension per
  Monaco language id, derived to stay consistent with `languages.ts`
  (`javascript→js`, `typescript→ts`, `markdown→md`, `python→py`, `sql→sql`, …).
- `sniffContent(content: string): string | null` — inspect the first ~2000
  chars and return a Monaco language id, or `null` when unsure. Checks run
  strongest-first so unambiguous structural formats win:
  1. Shebang: `#!/… bash|sh|zsh` → `shell`; `python` → `python`; `node` →
     `javascript`; `ruby` → `ruby`; `perl` → `perl`.
  2. `<?xml` → `xml`; `<!DOCTYPE html>` / `<html` → `html`; `<?php` → `php`.
  3. JSON: trimmed starts with `{` or `[` **and** `JSON.parse` succeeds → `json`
     (wrapped in try/catch).
  4. **SQL** (see §4) → `sql`.
  5. Weaker last: Markdown (headings/fences/links), YAML (`---` / `key:` lines).
- `suggestFileType({ name, language, content }): { langId, ext, label, source }`
  — precedence:
  1. If `name` already has a **known** extension → derive the type from it
     (respect what the user typed). `source: 'filename'`.
  2. Else if `language` is set and not `plaintext` → `LANG_TO_EXT[language]`.
     `source: 'language'`.
  3. Else `sniffContent(content)` → if detected. `source: 'content'`.
  4. Else Plain Text `.txt`. `source: 'default'`.
- `applyExtension(base: string, ext: string): string` — normalize a filename to
  the chosen extension: strip a trailing **known** code extension and apply
  `ext`, or append if there's none. Leaves unknown bases intact (e.g.
  `config.local` → `config.local.txt`, not `config.txt`). Handles empty base.
- `typeForFilename(name): SaveType | null` — map a filename's extension back to
  a `SAVE_TYPES` entry (drives selector↔filename sync).

## 4. SQL detection (key use case)

`sniffContent` treats SQL with a dedicated, scored check so real scripts are
caught while prose that merely mentions "select" is not.

**Strong signals — any one match ⇒ SQL** (case-insensitive):
- `SELECT … FROM` (within a reasonable span)
- `INSERT INTO`
- `UPDATE … SET`
- `DELETE FROM`
- `CREATE (TABLE|VIEW|INDEX|DATABASE|SCHEMA|PROCEDURE|FUNCTION|TRIGGER)`
- `ALTER TABLE`
- `DROP (TABLE|VIEW|INDEX|DATABASE)`
- `TRUNCATE TABLE`
- `MERGE INTO`
- `WITH … AS (` (CTE)

**Weak signals — scored, need ≥ 2** (avoids single-keyword false positives):
- `--` line comment (`/^\s*--/m`) or `/* … */` block comment
- Clauses: `WHERE`, `JOIN` / `INNER|LEFT|RIGHT JOIN`, `GROUP BY`, `ORDER BY`,
  `HAVING`, `UNION`, `VALUES`
- Constraints: `PRIMARY KEY`, `FOREIGN KEY`, `NOT NULL`, `DEFAULT`
- Statement terminator `;` at end of a line

Strong check runs before the weak Markdown/YAML checks so a `.sql` file that
happens to contain a `#` or `--` isn't misfiled. Unit tests cover DDL, DML,
CTEs, comment-led scripts, and negative cases (plain prose, markdown containing
the word "select").

## 5. Save dialog changes (`src/onedrive/OneDrivePicker.tsx`, save mode only)

- On open, compute `suggestFileType` from `app.active` (name, language,
  content). Pre-fill `filename` with `applyExtension(base, suggestion.ext)` when
  the current name lacks a known extension; a buffer that already has a real
  filename+extension is left unchanged.
- Add a compact **"Save as type" `<select>`** in the footer (above/beside the
  filename input), options = `SAVE_TYPES`, default = the suggestion.
- Live sync:
  - Selector change → rewrite the filename's extension via `applyExtension`.
  - Filename edit → if it ends in a known extension, update the selector to
    match (`typeForFilename`); otherwise leave the selector as chosen.
- On save, if the filename has no extension, apply the selected type's extension
  before calling `commitSaveAs` — extensionless saves become impossible by
  accident.
- Subtle hint under the input reading e.g. `Detected SQL from content` **only**
  when `source === 'content'`, to explain the smart default.

`commitSaveAs` is unchanged: it already sets the buffer language from the saved
filename via `languageForFilename`, so the chosen extension drives highlighting.

## 6. Testing

`src/editor/filetype.test.ts` (Vitest, `it.each` where it reads well):
- `sniffContent`: each shebang variant, XML/HTML/PHP, valid vs invalid JSON,
  markdown, YAML, and a dedicated SQL block (DDL, DML, CTE, comment-led,
  negatives).
- `suggestFileType`: precedence order (filename ext > language > content >
  default) and `source` labeling.
- `applyExtension`: append, replace known ext, preserve unknown base, empty
  base.
- `typeForFilename`: known/unknown extensions.

## 7. Trade-offs

- Content sniffing is heuristic — it can miss or, rarely, misclassify. Mitigated
  by precedence (an explicit extension or Language setting always wins) and by
  the always-editable selector + filename field. The suggestion is a default,
  never a lock.
- Reading only the first ~2 KB keeps sniffing cheap for large buffers at the
  cost of missing signals that appear only deep in a file — acceptable for the
  common case where the format is evident at the top.
