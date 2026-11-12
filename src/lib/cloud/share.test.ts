import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot, MAX_SNAPSHOT_BYTES, parseSnapshot, ShareLinkError, SNAPSHOT_LIMITS, type SharedSnapshot } from "./share";

const valid: SharedSnapshot = {
  v: 1,
  title: "October spending",
  note: "For the flat budget",
  periodLabel: "October 2026",
  currency: "EUR",
  createdAt: "2026-11-01T10:00:00.000Z",
  expiresAt: null,
  rows: [
    ["2026-10-30", "Food", 12.5, "Groceries"],
    ["2026-10-02", "Bills", 60, ""],
  ],
};

/** Encode any object the way an attacker could: the same pipeline the app uses. */
const craft = (snap: object, password?: string) => encodeSnapshot(snap as SharedSnapshot, password);

async function expectMalformed(promise: Promise<unknown>, message?: RegExp) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ShareLinkError);
  expect((err as ShareLinkError).code).toBe("malformed");
  if (message) expect((err as ShareLinkError).message).toMatch(message);
}

const toB64Url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("share links: valid snapshots still work", () => {
  it("round-trips a normal snapshot", async () => {
    expect(await decodeSnapshot(await encodeSnapshot(valid))).toEqual(valid);
  });

  it("round-trips a password-protected snapshot", async () => {
    const token = await encodeSnapshot(valid, "correct horse");
    expect(await decodeSnapshot(token, "correct horse")).toEqual(valid);
    await expect(decodeSnapshot(token, "wrong")).rejects.toMatchObject({ code: "password" });
  });

  it("accepts no note, an expiry date and an empty report", async () => {
    const { note: _note, ...noNote } = valid;
    const snap = { ...noNote, expiresAt: "2026-12-01T00:00:00.000Z", rows: [] };
    expect(await decodeSnapshot(await encodeSnapshot(snap))).toEqual(snap);
  });

  it("drops unknown extra fields", () => {
    const parsed = parseSnapshot({ ...valid, evil: "<script>", rows: valid.rows });
    expect(parsed).toEqual(valid);
    expect(parsed).not.toHaveProperty("evil");
  });
});

describe("share links: crafted snapshots are rejected (H-1)", () => {
  const row = (r: unknown[]) => ({ ...valid, rows: [r] });

  it.each([
    ["unknown category (used to crash the viewer)", row(["2026-10-01", "Crypto", 5, "x"]), /category/],
    ["string amount (used to make NaN totals)", row(["2026-10-01", "Food", "5", "x"]), /amount/],
    ["Infinity amount via 1e309", null, /amount/],
    ["huge amount", row(["2026-10-01", "Food", SNAPSHOT_LIMITS.amount * 10, "x"]), /amount/],
    ["impossible date", row(["2026-02-30", "Food", 5, "x"]), /date/],
    ["badly formatted date", row(["01/10/2026", "Food", 5, "x"]), /date/],
    ["row with too few fields", row(["2026-10-01", "Food", 5]), /row 1/],
    ["non-string description", row(["2026-10-01", "Food", 5, { a: 1 }]), /description/],
    ["over-long description", row(["2026-10-01", "Food", 5, "x".repeat(SNAPSHOT_LIMITS.description + 1)]), /description/],
    ["unsupported currency (Intl would throw)", { ...valid, currency: "XXX" }, /currency/],
    ["missing title", { ...valid, title: undefined }, /title/],
    ["invalid created date", { ...valid, createdAt: "yesterday" }, /creation/],
    ["invalid expiry date", { ...valid, expiresAt: "never" }, /expiry/],
    ["rows is not an array", { ...valid, rows: { 0: [] } }, /rows/],
    ["wrong version", { ...valid, v: 2 }, /version/],
  ])("%s", async (_name, snap, message) => {
    if (snap) {
      await expectMalformed(decodeSnapshot(await craft(snap)), message);
    } else {
      // JSON.stringify can't produce 1e309, so build that payload by hand (uncompressed link).
      const json = JSON.stringify(valid).replace('"Food",12.5', '"Food",1e309');
      await expectMalformed(decodeSnapshot(`v1.-.${toB64Url(new TextEncoder().encode(json))}`), message);
    }
  });

  it("rejects too many rows", () => {
    const rows = Array.from({ length: SNAPSHOT_LIMITS.rows + 1 }, () => ["2026-10-01", "Food", 1, ""]);
    expect(() => parseSnapshot({ ...valid, rows })).toThrow(/rows/);
  });

  it("rejects password-protected crafted snapshots too", async () => {
    const token = await craft(row(["2026-10-01", "Crypto", 5, "x"]), "pw123456");
    await expectMalformed(decodeSnapshot(token, "pw123456"), /category/);
  });

  it("rejects non-JSON and non-object payloads", async () => {
    await expectMalformed(decodeSnapshot(`v1.-.${toB64Url(new TextEncoder().encode("not json"))}`));
    await expectMalformed(decodeSnapshot(`v1.-.${toB64Url(new TextEncoder().encode("[1,2,3]"))}`));
    await expectMalformed(decodeSnapshot(`v1.-.${toB64Url(new TextEncoder().encode("null"))}`));
  });

  it("turns broken compressed data into a clear error, not a crash", async () => {
    await expectMalformed(decodeSnapshot(`v1.z.${toB64Url(new Uint8Array([1, 2, 3, 4, 5, 255, 254]))}`));
  });

  it("stops decompressing a 'zip bomb' link", async () => {
    // ~6 MB of spaces compresses to a few KB.
    const bomb = new TextEncoder().encode(" ".repeat(MAX_SNAPSHOT_BYTES + 1_000_000));
    const compressed = new Uint8Array(await new Response(new Blob([bomb]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
    expect(compressed.byteLength).toBeLessThan(50_000);
    await expectMalformed(decodeSnapshot(`v1.z.${toB64Url(compressed)}`), /too large/);
  });
});
