import test from "node:test";
import assert from "node:assert/strict";
import { getDb } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { hashSearchableField, decryptSensitiveData } from "../lib/crypto";

test("Database & Modelo de Datos (EPS TRIADIX)", async (t) => {
  const db = getDb();

  await t.test("debe consultar las sedes de EPS TRIADIX en Cali", async () => {
    const sedesList = await db.select().from(schema.sedes);
    assert.ok(sedesList.length >= 4, "Debe haber al menos 4 sedes");
    
    const tequendama = sedesList.find((s: any) => s.id === "sede-tequendama");
    assert.ok(tequendama, "Sede Tequendama debe existir");
    assert.equal(tequendama.ciudad, "Cali");
  });

  await t.test("debe buscar un paciente por hash de cédula y descifrar sus datos protegidos", async () => {
    const cedulaBuscada = "1144123456";
    const docHash = hashSearchableField(cedulaBuscada);

    const pacientesEncontrados = await db
      .select()
      .from(schema.pacientes)
      .where(eq(schema.pacientes.numeroDocumentoHash, docHash));

    assert.equal(pacientesEncontrados.length, 1, "Debe encontrar exactamente un paciente");
    const paciente = pacientesEncontrados[0];

    const nombresReales = decryptSensitiveData(paciente.nombresEnc);
    const apellidosReales = decryptSensitiveData(paciente.apellidosEnc);
    const telefonoReal = decryptSensitiveData(paciente.telefonoEnc);

    assert.equal(nombresReales, "Carlos Alberto");
    assert.equal(apellidosReales, "Gómez Restrepo");
    assert.equal(telefonoReal, "3155551234");
  });

  await t.test("debe verificar consentimiento de Habeas Data registrado para el paciente", async () => {
    const consentimientos = await db
      .select()
      .from(schema.consentimientosHabeasData)
      .where(eq(schema.consentimientosHabeasData.pacienteId, "pac-1"));

    assert.equal(consentimientos.length, 1);
    assert.equal(consentimientos[0].acepto, true);
    assert.equal(consentimientos[0].canal, "voz");
  });

  await t.test("debe contar con franjas de disponibilidad médica", async () => {
    const slots = await db.select().from(schema.disponibilidadMedica);
    assert.ok(slots.length > 50, "Debe haber múltiples franjas disponibles");
  });
});

