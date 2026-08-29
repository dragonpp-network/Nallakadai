/**
 * Fast re-entry for staff: the Supabase refresh token is sealed on the device
 * with an AES-GCM key derived from the admin's 4-digit PIN (PBKDF2, 250k rounds).
 * The PIN itself is never stored, and the sealed blob is useless without it.
 */

const KEY = "nk.pinlock.v1";

type Sealed = { mobile: string; salt: string; iv: string; data: string; label: string };

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pin: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 250_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function getPinLock(): Sealed | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

export function clearPinLock() {
  localStorage.removeItem(KEY);
}

export async function savePinLock(opts: {
  pin: string;
  mobile: string;
  label: string;
  refreshToken: string;
}) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(opts.pin, salt);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(opts.refreshToken),
  );
  const sealed: Sealed = {
    mobile: opts.mobile,
    label: opts.label,
    salt: toB64(salt.buffer as ArrayBuffer),
    iv: toB64(iv.buffer as ArrayBuffer),
    data: toB64(data),
  };
  localStorage.setItem(KEY, JSON.stringify(sealed));
}

/** Returns the refresh token, or null when the PIN is wrong. */
export async function unlockPin(pin: string): Promise<string | null> {
  const sealed = getPinLock();
  if (!sealed) return null;
  try {
    const key = await deriveKey(pin, fromB64(sealed.salt));
    const out = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(sealed.iv) as BufferSource },
      key,
      fromB64(sealed.data) as BufferSource,
    );
    return dec.decode(out);
  } catch {
    return null;
  }
}
