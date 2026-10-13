import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const key = () => {
  const value = process.env.ASAAS_CREDENTIALS_ENCRYPTION_KEY;
  if (!value) throw new Error("ASAAS_CREDENTIALS_ENCRYPTION_KEY is not configured");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new Error("ASAAS_CREDENTIALS_ENCRYPTION_KEY must decode to 32 bytes");
  return decoded;
};

export function encryptSecret(value:string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value:string) {
  const [ivText, tagText, dataText] = value.split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText, "base64url")), decipher.final()]).toString("utf8");
}
