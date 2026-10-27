import crypto from 'node:crypto';
import type { MediaStorage } from './storage';

// S3-compatible object storage (design doc §10.1): Cloudflare R2 in production, or any S3 API
// (AWS S3, MinIO). Requests are signed with AWS Signature Version 4 directly, so the project
// needs no SDK. Path-style addresses (`{endpoint}/{bucket}/{key}`) work with R2 and MinIO.
//
// Keys contain a content hash and are never overwritten with different bytes (§10.4): `put`
// checks an existing object first and refuses to replace it.

export type S3Options = {
  /** e.g. https://<account id>.r2.cloudflarestorage.com */
  endpoint: string;
  bucket: string;
  /** "auto" for R2; the bucket's region for AWS. */
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

const sha256 = (data: string | Uint8Array) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac('sha256', key).update(data).digest();

/** RFC 3986 encoding of one path segment, as SigV4 expects for S3. */
const encodeSegment = (segment: string) =>
  encodeURIComponent(segment).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export type SignInput = {
  method: string;
  url: URL;
  /** Headers to send and sign; `host`, `x-amz-date` and `x-amz-content-sha256` are added. */
  headers?: Record<string, string>;
  payloadHash: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** The request time; defaults to now. */
  date?: Date;
};

/** Headers for a SigV4-signed S3 request, `authorization` included. Pure apart from the clock. */
export function signRequest(input: SignInput): Record<string, string> {
  const amzDate = (input.date ?? new Date())
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    ...Object.fromEntries(Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v.trim()])),
    host: input.url.host,
    'x-amz-content-sha256': input.payloadHash,
    'x-amz-date': amzDate,
  };
  const names = Object.keys(headers).sort();
  const query = [...input.url.searchParams.entries()]
    .map(([k, v]) => `${encodeSegment(k)}=${encodeSegment(v)}`)
    .sort()
    .join('&');
  const canonical = [
    input.method,
    input.url.pathname
      .split('/')
      .map((s) => encodeSegment(decodeURIComponent(s)))
      .join('/'),
    query,
    names.map((n) => `${n}:${headers[n]}\n`).join(''),
    names.join(';'),
    input.payloadHash,
  ].join('\n');
  const scope = `${day}/${input.region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', key).update(toSign).digest('hex');
  // fetch sets Host itself.
  const send: Record<string, string> = { ...headers };
  delete send.host;
  return {
    ...send,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`,
  };
}

export function s3Storage(o: S3Options): MediaStorage {
  const base = o.endpoint.replace(/\/+$/, '');
  const objectUrl = (key: string) =>
    new URL(`${base}/${encodeSegment(o.bucket)}/${key.split('/').map(encodeSegment).join('/')}`);
  const request = async (method: string, key: string, body?: Uint8Array, headers: Record<string, string> = {}) => {
    const url = objectUrl(key);
    const signed = signRequest({
      method,
      url,
      headers,
      payloadHash: sha256(body ?? ''),
      region: o.region,
      accessKeyId: o.accessKeyId,
      secretAccessKey: o.secretAccessKey,
    });
    return fetch(url, {
      method,
      headers: signed,
      body: body as BodyInit | undefined,
      signal: AbortSignal.timeout(60_000),
    });
  };
  const failed = async (what: string, res: Response) =>
    new Error(`${what}: ${res.status} ${res.statusText} ${(await res.text().catch(() => '')).slice(0, 300)}`.trim());

  async function head(key: string): Promise<Response | null> {
    const res = await request('HEAD', key);
    if (res.status === 404) return null;
    if (!res.ok) throw await failed(`HEAD ${key}`, res);
    return res;
  }

  return {
    name: `s3 (${o.bucket} at ${new URL(base).host})`,
    async put(key, bytes, contentType) {
      const existing = await head(key);
      if (existing) {
        const etag = existing.headers.get('etag')?.replace(/"/g, '') ?? '';
        const md5 = crypto.createHash('md5').update(bytes).digest('hex');
        // A multipart ETag is not an MD5; then the size is the best available check.
        const same = etag.includes('-')
          ? Number(existing.headers.get('content-length')) === bytes.byteLength
          : etag === md5;
        if (same) return;
        throw new Error(`${key} already exists with different content; keys are never reused (§10.4)`);
      }
      const res = await request('PUT', key, bytes, {
        'content-type': contentType,
        // Keys change whenever the bytes do, so every object can be cached for good (§10.4).
        'cache-control': 'public, max-age=31536000, immutable',
        'content-md5': crypto.createHash('md5').update(bytes).digest('base64'),
      });
      if (!res.ok) throw await failed(`PUT ${key}`, res);
    },
    async get(key) {
      const res = await request('GET', key);
      if (!res.ok) throw await failed(`GET ${key}`, res);
      return Buffer.from(await res.arrayBuffer());
    },
    async has(key) {
      return (await head(key)) !== null;
    },
  };
}
