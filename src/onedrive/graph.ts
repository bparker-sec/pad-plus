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

export function detectEncodingEol(buf: ArrayBuffer): DecodedText {
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

export function encodeText(text: string, encoding: string): Uint8Array {
  const body = new TextEncoder().encode(text);
  if (encoding === 'UTF-8-BOM') {
    const out = new Uint8Array(body.length + 3);
    out.set([0xef, 0xbb, 0xbf], 0);
    out.set(body, 3);
    return out;
  }
  // UTF-16 files are read correctly but re-saved as UTF-8 in v1.
  return body;
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
