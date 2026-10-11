import crypto from "crypto";
import { env } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Obtiene la clave de 32 bytes a partir del string hexadecimal en variables de entorno.
 */
function getEncryptionKey(): Buffer {
  return Buffer.from(env.DATA_ENCRYPTION_KEY, "hex");
}

/**
 * Cifra un texto sensible usando AES-256-GCM (autenticado y seguro).
 * Formato resultante: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encryptSensitiveData(plainText: string): string {
  if (!plainText) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Descifra un texto cifrado en formato iv:auth_tag:ciphertext.
 */
export function decryptSensitiveData(encryptedPayload: string): string {
  if (!encryptedPayload) return "";

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de payload cifrado inválido");
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Genera un hash HMAC determinista (SHA-256) para búsquedas seguras
 * sin exponer el documento o dato sensible en texto plano en la base de datos.
 */
export function hashSearchableField(value: string): string {
  if (!value) return "";
  const key = getEncryptionKey();
  return crypto.createHmac("sha256", key).update(value.trim().toLowerCase()).digest("hex");
}

