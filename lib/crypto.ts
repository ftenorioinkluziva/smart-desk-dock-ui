import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

function getKey() {
  const source = process.env.APP_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET
  if (!source) {
    throw new Error("APP_ENCRYPTION_KEY is not configured")
  }
  return createHash("sha256").update(source).digest()
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":")
}

export function decryptSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":")
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported encrypted secret format")
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

