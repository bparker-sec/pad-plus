// Microsoft Graph client for OneDrive, called directly from the browser with a
// Bearer token brokered by the host via ai-publish-sdk. No server involved.
import type { Eol } from '../editor/documents';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4 MB
const UPLOAD_CHUNK = 5 * 320 * 1024; // 1.6 MB, a multiple of 320 KiB (Graph rule)

export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  folder?: { childCount?: number };
  file?: { mimeType?: string };
  parentReference?: { id?: string; path?: string };
  lastModifiedDateTime?: string;
  webUrl?: string;
}

export function isFolder(item: DriveItem): boolean {
  return item.folder !== undefined;
}

/** Provides (and can force-refresh) a OneDrive access token. */
export interface Authable {
  getToken(force?: boolean): Promise<string | null>;
}

export class GraphError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GraphError';
  }
}

// ---- Pure URL / path builders (unit-tested) --------------------------------

export function encodePathSegment(name: string): string {
  return name
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export function childrenUrl(itemId?: string): string {
  const q = '?$top=200&$orderby=name&$select=id,name,size,folder,file,parentReference,lastModifiedDateTime,webUrl';
  return itemId
    ? `${GRAPH}/me/drive/items/${encodeURIComponent(itemId)}/children${q}`
    : `${GRAPH}/me/drive/root/children${q}`;
}

export function itemUrl(itemId: string): string {
  return `${GRAPH}/me/drive/items/${encodeURIComponent(itemId)}`;
}

export function contentUrl(itemId: string): string {
  return `${GRAPH}/me/drive/items/${encodeURIComponent(itemId)}/content`;
}

export function createInFolderUrl(
  parentId: string | undefined,
  name: string,
): string {
  const safe = encodePathSegment(name);
  return parentId
    ? `${GRAPH}/me/drive/items/${encodeURIComponent(parentId)}:/${safe}:/content`
    : `${GRAPH}/me/drive/root:/${safe}:/content`;
}

export function uploadSessionUrl(
  parentId: string | undefined,
  name: string,
): string {
  const safe = encodePathSegment(name);
  return parentId
    ? `${GRAPH}/me/drive/items/${encodeURIComponent(parentId)}:/${safe}:/createUploadSession`
    : `${GRAPH}/me/drive/root:/${safe}:/createUploadSession`;
}

// ---- Pure encoding helpers (unit-tested) -----------------------------------

export interface DecodedText {
  text: string;
  encoding: string;
  eol: Eol;
}

export function detectEncodingEol(buf: ArrayBufferLike): DecodedText {
  const bytes = new Uint8Array(buf);
  let encoding = 'UTF-8';
  let text: string;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encoding = 'UTF-8-BOM';
    text = new TextDecoder('utf-8').decode(bytes.subarray(3));
  } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'UTF-16 LE';
    text = new TextDecoder('utf-16le').decode(bytes.subarray(2));
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'UTF-16 BE';
    text = new TextDecoder('utf-16be').decode(bytes.subarray(2));
  } else {
    text = new TextDecoder('utf-8').decode(bytes);
  }
  const eol: Eol = text.includes('\r\n') ? 'CRLF' : 'LF';
  return { text, encoding, eol };
}

export function applyEol(text: string, eol: Eol): string {
  const lf = text.replace(/\r\n/g, '\n');
  return eol === 'CRLF' ? lf.replace(/\n/g, '\r\n') : lf;
}

// Windows-1252 differs from Latin-1 only in 0x80–0x9F; map those code points
// back to their bytes. Everything else uses the ASCII/Latin-1 byte directly.
const CP1252_EXTRA: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function encodeUtf16(text: string, bigEndian: boolean): Uint8Array {
  const out = new Uint8Array(2 + text.length * 2);
  out.set(bigEndian ? [0xfe, 0xff] : [0xff, 0xfe], 0); // BOM
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    const o = 2 + i * 2;
    if (bigEndian) {
      out[o] = c >> 8;
      out[o + 1] = c & 0xff;
    } else {
      out[o] = c & 0xff;
      out[o + 1] = c >> 8;
    }
  }
  return out;
}

function encodeWindows1252(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c <= 0x7f || (c >= 0xa0 && c <= 0xff)) out[i] = c;
    else if (CP1252_EXTRA[c] !== undefined) out[i] = CP1252_EXTRA[c];
    else out[i] = 0x3f; // '?' for characters this codepage can't represent
  }
  return out;
}

