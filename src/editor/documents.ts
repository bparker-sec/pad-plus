// Pure document/tab model + reducer. No Monaco, no React — fully unit-testable.

export type Eol = 'LF' | 'CRLF';

export interface Buffer {
  id: string;
  name: string;
  /** Set once the buffer is bound to a OneDrive file. */
  oneDriveItemId?: string;
  /** OneDrive parent folder id (for re-save / display). */
  parentId?: string;
  /** Human-readable path for the status bar / tooltip. */
  path?: string;
  content: string;
  /** Last content synced to OneDrive; drives dirty tracking. */
  savedContent: string;
  language: string;
  encoding: string;
  eol: Eol;
}

export interface DocState {
  buffers: Buffer[];
  activeId: string | null;
}

export const emptyState: DocState = { buffers: [], activeId: null };

export function isDirty(b: Buffer): boolean {
  return b.content !== b.savedContent;
}

export function activeBuffer(state: DocState): Buffer | null {
  return state.buffers.find((b) => b.id === state.activeId) ?? null;
}

export function makeId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Deterministic-enough fallback for environments without WebCrypto.
  return `buf-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export interface BufferInit {
  id?: string;
  name?: string;
  content?: string;
  language?: string;
  eol?: Eol;
  encoding?: string;
  oneDriveItemId?: string;
  parentId?: string;
  path?: string;
}

export function createBuffer(init: BufferInit = {}): Buffer {
  const content = init.content ?? '';
  return {
    id: init.id ?? makeId(),
    name: init.name ?? 'new 1',
    oneDriveItemId: init.oneDriveItemId,
    parentId: init.parentId,
    path: init.path,
    content,
    savedContent: content,
    language: init.language ?? 'plaintext',
    encoding: init.encoding ?? 'UTF-8',
    eol: init.eol ?? 'LF',
  };
}

/** Next untitled name given current buffers ("new 1", "new 2", ...). */
export function nextUntitledName(buffers: Buffer[]): string {
  let n = 1;
  const names = new Set(buffers.map((b) => b.name));
  while (names.has(`new ${n}`)) n += 1;
  return `new ${n}`;
}

export type DocAction =
  | { type: 'HYDRATE'; state: DocState }
  | { type: 'ADD'; buffer: Buffer; activate?: boolean }
  | { type: 'CLOSE'; id: string }
  | { type: 'SELECT'; id: string }
  | { type: 'UPDATE_CONTENT'; id: string; content: string }
  | {
      type: 'SAVED';
      id: string;
      oneDriveItemId: string;
      parentId?: string;
      name?: string;
      path?: string;
    }
  | { type: 'SET_LANGUAGE'; id: string; language: string }
  | { type: 'SET_EOL'; id: string; eol: Eol }
  | { type: 'SET_ENCODING'; id: string; encoding: string }
  | { type: 'RENAME'; id: string; name: string };

function mapBuffer(
  state: DocState,
  id: string,
  fn: (b: Buffer) => Buffer,
): DocState {
  let changed = false;
  const buffers = state.buffers.map((b) => {
    if (b.id !== id) return b;
    const next = fn(b);
    if (next !== b) changed = true;
    return next;
  });
  return changed ? { ...state, buffers } : state;
}

export function documentsReducer(state: DocState, action: DocAction): DocState {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'ADD': {
      const buffers = [...state.buffers, action.buffer];
      const activeId =
        action.activate === false ? state.activeId : action.buffer.id;
      return { buffers, activeId };
    }

    case 'CLOSE': {
      const idx = state.buffers.findIndex((b) => b.id === action.id);
      if (idx === -1) return state;
      const buffers = state.buffers.filter((b) => b.id !== action.id);
      let activeId = state.activeId;
      if (state.activeId === action.id) {
        if (buffers.length === 0) activeId = null;
        else activeId = buffers[Math.min(idx, buffers.length - 1)].id;
      }
      return { buffers, activeId };
    }

    case 'SELECT':
      return state.buffers.some((b) => b.id === action.id)
        ? { ...state, activeId: action.id }
        : state;

    case 'UPDATE_CONTENT':
      return mapBuffer(state, action.id, (b) =>
        b.content === action.content ? b : { ...b, content: action.content },
      );

    case 'SAVED':
      return mapBuffer(state, action.id, (b) => ({
        ...b,
        oneDriveItemId: action.oneDriveItemId,
        parentId: action.parentId ?? b.parentId,
        name: action.name ?? b.name,
        path: action.path ?? b.path,
        savedContent: b.content,
      }));

    case 'SET_LANGUAGE':
      return mapBuffer(state, action.id, (b) =>
        b.language === action.language
          ? b
          : { ...b, language: action.language },
      );

    case 'SET_EOL':
      return mapBuffer(state, action.id, (b) =>
        b.eol === action.eol ? b : { ...b, eol: action.eol },
      );

    case 'SET_ENCODING':
      return mapBuffer(state, action.id, (b) =>
        b.encoding === action.encoding
          ? b
          : { ...b, encoding: action.encoding },
      );

    case 'RENAME':
      return mapBuffer(state, action.id, (b) =>
        b.name === action.name ? b : { ...b, name: action.name },
      );

    default:
      return state;
  }
}
