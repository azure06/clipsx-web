/**
 * TOTP (RFC 6238) — browser-native implementation using SubtleCrypto.
 * No external deps; counter = floor(now / 30).
 */

function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.ceil((clean.length * 5) / 8));
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return output.slice(0, index);
}

function counterToBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  return bytes;
}

export async function totpAsync(secret: string): Promise<{ code: string; secondsLeft: number }> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / 30);
  const secondsLeft = 30 - (now % 30);

  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey("raw", keyBytes.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterToBytes(counter).buffer as ArrayBuffer));

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1_000_000;

  return { code: code.toString().padStart(6, "0"), secondsLeft };
}