/** Encode text to file bytes in the given encoding (see ENCODINGS in editor). */
export function encodeText(text: string, encoding: string): Uint8Array {
  switch (encoding) {
    case 'UTF-8-BOM': {
      const body = new TextEncoder().encode(text);
      const out = new Uint8Array(body.length + 3);
      out.set([0xef, 0xbb, 0xbf], 0);
      out.set(body, 3);
      return out;
    }
    case 'UTF-16 LE':
      return encodeUtf16(text, false);
    case 'UTF-16 BE':
      return encodeUtf16(text, true);
    case 'Windows-1252':
      return encodeWindows1252(text);
    case 'UTF-8':
    default:
      return new TextEncoder().encode(text);
  }
}

// ---- Network operations ----------------------------------------------------

function withAuth(init: RequestInit, token: string): RequestInit {
  return {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  };
}

async function safeErrorText(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? res.statusText;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

async function graphFetch(
  auth: Authable,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = await auth.getToken(false);
  if (!token) token = await auth.getToken(true);
  if (!token) throw new GraphError(401, 'Not signed in to OneDrive.');

  let res = await fetch(url, withAuth(init, token));
  if (res.status === 401) {
    const fresh = await auth.getToken(true);
    if (fresh) res = await fetch(url, withAuth(init, fresh));
  }
  if (!res.ok) throw new GraphError(res.status, await safeErrorText(res));
  return res;
}

export async function listChildren(
  auth: Authable,
  itemId?: string,
): Promise<DriveItem[]> {
  const res = await graphFetch(auth, childrenUrl(itemId));
  const data = (await res.json()) as { value?: DriveItem[] };
  return data.value ?? [];
}

export async function getItem(
  auth: Authable,
  itemId: string,
): Promise<DriveItem> {
  const res = await graphFetch(auth, itemUrl(itemId));
  return (await res.json()) as DriveItem;
}

export async function readFile(
  auth: Authable,
  itemId: string,
): Promise<DecodedText> {
  const res = await graphFetch(auth, contentUrl(itemId));
  const buf = await res.arrayBuffer();
  return detectEncodingEol(buf);
}

export async function saveExisting(
  auth: Authable,
  itemId: string,
  text: string,
  encoding: string,
  eol: Eol,
): Promise<DriveItem> {
  const body = encodeText(applyEol(text, eol), encoding);
  const res = await graphFetch(auth, contentUrl(itemId), {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: body as BodyInit,
  });
  return (await res.json()) as DriveItem;
}

export async function saveNew(
  auth: Authable,
  parentId: string | undefined,
  name: string,
  text: string,
  encoding: string,
  eol: Eol,
): Promise<DriveItem> {
  const body = encodeText(applyEol(text, eol), encoding);
  if (body.byteLength <= SIMPLE_UPLOAD_LIMIT) {
    const res = await graphFetch(auth, createInFolderUrl(parentId, name), {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: body as BodyInit,
    });
    return (await res.json()) as DriveItem;
  }
  return uploadLarge(auth, parentId, name, body);
}

async function uploadLarge(
  auth: Authable,
  parentId: string | undefined,
  name: string,
  body: Uint8Array,
): Promise<DriveItem> {
  const sessionRes = await graphFetch(auth, uploadSessionUrl(parentId, name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item: { '@microsoft.graph.conflictBehavior': 'replace', name },
    }),
  });
  const { uploadUrl } = (await sessionRes.json()) as { uploadUrl: string };
  const total = body.byteLength;
  let start = 0;
  let last: Response | null = null;
  while (start < total) {
    const end = Math.min(start + UPLOAD_CHUNK, total);
    // The upload URL is pre-authenticated — no Bearer header needed.
    last = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${start}-${end - 1}/${total}` },
      body: body.subarray(start, end) as BodyInit,
    });
    if (!last.ok && last.status !== 202) {
      throw new GraphError(last.status, await safeErrorText(last));
    }
    start = end;
  }
  return (await last!.json()) as DriveItem;
}

/** Folders first, then files, each alphabetical. */
export function sortItems(items: DriveItem[]): DriveItem[] {
  return [...items].sort((a, b) => {
    const af = isFolder(a) ? 0 : 1;
    const bf = isFolder(b) ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name);
  });
}
