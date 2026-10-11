import test from "node:test";
import assert from "node:assert/strict";
import { encryptSensitiveData, decryptSensitiveData, hashSearchableField } from "./crypto";

test("Crypto Module (Ley 1581 / Habeas Data)", async (t) => {
  await t.test("debe cifrar y descifrar correctamente el nombre de un paciente", () => {
    const original = "Carlos Alberto Gómez Restrepo";
    const encrypted = encryptSensitiveData(original);

    assert.notEqual(encrypted, original);
    assert.match(encrypted, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // iv:tag:ciphertext

    const decrypted = decryptSensitiveData(encrypted);
    assert.equal(decrypted, original);
  });

  await t.test("debe generar un hash HMAC determinista e irreversible para cédula", () => {
    const cedula = "1144123456";
    const hash1 = hashSearchableField(cedula);
    const hash2 = hashSearchableField("1144123456");
    const hashOtro = hashSearchableField("66789123");

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hashOtro);
    assert.equal(hash1.length, 64); // SHA-256 hex
  });

  await t.test("debe manejar cadenas vacías de manera segura", () => {
    assert.equal(encryptSensitiveData(""), "");
    assert.equal(decryptSensitiveData(""), "");
    assert.equal(hashSearchableField(""), "");
  });
});

