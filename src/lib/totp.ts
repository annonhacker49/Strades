import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function key(): Buffer {
  const value = process.env.TOTP_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("TOTP_ENCRYPTION_KEY must be configured as 32 bytes of hex.");
  }
  return Buffer.from(value, "hex");
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let accumulator = 0;
  let result = "";
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += BASE32[(accumulator << (5 - bits)) & 31];
  return result;
}

function base32Decode(value: string): Buffer {
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const char of value.toUpperCase().replace(/=+$/, "")) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Invalid authenticator secret");
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function decryptTotpSecret(value: string): string {
  const packed = Buffer.from(value, "base64url");
  if (packed.length < 29) throw new Error("Invalid encrypted authenticator secret");
  const decipher = createDecipheriv("aes-256-gcm", key(), packed.subarray(0, 12));
  decipher.setAuthTag(packed.subarray(12, 28));
  return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8");
}

function codeFor(secret: string, counter: bigint): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = BigInt(Math.floor(now / 30_000));
  const actual = Buffer.from(code);
  return [-1n, 0n, 1n].some((window) => {
    const expected = Buffer.from(codeFor(secret, counter + window));
    return timingSafeEqual(actual, expected);
  });
}

export function authenticatorUri(secret: string, email: string): string {
  const label = encodeURIComponent(`STRADES:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=STRADES&algorithm=SHA1&digits=6&period=30`;
}
