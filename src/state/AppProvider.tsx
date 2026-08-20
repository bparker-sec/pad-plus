import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  documentsReducer,
  createBuffer,
  activeBuffer,
  nextUntitledName,
  emptyState,
  type Buffer,
  type DocState,
  type Eol,
} from '../editor/documents';
import { loadSession, saveSession } from '../editor/persistence';
import {
  readFile,
  saveExisting,
  saveNew,
  GraphError,
  type DriveItem,
} from '../onedrive/graph';
import {
  oneDriveAuth,
  trySilentOneDrive,
  signInOneDrive,
  signOutOneDrive,
} from '../onedrive/auth';
import {
  sdkGetUser,
  sdkGetBranding,
  sdkTrack,
  type UserInfo,
  type BrandingAssets,
} from '../sdk/client';
import { languageForFilename } from '../editor/languages';
import { NO_CURSOR, type CursorInfo, type EditorApi } from '../editor/editorApi';

export type Theme = 'light' | 'dark';
export type PickerMode = 'open' | 'save';

export interface ViewOptions {
  minimap: boolean;
  wordWrap: boolean;
  split: boolean;
  fontSize: number;
}

export interface AppContextValue {
  // Documents
  state: DocState;
  active: Buffer | null;
  newFile: () => void;
  closeFile: (id: string) => void;
  selectFile: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  setLanguage: (id: string, language: string) => void;
  setEol: (id: string, eol: Eol) => void;
  rename: (id: string, name: string) => void;

  // OneDrive
  user: UserInfo | null;
  signedIn: boolean;
  saving: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  openFromOneDrive: (item: DriveItem) => Promise<void>;
  saveActive: () => Promise<void>;
  commitSaveAs: (parentId: string | undefined, name: string) => Promise<void>;

  // Picker
  picker: { open: boolean; mode: PickerMode };
  openPicker: (mode: PickerMode) => void;
  closePicker: () => void;

  // Theme + view
  theme: Theme;
  toggleTheme: () => void;
  view: ViewOptions;
  toggleMinimap: () => void;
  toggleWordWrap: () => void;
  toggleSplit: () => void;
  setFontSize: (n: number) => void;

  // Editor command bridge
  cursor: CursorInfo;
  setCursor: (info: CursorInfo) => void;
  registerEditor: (api: EditorApi) => void;
  editorAction: (name: keyof EditorApi) => void;

