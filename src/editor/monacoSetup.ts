// Configure Monaco to load its web workers from bundled static assets (never a
// CDN). Vite's `?worker` imports emit each worker as a hashed static file that
// ships in dist/, keeping the app fully self-contained.
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

type WithMonacoEnv = typeof globalThis & {
  MonacoEnvironment?: monaco.Environment;
};

(globalThis as WithMonacoEnv).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};

// Original Notepad++-inspired themes (light + dark). Defined once at module load.
monaco.editor.defineTheme('npp-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#ffffff',
    'editorLineNumber.foreground': '#9aa0a6',
    'editorCursor.foreground': '#2e8b57',
    'editor.selectionBackground': '#c8e6d4',
    'editor.lineHighlightBackground': '#f2f7f4',
  },
});

monaco.editor.defineTheme('npp-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#1e1e1e',
    'editorLineNumber.foreground': '#6b7280',
    'editorCursor.foreground': '#4caf7d',
    'editor.selectionBackground': '#2e8b5755',
    'editor.lineHighlightBackground': '#26262a',
  },
});

export default monaco;
