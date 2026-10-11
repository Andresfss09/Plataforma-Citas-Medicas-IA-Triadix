import test from "node:test";
import assert from "node:assert/strict";
import {
  buscarEspecialidadPorMotivo,
  buscarDisponibilidad,
  reservarCita,
  cancelarCita,
  reprogramarCita,
} from "./citas.service";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

test("Suite de Servicios de Citas y Concurrencia (Fase 2)", async (t) => {
  const db = getDb();

  await t.test("1. Búsqueda Semántica Híbrida: Mapeo de motivo coloquial a especialidad", async () => {
    // Casos reales coloquiales de afiliados en Cali
    const caso1 = await buscarEspecialidadPorMotivo("me duele la rodilla al subir las gradas");
    assert.ok(caso1.length > 0, "Debe retornar al menos una especialidad");
    assert.equal(caso1[0].nombre, "Ortopedia y Traumatología", "Debe sugerir Ortopedia para dolor de rodilla");

    const caso2 = await buscarEspecialidadPorMotivo("se me cayó una calza y me duele una muela");
    assert.ok(caso2.length > 0);
    assert.equal(caso2[0].nombre, "Odontología General", "Debe sugerir Odontología para muelas y calzas");

    const caso3 = await buscarEspecialidadPorMotivo("no puedo ver bien las letras pequeñas de cerca");
    assert.ok(caso3.length > 0);
    assert.ok(
      caso3[0].nombre === "Optometría" || caso3[0].nombre === "Oftalmología",
      "Debe sugerir Optometría u Oftalmología para visión borrosa"
    );
  });

  await t.test("2. Búsqueda de disponibilidad con filtros de sede y jornada", async () => {
    const slots = await buscarDisponibilidad({
      especialidadId: "esp-med-gen",
      sedeId: "sede-tequendama",
      jornada: "manana",
      limite: 5,
    });

    assert.ok(slots.length > 0, "Debe encontrar franjas en Tequendama en la mañana");
    assert.equal(slots[0].sedeId, "sede-tequendama");
    assert.equal(slots[0].jornada, "manana");
  });

  await t.test("3. Flujo completo: Reserva, Cancelación y Reprogramación", async () => {
    // Limpiar citas previas para aislar el test
    await db.delete(schema.citas);
    await db.update(schema.agendas).set({ estado: "disponible" });

    // Buscar un slot disponible
    const slots = await buscarDisponibilidad({
      especialidadId: "esp-odont",
      sedeId: "sede-elguabal",
      limite: 2,
    });

    assert.ok(slots.length >= 2, "Se requieren al menos 2 slots para la prueba");
    const slot1 = slots[0];
    const slot2 = slots[1];

    // Reservar slot 1
    const reserva = await reservarCita({
      afiliadoId: "afi-1",
      slotId: slot1.slotId,
      motivoConsulta: "Revisión odontológica anual",
      canal: "voz",
    });

    assert.equal(reserva.exito, true);
    assert.ok(reserva.codigoCita?.startsWith("CTX-2026-"));
    const citaId = reserva.citaId!;

    // Verificar que el slot quedó ocupado
    const [slotVerificado] = await db
      .select()
      .from(schema.agendas)
      .where(eq(schema.agendas.id, slot1.slotId));
    assert.equal(slotVerificado.estado, "reservada");

    // Reprogramar hacia slot 2
    const reprog = await reprogramarCita({
      citaId: citaId,
      nuevoSlotId: slot2.slotId,
      afiliadoId: "afi-1",
    });

    assert.equal(reprog.exito, true);

    // Verificar que slot 1 fue liberado y slot 2 quedó reservado
    const [slot1Liberado] = await db
      .select()
      .from(schema.agendas)
      .where(eq(schema.agendas.id, slot1.slotId));
    const [slot2Ocupado] = await db
      .select()
      .from(schema.agendas)
      .where(eq(schema.agendas.id, slot2.slotId));

    assert.equal(slot1Liberado.estado, "disponible");
    assert.equal(slot2Ocupado.estado, "reservada");

    // Cancelar la nueva cita
    const cancelacion = await cancelarCita({
      citaId: reprog.citaId!,
      afiliadoId: "afi-1",
      motivo: "Viaje de trabajo inesperado",
    });

    assert.equal(cancelacion.exito, true);

    const [slot2Liberado] = await db
      .select()
      .from(schema.agendas)
      .where(eq(schema.agendas.id, slot2.slotId));
    assert.equal(slot2Liberado.estado, "disponible");
  });

  await t.test("4. PRUEBA DE CONCURRENCIA EXTREMA: 50 reservas simultáneas sobre la misma franja", async () => {
    // Tomar un slot limpio y disponible
    const slotsDisponibles = await buscarDisponibilidad({
      especialidadId: "esp-pediat",
      sedeId: "sede-sanfernando",
      limite: 1,
    });

    assert.ok(slotsDisponibles.length > 0);
    const targetSlot = slotsDisponibles[0];

    // Asegurar que no hay cita previa en ese slot
    await db.delete(schema.citas).where(eq(schema.citas.agendaId, targetSlot.slotId));
    await db.update(schema.agendas).set({ estado: "disponible" }).where(eq(schema.agendas.id, targetSlot.slotId));

    console.log(`\n⚡ Iniciando prueba de estrés: 50 reservas simultáneas sobre el slot ${targetSlot.slotId}...`);

    // Lanzar 50 peticiones concurrentes simultáneas al mismo milisegundo
    const NUMERO_PETICIONES = 50;
    const promesas = [];

    for (let i = 1; i <= NUMERO_PETICIONES; i++) {
      const afiliadoId = `afi-${(i % 50) + 1}`;
      promesas.push(
        reservarCita({
          afiliadoId: afiliadoId,
          slotId: targetSlot.slotId,
          motivoConsulta: `Petición concurrente #${i}`,
          canal: "voz",
        })
      );
    }

    const resultados = await Promise.all(promesas);

    const exitosas = resultados.filter((r) => r.exito);
    const fallidas = resultados.filter((r) => !r.exito);

    console.log(`📊 Resultados del test de concurrencia:`);
    console.log(`   - Exitosas: ${exitosas.length}`);
    console.log(`   - Fallidas con mensaje de franja no disponible: ${fallidas.length}`);

    // EXACTAMENTE UNA reserva debe tener éxito, las 49 restantes deben fallar
    assert.equal(exitosas.length, 1, "EXACTAMENTE 1 solicitud debe tener éxito para evitar sobrecupo");
    assert.equal(fallidas.length, 49, "Las 49 solicitudes restantes deben ser rechazadas limpiamente");

    // Verificar en la base de datos que solo existe 1 cita asociada a esa agenda
    const citasEnDb = await db
      .select()
      .from(schema.citas)
      .where(eq(schema.citas.agendaId, targetSlot.slotId));

    assert.equal(citasEnDb.length, 1, "La base de datos debe contener exactamente 1 cita para el slot");
  });
});
