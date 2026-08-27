import { describe, it, expect } from 'vitest';
import {
  childrenUrl,
  contentUrl,
  createInFolderUrl,
  uploadSessionUrl,
  encodePathSegment,
  detectEncodingEol,
  applyEol,
  encodeText,
  sortItems,
  isFolder,
  type DriveItem,
} from './graph';

describe('URL builders', () => {
  it('lists root vs folder children', () => {
    expect(childrenUrl()).toContain('/me/drive/root/children');
    expect(childrenUrl('ABC 123')).toContain(
      '/me/drive/items/ABC%20123/children',
    );
  });

  it('builds content url with encoded id', () => {
    expect(contentUrl('a/b')).toBe(
      'https://graph.microsoft.com/v1.0/me/drive/items/a%2Fb/content',
    );
  });

  it('builds create-in-folder path url', () => {
    expect(createInFolderUrl(undefined, 'my notes.txt')).toBe(
      'https://graph.microsoft.com/v1.0/me/drive/root:/my%20notes.txt:/content',
    );
    expect(createInFolderUrl('folder1', 'a+b.txt')).toContain(
      '/me/drive/items/folder1:/a%2Bb.txt:/content',
    );
  });

  it('builds upload session url', () => {
    expect(uploadSessionUrl('f1', 'big.log')).toContain(
      '/me/drive/items/f1:/big.log:/createUploadSession',
    );
  });

  it('encodes path segments but keeps slashes', () => {
    expect(encodePathSegment('a b/c d')).toBe('a%20b/c%20d');
  });
});

describe('encoding detection', () => {
  const enc = (s: string) => new TextEncoder().encode(s).buffer;

  it('detects plain UTF-8 with LF', () => {
    const r = detectEncodingEol(enc('hello\nworld'));
    expect(r.encoding).toBe('UTF-8');
    expect(r.eol).toBe('LF');
    expect(r.text).toBe('hello\nworld');
  });

  it('detects CRLF', () => {
    const r = detectEncodingEol(enc('a\r\nb'));
    expect(r.eol).toBe('CRLF');
  });

  it('detects and strips a UTF-8 BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x41]);
    const r = detectEncodingEol(bytes.buffer);
    expect(r.encoding).toBe('UTF-8-BOM');
    expect(r.text).toBe('A');
  });
});

describe('applyEol', () => {
  it('normalizes to CRLF', () => {
    expect(applyEol('a\nb\r\nc', 'CRLF')).toBe('a\r\nb\r\nc');
  });
  it('normalizes to LF', () => {
    expect(applyEol('a\r\nb', 'LF')).toBe('a\nb');
  });
});

describe('encodeText', () => {
  it('prepends a BOM for UTF-8-BOM', () => {
    const out = encodeText('A', 'UTF-8-BOM');
    expect(Array.from(out.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(out[3]).toBe(0x41);
  });
  it('omits the BOM for plain UTF-8', () => {
    const out = encodeText('A', 'UTF-8');
    expect(out[0]).toBe(0x41);
  });

  it('emits UTF-16 LE with a BOM and round-trips via detect', () => {
    const out = encodeText('AB', 'UTF-16 LE');
    expect(Array.from(out)).toEqual([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]);
    const back = detectEncodingEol(out.buffer);
    expect(back.encoding).toBe('UTF-16 LE');
    expect(back.text).toBe('AB');
  });

  it('emits UTF-16 BE with a BOM and round-trips via detect', () => {
    const out = encodeText('A', 'UTF-16 BE');
    expect(Array.from(out)).toEqual([0xfe, 0xff, 0x00, 0x41]);
    expect(detectEncodingEol(out.buffer).encoding).toBe('UTF-16 BE');
  });

  it('encodes Windows-1252, mapping smart punctuation and Latin-1', () => {
    // “ = U+201C -> 0x93, é = U+00E9 -> 0xE9, € = U+20AC -> 0x80
    expect(Array.from(encodeText('“é€', 'Windows-1252'))).toEqual([0x93, 0xe9, 0x80]);
  });

  it('substitutes ? for characters a codepage cannot represent', () => {
    expect(Array.from(encodeText('☃', 'Windows-1252'))).toEqual([0x3f]);
  });
});

describe('sortItems', () => {
  it('puts folders before files, each alphabetical', () => {
    const items: DriveItem[] = [
      { id: '1', name: 'zeta.txt', file: {} },
      { id: '2', name: 'Beta', folder: {} },
      { id: '3', name: 'alpha.txt', file: {} },
      { id: '4', name: 'Alpha', folder: {} },
    ];
    const sorted = sortItems(items).map((i) => i.name);
    expect(sorted).toEqual(['Alpha', 'Beta', 'alpha.txt', 'zeta.txt']);
    expect(isFolder(items[1])).toBe(true);
  });
});
