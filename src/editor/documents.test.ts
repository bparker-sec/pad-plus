import { describe, it, expect } from 'vitest';
import {
  documentsReducer,
  createBuffer,
  isDirty,
  activeBuffer,
  nextUntitledName,
  emptyState,
  type DocState,
} from './documents';

function withBuffers(...names: string[]): DocState {
  let state: DocState = emptyState;
  for (const name of names) {
    state = documentsReducer(state, {
      type: 'ADD',
      buffer: createBuffer({ id: name, name }),
    });
  }
  return state;
}

describe('documentsReducer', () => {
  it('ADD appends and activates by default', () => {
    const s = withBuffers('a', 'b');
    expect(s.buffers.map((b) => b.id)).toEqual(['a', 'b']);
    expect(s.activeId).toBe('b');
  });

  it('ADD with activate:false keeps current active', () => {
    let s = withBuffers('a');
    s = documentsReducer(s, {
      type: 'ADD',
      buffer: createBuffer({ id: 'b', name: 'b' }),
      activate: false,
    });
    expect(s.activeId).toBe('a');
  });

  it('CLOSE of active selects a neighbor at the same index', () => {
    let s = withBuffers('a', 'b', 'c');
    s = documentsReducer(s, { type: 'SELECT', id: 'b' });
    s = documentsReducer(s, { type: 'CLOSE', id: 'b' });
    expect(s.buffers.map((b) => b.id)).toEqual(['a', 'c']);
    expect(s.activeId).toBe('c'); // index 1 now holds 'c'
  });

  it('CLOSE of the last buffer clears active', () => {
    let s = withBuffers('a');
    s = documentsReducer(s, { type: 'CLOSE', id: 'a' });
    expect(s.buffers).toHaveLength(0);
    expect(s.activeId).toBeNull();
  });

  it('UPDATE_CONTENT marks the buffer dirty; SAVED clears it', () => {
    let s = withBuffers('a');
    expect(isDirty(activeBuffer(s)!)).toBe(false);
    s = documentsReducer(s, { type: 'UPDATE_CONTENT', id: 'a', content: 'hi' });
    expect(isDirty(activeBuffer(s)!)).toBe(true);
    s = documentsReducer(s, {
      type: 'SAVED',
      id: 'a',
      oneDriveItemId: 'item-1',
      name: 'a.txt',
    });
    const b = activeBuffer(s)!;
    expect(isDirty(b)).toBe(false);
    expect(b.oneDriveItemId).toBe('item-1');
    expect(b.name).toBe('a.txt');
  });

  it('UPDATE_CONTENT with identical content returns the same state reference', () => {
    let s = withBuffers('a');
    s = documentsReducer(s, { type: 'UPDATE_CONTENT', id: 'a', content: '' });
    const same = documentsReducer(s, {
      type: 'UPDATE_CONTENT',
      id: 'a',
      content: '',
    });
    expect(same).toBe(s);
  });

  it('SELECT of an unknown id is a no-op', () => {
    const s = withBuffers('a');
    expect(documentsReducer(s, { type: 'SELECT', id: 'z' })).toBe(s);
  });
});

describe('nextUntitledName', () => {
  it('skips names already in use', () => {
    const s = withBuffers('new 1', 'new 2');
    expect(nextUntitledName(s.buffers)).toBe('new 3');
  });
});
