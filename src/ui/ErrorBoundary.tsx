import { Component, type ReactNode } from 'react';
import { buildLabel } from '../buildInfo';
import { recordError, getLogsText } from '../diagnostics/logbuffer';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Catches render/lifecycle crashes and shows a copyable report instead of a
 * blank white screen. Critical for the Island-embedded app, where there is no
 * browser console to read. Styled inline so it renders even if the failure is
 * related to the app's own styles.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    recordError('react-render', error, info.componentStack ?? '');
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render(): ReactNode {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    const report = [
      'Notepad++ Web — crash report',
      buildLabel(),
      new Date().toISOString(),
      '='.repeat(48),
      `${error.name}: ${error.message}`,
      '',
      error.stack ?? '(no stack)',
      componentStack ? `\nComponent stack:${componentStack}` : '',
      '',
      '--- Captured logs ---',
      getLogsText(),
    ].join('\n');

    const copy = () => {
      try {
        void navigator.clipboard.writeText(report);
      } catch {
        /* ignore */
      }
    };

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'auto',
          background: '#1e1e1e',
          color: '#e6e6e6',
          font: "13px/1.5 'Consolas','Menlo','Monaco',monospace",
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ fontSize: 18, margin: '0 0 4px', color: '#f97583' }}>
            Notepad++ Web hit an error
          </h1>
          <div style={{ color: '#8b949e', marginBottom: 12 }}>{buildLabel()}</div>
          <div
            style={{
              background: '#2d1214',
              border: '1px solid #f9758333',
              borderRadius: 6,
              padding: '10px 12px',
              marginBottom: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <strong>
              {error.name}: {error.message}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={copy}
              style={{
                background: '#2e8b57',
                color: '#fff',
                border: 0,
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Copy full report
            </button>
            <button
              onClick={() => location.reload()}
              style={{
                background: 'transparent',
                color: '#e6e6e6',
                border: '1px solid #555',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
          <p style={{ color: '#8b949e', margin: '0 0 6px' }}>
            Copy this report (or select all below) and send it over — it has the
            error, stack, and recent in-app logs.
          </p>
          <textarea
            readOnly
            value={report}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: '100%',
              height: 360,
              resize: 'vertical',
              background: '#0d1117',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: 6,
              padding: 10,
              font: "12px/1.45 'Consolas','Menlo','Monaco',monospace",
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    );
  }
}