  // Chrome
  branding: BrandingAssets | null;
  toast: string | null;
  notify: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('npp-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  if (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }
  return 'dark';
}

function errorMessage(e: unknown): string {
  if (e instanceof GraphError) {
    if (e.status === 401) return 'OneDrive sign-in required.';
    if (e.status === 403) return 'OneDrive permission denied.';
    if (e.status === 404) return 'That OneDrive item no longer exists.';
    return `OneDrive error: ${e.message}`;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(documentsReducer, emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [view, setView] = useState<ViewOptions>({
    minimap: true,
    wordWrap: false,
    split: false,
    fontSize: 14,
  });
  const [user, setUser] = useState<UserInfo | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ open: boolean; mode: PickerMode }>({
    open: false,
    mode: 'open',
  });
  const [cursor, setCursor] = useState<CursorInfo>(NO_CURSOR);
  const [branding, setBranding] = useState<BrandingAssets | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const editorApiRef = useRef<EditorApi | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const notify = useCallback((msg: string) => setToast(msg), []);

  // ---- Startup: hydrate session + probe OneDrive/user/branding -------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSession();
      if (cancelled) return;
      if (saved && saved.buffers.length > 0) {
        dispatch({ type: 'HYDRATE', state: saved });
      } else {
        dispatch({ type: 'ADD', buffer: createBuffer({ name: 'new 1' }) });
      }
      setHydrated(true);

      const [silent, u, b] = await Promise.all([
        trySilentOneDrive(),
        sdkGetUser(),
        sdkGetBranding(),
      ]);
      if (cancelled) return;
      setSignedIn(silent);
      setUser(u);
      setBranding(b);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Persist session (debounced) ----------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => void saveSession(state), 400);
    return () => clearTimeout(t);
  }, [state, hydrated]);

  // ---- Apply theme --------------------------------------------------------
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('npp-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // ---- Auto-dismiss toast -------------------------------------------------
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Document actions ---------------------------------------------------
  const newFile = useCallback(() => {
    const name = nextUntitledName(stateRef.current.buffers);
    dispatch({ type: 'ADD', buffer: createBuffer({ name }) });
    sdkTrack('file_new');
  }, []);

  const closeFile = useCallback((id: string) => {
    const buf = stateRef.current.buffers.find((b) => b.id === id);
    if (buf && buf.content !== buf.savedContent) {
      const ok = window.confirm(
        `Discard unsaved changes to "${buf.name}"?`,
      );
      if (!ok) return;
    }
    dispatch({ type: 'CLOSE', id });
  }, []);

  const selectFile = useCallback(
    (id: string) => dispatch({ type: 'SELECT', id }),
    [],
  );
  const updateContent = useCallback(
    (id: string, content: string) =>
      dispatch({ type: 'UPDATE_CONTENT', id, content }),
    [],
  );
  const setLanguage = useCallback(
    (id: string, language: string) =>
      dispatch({ type: 'SET_LANGUAGE', id, language }),
    [],
  );
  const setEol = useCallback(
    (id: string, eol: Eol) => dispatch({ type: 'SET_EOL', id, eol }),
    [],
  );
  const rename = useCallback(
    (id: string, name: string) => dispatch({ type: 'RENAME', id, name }),
    [],
  );

  // ---- OneDrive actions ---------------------------------------------------
  const signIn = useCallback(async () => {
    const ok = await signInOneDrive();
    if (ok) {
      setSignedIn(true);
      setUser(await sdkGetUser());
      notify('Connected to OneDrive');
      sdkTrack('onedrive_signin');
    } else {
      notify('OneDrive sign-in was canceled');
    }
  }, [notify]);

  const signOut = useCallback(async () => {
    await signOutOneDrive();
    setSignedIn(false);
    setUser(null);
    notify('Signed out of OneDrive');
  }, [notify]);

  const closePicker = useCallback(
    () => setPicker((p) => ({ ...p, open: false })),
    [],
  );
  const openPicker = useCallback(
    (mode: PickerMode) => setPicker({ open: true, mode }),
    [],
  );

  const openFromOneDrive = useCallback(
    async (item: DriveItem) => {
      const existing = stateRef.current.buffers.find(
        (b) => b.oneDriveItemId === item.id,
      );
      if (existing) {
        dispatch({ type: 'SELECT', id: existing.id });
        closePicker();
        return;
      }
      try {
        const { text, encoding, eol } = await readFile(oneDriveAuth, item.id);
        dispatch({
          type: 'ADD',
          buffer: createBuffer({
            name: item.name,
            content: text,
            encoding,
            eol,
            oneDriveItemId: item.id,
            parentId: item.parentReference?.id,
            path: item.parentReference?.path,
            language: languageForFilename(item.name),
          }),
        });
        setSignedIn(true);
        notify(`Opened ${item.name}`);
        sdkTrack('file_opened', { source: 'onedrive' });
      } catch (e) {
        notify(errorMessage(e));
      } finally {
        closePicker();
      }
    },
    [closePicker, notify],
  );

  const saveActive = useCallback(async () => {
    const buf = activeBuffer(stateRef.current);
    if (!buf) return;
    if (!buf.oneDriveItemId) {
      openPicker('save');
      return;
    }
    setSaving(true);
    try {
      const item = await saveExisting(
        oneDriveAuth,
        buf.oneDriveItemId,
        buf.content,
        buf.encoding,
        buf.eol,
      );
      dispatch({
        type: 'SAVED',
        id: buf.id,
        oneDriveItemId: item.id,
        name: item.name,
      });
      setSignedIn(true);
      notify(`Saved ${item.name}`);
      sdkTrack('file_saved', { mode: 'update' });
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [notify, openPicker]);

  const commitSaveAs = useCallback(
    async (parentId: string | undefined, name: string) => {
      const buf = activeBuffer(stateRef.current);
      if (!buf) return;
      const finalName = name.trim() || buf.name;
      setSaving(true);
      try {
        const item = await saveNew(
          oneDriveAuth,
          parentId,
          finalName,
          buf.content,
          buf.encoding,
          buf.eol,
        );
        dispatch({
          type: 'SAVED',
          id: buf.id,
          oneDriveItemId: item.id,
          parentId,
          name: item.name,
        });
        dispatch({
          type: 'SET_LANGUAGE',
          id: buf.id,
          language: languageForFilename(item.name),
        });
        setSignedIn(true);
        notify(`Saved ${item.name}`);
        sdkTrack('file_saved', { mode: 'create' });
        closePicker();
      } catch (e) {
        notify(errorMessage(e));
      } finally {
        setSaving(false);
      }
    },
    [closePicker, notify],
  );

  // ---- Theme + view -------------------------------------------------------
  const toggleTheme = useCallback(
    () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  );
  const toggleMinimap = useCallback(
    () => setView((v) => ({ ...v, minimap: !v.minimap })),
    [],
  );
  const toggleWordWrap = useCallback(
    () => setView((v) => ({ ...v, wordWrap: !v.wordWrap })),
    [],
  );
  const toggleSplit = useCallback(
    () => setView((v) => ({ ...v, split: !v.split })),
    [],
  );
  const setFontSize = useCallback(
    (n: number) =>
      setView((v) => ({ ...v, fontSize: Math.max(8, Math.min(32, n)) })),
    [],
  );

  // ---- Editor bridge ------------------------------------------------------
  const registerEditor = useCallback((api: EditorApi) => {
    editorApiRef.current = api;
  }, []);
  const editorAction = useCallback((name: keyof EditorApi) => {
    editorApiRef.current?.[name]?.();
  }, []);

  const active = useMemo(() => activeBuffer(state), [state]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      active,
      newFile,
      closeFile,
      selectFile,
      updateContent,
      setLanguage,
      setEol,
      rename,
      user,
      signedIn,
      saving,
      signIn,
      signOut,
      openFromOneDrive,
      saveActive,
      commitSaveAs,
      picker,
      openPicker,
      closePicker,
      theme,
      toggleTheme,
      view,
      toggleMinimap,
      toggleWordWrap,
      toggleSplit,
      setFontSize,
      cursor,
      setCursor,
      registerEditor,
      editorAction,
      branding,
      toast,
      notify,
    }),
    [
      state,
      active,
      newFile,
      closeFile,
      selectFile,
      updateContent,
      setLanguage,
      setEol,
      rename,
      user,
      signedIn,
      saving,
      signIn,
      signOut,
      openFromOneDrive,
      saveActive,
      commitSaveAs,
      picker,
      openPicker,
      closePicker,
      theme,
      toggleTheme,
      view,
      toggleMinimap,
      toggleWordWrap,
      toggleSplit,
      setFontSize,
      cursor,
      registerEditor,
      editorAction,
      branding,
      toast,
      notify,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
