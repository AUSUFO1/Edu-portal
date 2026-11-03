/**
 * Password hashing with PBKDF2-HMAC-SHA256 through the Web Crypto API.
 *
 * Web Crypto runs natively on Cloudflare Workers and in Node.
 *
 * Cost trade-off: the deployment runs on the Workers free plan, which allows ~10 ms of CPU per
 * request, while PBKDF2 CPU time grows linearly with iterations (100,000 takes 50-200 ms). The
 * work factor is therefore set to fit that budget. Every hash stores its own iteration count, and
 * `needsRehash` upgrades a user's hash on their next sign-in, so raising ITERATIONS on a paid plan
 * (OWASP recommends 600,000 for PBKDF2-SHA256) needs no migration.
 *
 * Stored format: pbkdf2-sha256$<iterations>$<salt base64>$<hash base64>
 */
const ALGORITHM = 'pbkdf2-sha256';
const ITERATIONS = 3_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return [ALGORITHM, ITERATIONS, toBase64(salt), toBase64(hash)].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterations, salt, hash] = stored.split('$');
  if (algorithm !== ALGORITHM || !iterations || !salt || !hash) return false;
  const candidate = await derive(password, fromBase64(salt), Number(iterations));
  return timingSafeEqual(candidate, fromBase64(hash));
}

/** True when a stored hash was made with a different work factor and should be replaced. */
export function needsRehash(stored: string) {
  const [algorithm, iterations] = stored.split('$');
  return algorithm !== ALGORITHM || Number(iterations) !== ITERATIONS;
}

/**
 * A hash to verify against when the email is unknown, so a failed login takes the same time
 * whether or not the account exists (prevents account enumeration by timing).
 */
export const DUMMY_HASH = `${ALGORITHM}$${ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, KEY_BITS);
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
