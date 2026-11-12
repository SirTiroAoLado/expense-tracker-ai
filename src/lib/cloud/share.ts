/**
 * Serverless share links.
 *
 * The report snapshot is compressed (deflate) and — optionally — encrypted with
 * AES-GCM using a key derived from a password (PBKDF2-SHA256). The result is
 * base64url-encoded into the URL *fragment* (`#...`), which browsers never send
 * to a server. The recipient's browser decodes it locally on /share.
 *
 * Format:  v1.<flags>.<payload>   flags: "z" compressed, "e" encrypted
 */
import { CATEGORIES, CURRENCIES, type Category, type CurrencyCode } from "../types";

export interface SharedSnapshot {
  v: 1;
  title: string;
  note?: string;
  periodLabel: string;
  currency: CurrencyCode;
  createdAt: string;
  expiresAt: string | null;
  /** Compact rows: [date, category, amount, description] */
  rows: [string, Category, number, string][];
}

const PBKDF2_ITERATIONS = 150_000;

/** Byte arrays backed by a plain ArrayBuffer (what Web Crypto & Blob expect). */
type Bytes = Uint8Array<ArrayBuffer>;

function toB64Url(bytes: Bytes): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Bytes {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Bytes, stream: CompressionStream | DecompressionStream): Promise<Bytes> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Decompress, but stop as soon as the output passes `max` bytes (guards against "zip bombs"). */
async function inflateBounded(bytes: Bytes, max: number): Promise<Bytes> {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new ShareLinkError("This link is too large to open.", "malformed");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function deriveKey(password: string, salt: Bytes): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encodeSnapshot(snap: SharedSnapshot, password?: string): Promise<string> {
  let bytes: Bytes = new TextEncoder().encode(JSON.stringify(snap));
  let flags = "";
  if (typeof CompressionStream !== "undefined") {
    bytes = await pipe(bytes, new CompressionStream("deflate-raw"));
    flags += "z";
  }
  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
    bytes = new Uint8Array([...salt, ...iv, ...cipher]);
    flags += "e";
  }
  return `v1.${flags || "-"}.${toB64Url(bytes)}`;
}

export class ShareLinkError extends Error {
  constructor(
    message: string,
    public code: "malformed" | "password" | "unsupported",
  ) {
    super(message);
  }
}

export const isEncrypted = (token: string) => token.split(".")[1]?.includes("e") ?? false;

export async function decodeSnapshot(token: string, password?: string): Promise<SharedSnapshot> {
  const [version, flags, data] = token.split(".");
  if (version !== "v1" || !data) throw new ShareLinkError("This link is incomplete or was cut off.", "malformed");
  let bytes: Bytes;
  try {
    bytes = fromB64Url(data);
  } catch {
    throw new ShareLinkError("This link is incomplete or was cut off.", "malformed");
  }
  if (flags.includes("e")) {
    if (!password) throw new ShareLinkError("Password required.", "password");
    try {
      const key = await deriveKey(password, bytes.slice(0, 16));
      bytes = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(16, 28) }, key, bytes.slice(28)));
    } catch {
      throw new ShareLinkError("Incorrect password.", "password");
    }
  }
  if (flags.includes("z")) {
    if (typeof DecompressionStream === "undefined")
      throw new ShareLinkError("Your browser is too old to open this link.", "unsupported");
    try {
      bytes = await inflateBounded(bytes, MAX_SNAPSHOT_BYTES);
    } catch (err) {
      if (err instanceof ShareLinkError) throw err;
      throw new ShareLinkError("This link is corrupted.", "malformed");
    }
  }
  if (bytes.byteLength > MAX_SNAPSHOT_BYTES) throw new ShareLinkError("This link is too large to open.", "malformed");
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ShareLinkError("This link is corrupted.", "malformed");
  }
  return parseSnapshot(raw);
}

/* ---------- validation of untrusted snapshots ---------- */

/** Decoded JSON larger than this is rejected (real snapshots are a few KB). */
export const MAX_SNAPSHOT_BYTES = 5_000_000;
export const SNAPSHOT_LIMITS = { rows: 50_000, title: 200, note: 1_000, periodLabel: 200, description: 500, amount: 1e12 } as const;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day in YYYY-MM-DD form (rejects 2024-02-30, 2024-13-01, …). */
function isISODay(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = ISO_DAY.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

const isTimestamp = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

/**
 * Validate a decoded snapshot field by field. Share links are untrusted input:
 * anyone can craft one, so nothing reaches the viewer unless it matches the
 * shape the app itself produces (see ShareConfig).
 */
export function parseSnapshot(raw: unknown): SharedSnapshot {
  const bad = (what: string): never => {
    throw new ShareLinkError(`This link is corrupted (${what}).`, "malformed");
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("not a report");
  const s = raw as Record<string, unknown>;
  const L = SNAPSHOT_LIMITS;

  if (s.v !== 1) return bad("unknown version");
  if (!isText(s.title, L.title)) return bad("title");
  if (s.note !== undefined && !isText(s.note, L.note)) return bad("note");
  if (!isText(s.periodLabel, L.periodLabel)) return bad("period");
  if (typeof s.currency !== "string" || !CURRENCIES.some((c) => c.code === s.currency)) return bad("currency");
  if (!isTimestamp(s.createdAt)) return bad("creation date");
  if (s.expiresAt !== null && !isTimestamp(s.expiresAt)) return bad("expiry date");
  if (!Array.isArray(s.rows) || s.rows.length > L.rows) return bad("rows");

  const rows = s.rows.map((r: unknown, i): SharedSnapshot["rows"][number] => {
    if (!Array.isArray(r) || r.length !== 4) return bad(`row ${i + 1}`);
    const [date, category, amount, description] = r as unknown[];
    if (!isISODay(date)) return bad(`row ${i + 1} date`);
    if (typeof category !== "string" || !(CATEGORIES as readonly string[]).includes(category)) return bad(`row ${i + 1} category`);
    if (typeof amount !== "number" || !Number.isFinite(amount) || Math.abs(amount) > L.amount) return bad(`row ${i + 1} amount`);
    if (!isText(description, L.description)) return bad(`row ${i + 1} description`);
    return [date, category as Category, amount, description];
  });

  return {
    v: 1,
    title: s.title,
    ...(s.note !== undefined ? { note: s.note as string } : {}),
    periodLabel: s.periodLabel,
    currency: s.currency as CurrencyCode,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt as string | null,
    rows,
  };
}

/** QR version 40-L tops out at ~2.9 KB; keep a margin so codes stay scannable. */
export const QR_MAX_URL_LENGTH = 2000;
