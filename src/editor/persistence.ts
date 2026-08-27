// Session persistence in IndexedDB (browser app-state, NOT the local filesystem).
// Keeps open tabs + unsaved buffers across relaunches so the app behaves like a
// desktop editor. OneDrive remains the only file store.
import type { DocState } from './documents';

const DB_NAME = 'npp-web';
const STORE = 'session';
const NAMED_STORE = 'named';
const KEY = 'current';
const VERSION = 2;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        if (!db.objectStoreNames.contains(NAMED_STORE)) {
          db.createObjectStore(NAMED_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveSession(state: DocState): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export async function loadSession(): Promise<DocState | null> {
  const db = await openDb();
  if (!db) return null;
  const result = await new Promise<DocState | null>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as DocState) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  db.close();
  return result;
}

export async function clearSession(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

// ---- Named sessions (explicit Save/Load, keyed by user-chosen name) ---------

export interface NamedSessionRecord {
  name: string;
  savedAt: string;
  state: DocState;
}

/** Summary rows for the Sessions list (no buffer content). */
export interface NamedSessionInfo {
  name: string;
  savedAt: string;
}

export async function saveNamedSession(
  name: string,
  state: DocState,
  savedAt: string,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(NAMED_STORE, 'readwrite');
      const rec: NamedSessionRecord = { name, savedAt, state };
      tx.objectStore(NAMED_STORE).put(rec, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export async function listNamedSessions(): Promise<NamedSessionInfo[]> {
  const db = await openDb();
  if (!db) return [];
  const rows = await new Promise<NamedSessionRecord[]>((resolve) => {
    try {
      const tx = db.transaction(NAMED_STORE, 'readonly');
      const req = tx.objectStore(NAMED_STORE).getAll();
      req.onsuccess = () => resolve((req.result as NamedSessionRecord[]) ?? []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
  db.close();
  return rows
    .map((r) => ({ name: r.name, savedAt: r.savedAt }))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function loadNamedSession(name: string): Promise<DocState | null> {
  const db = await openDb();
  if (!db) return null;
  const rec = await new Promise<NamedSessionRecord | null>((resolve) => {
    try {
      const tx = db.transaction(NAMED_STORE, 'readonly');
      const req = tx.objectStore(NAMED_STORE).get(name);
      req.onsuccess = () => resolve((req.result as NamedSessionRecord) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  db.close();
  return rec?.state ?? null;
}

export async function deleteNamedSession(name: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(NAMED_STORE, 'readwrite');
      tx.objectStore(NAMED_STORE).delete(name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
