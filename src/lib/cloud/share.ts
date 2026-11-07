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
import type { Category, CurrencyCode } from "../types";

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
    bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
  }
  try {
    const snap = JSON.parse(new TextDecoder().decode(bytes)) as SharedSnapshot;
    if (snap.v !== 1 || !Array.isArray(snap.rows)) throw new Error();
    return snap;
  } catch {
    throw new ShareLinkError("This link is corrupted.", "malformed");
  }
}

/** QR version 40-L tops out at ~2.9 KB; keep a margin so codes stay scannable. */
export const QR_MAX_URL_LENGTH = 2000;
