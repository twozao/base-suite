import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

// scrypt from node:crypto, so there is no native dependency. Parameters are stored with the hash so
// they can be raised later without invalidating existing passwords.
const N = 16384
const R = 8
const P = 1
const KEY_BYTES = 64

const derive = (
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_BYTES, { N: n, r, p }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  )

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P)
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$")
}

export const verifyPassword = async (
  password: string,
  stored: string | null,
): Promise<boolean> => {
  if (!stored) return false
  const [scheme, n, r, p, salt, key] = stored.split("$")
  if (scheme !== "scrypt" || !salt || !key) return false
  const expected = Buffer.from(key, "base64")
  const actual = await derive(
    password,
    Buffer.from(salt, "base64"),
    Number(n),
    Number(r),
    Number(p),
  )
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72
