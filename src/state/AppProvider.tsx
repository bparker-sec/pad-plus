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
  connectOneDrive,
  clearOneDriveSession,
  oneDriveClearRequired,
} from '../onedrive/auth';
import {
  sdkGetUser,
  sdkGetBranding,
  sdkProbeHost,
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
  clearFailed: boolean;
  sessionClearing: boolean;
  signIn: () => Promise<void>;
  clearSession: () => Promise<void>;
  openFromOneDrive: (item: DriveItem) => Promise<void>;
  saveActive: () => Promise<void>;
  commitSaveAs: (parentId: string | undefined, name: string) => Promise<void>;

  // Picker
  picker: { open: boolean; mode: PickerMode };
  openPicker: (mode: PickerMode) => void;
  closePicker: () => void;

  // Diagnostics
  diagnosticsOpen: boolean;
  openDiagnostics: () => void;
  closeDiagnostics: () => void;

  // Setup help (Island OneDrive integration docs)
  setupHelpVisible: boolean;
  dismissSetupHelp: () => void;

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
  hostAvailable: boolean;
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
  const [hostAvailable, setHostAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);
  const [sessionClearing, setSessionClearing] = useState(false);
  const [picker, setPicker] = useState<{ open: boolean; mode: PickerMode }>({
    open: false,
    mode: 'open',
  });
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(() =>
    /[?&](diag|diagnostics)\b/.test(
      typeof location !== 'undefined' ? location.search : '',
    ),
  );
  const [setupHelpVisible, setSetupHelpVisible] = useState(false);
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

      // Probe for an AI-app host before hitting it, so a standalone window
      // doesn't hang on RPC timeouts.
      const host = await sdkProbeHost();
      if (cancelled) return;
      setHostAvailable(host);
      if (!host) {
        // eslint-disable-next-line no-console
        console.info(
          '[Notepad++ Web] No AI-app host detected (running as a top-level window). ' +
            'OneDrive requires the app to run embedded in the AI-app host.',
        );
        return;
      }

      // Recover a durable "clear did not finish" state from a prior session.
      setClearFailed(oneDriveClearRequired());

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
    // Never start a connection while a session clear is running.
    if (sessionClearing) {
      notify('Clearing the previous session — try again in a moment.');
      return;
    }
    // Confirm a host is actually answering before an interactive attempt, so a
    // standalone window with no host fails fast instead of waiting out the long
    // OAuth timeout.
    const host = hostAvailable || (await sdkProbeHost());
    if (!host) {
      setHostAvailable(false);
      // eslint-disable-next-line no-console
      console.warn(
        '[Notepad++ Web] No AI-app host is responding; cannot reach OneDrive.',
      );
      notify("OneDrive needs the AI-app host — this window isn't connected to one.");
      return;
    }
    setHostAvailable(true);

    const res = await connectOneDrive();
    if (res.ok) {
      setSignedIn(true);
      setClearFailed(false);
      setSetupHelpVisible(false);
      setUser(await sdkGetUser());
      notify('Connected to OneDrive');
      sdkTrack('onedrive_signin');
      return;
    }
    // eslint-disable-next-line no-console
    console.warn('[Notepad++ Web] OneDrive sign-in failed:', res);
    switch (res.reason) {
      case 'blocked':
        notify(
          clearFailed
            ? 'Previous session didn’t fully clear. Use "Clear session" first.'
            : 'A session reset is in progress — try again in a moment.',
        );
        break;
      case 'superseded':
        // A newer sign-in or a reset superseded this one — no error to show.
        break;
      case 'no_token':
        // Same error class the user is troubleshooting — prompt Island's guide.
        setSetupHelpVisible(true);
        notify(
          "OneDrive isn't connected for this app. See the Island setup guide, then retry.",
        );
        break;
      case 'timeout':
        notify("The host didn't respond — OneDrive may be unavailable here.");
        break;
      default:
        notify(`OneDrive error: ${res.detail ?? 'unknown'}`);
    }
  }, [hostAvailable, sessionClearing, clearFailed, notify]);

  // Coordinator-owned reset: clears BOTH the host session (clearToken) and local
  // state, leaves us needing a fresh sign-in, and surfaces a recoverable error if
  // the host clear fails. Does NOT start OAuth.
  const clearSession = useCallback(async () => {
    setSessionClearing(true);
    const ok = await clearOneDriveSession();
    setSessionClearing(false);
    setSignedIn(false);
    setUser(null);
    if (ok) {
      setClearFailed(false);
      notify('OneDrive session cleared — sign in to connect an account.');
      sdkTrack('onedrive_session_cleared', { ok: true });
    } else {
      setClearFailed(true);
      notify(
        'Couldn’t fully clear the OneDrive session. Use "Clear session" to retry before signing in.',
      );
      sdkTrack('onedrive_session_cleared', { ok: false });
    }
  }, [notify]);

  const closePicker = useCallback(
    () => setPicker((p) => ({ ...p, open: false })),
    [],
  );
  const openPicker = useCallback(
    (mode: PickerMode) => setPicker({ open: true, mode }),
    [],
  );
  const openDiagnostics = useCallback(() => setDiagnosticsOpen(true), []);
  const closeDiagnostics = useCallback(() => setDiagnosticsOpen(false), []);
  const dismissSetupHelp = useCallback(() => setSetupHelpVisible(false), []);

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
      clearFailed,
      sessionClearing,
      signIn,
      clearSession,
      openFromOneDrive,
      saveActive,
      commitSaveAs,
      picker,
      openPicker,
      closePicker,
      diagnosticsOpen,
      openDiagnostics,
      closeDiagnostics,
      setupHelpVisible,
      dismissSetupHelp,
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
      hostAvailable,
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
      clearFailed,
      sessionClearing,
      signIn,
      clearSession,
      openFromOneDrive,
      saveActive,
      commitSaveAs,
      picker,
      openPicker,
      closePicker,
      diagnosticsOpen,
      openDiagnostics,
      closeDiagnostics,
      setupHelpVisible,
      dismissSetupHelp,
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
      hostAvailable,
      branding,
      toast,
      notify,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
