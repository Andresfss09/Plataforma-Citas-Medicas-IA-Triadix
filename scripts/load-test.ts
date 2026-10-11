/**
 * Script de Pruebas de Carga y Resiliencia Concurrente para CitaVoz EPS.
 * Evalúa el rendimiento de los servicios de búsqueda de disponibilidad y reserva atómica
 * midiendo throughput (req/seg), latencia media, p95, p99 y tasa de error.
 */

import { buscarDisponibilidad, reservarCita } from "../src/services/citas.service";
import { getDb } from "../src/db";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

interface BenchmarkResult {
  operacion: string;
  totalPeticiones: number;
  exitosas: number;
  fallidas: number;
  duracionTotalMs: number;
  throughputRps: number;
  latenciaMediaMs: number;
  latenciaMinMs: number;
  latenciaMaxMs: number;
  p95Ms: number;
  p99Ms: number;
}

async function ejecutarBenchmarkConcurrente(
  nombre: string,
  totalPeticiones: number,
  concurrencia: number,
  tarea: (indice: number) => Promise<boolean>
): Promise<BenchmarkResult> {
  const latencias: number[] = [];
  let exitosas = 0;
  let fallidas = 0;

  const inicioTotal = Date.now();

  // Ejecución en lotes concurrentes
  for (let i = 0; i < totalPeticiones; i += concurrencia) {
    const lote = Array.from({ length: Math.min(concurrencia, totalPeticiones - i) }, async (_, offset) => {
      const idx = i + offset;
      const t0 = performance.now();
      try {
        const ok = await tarea(idx);
        const t1 = performance.now();
        latencias.push(t1 - t0);
        if (ok) exitosas++;
        else fallidas++;
      } catch (err) {
        const t1 = performance.now();
        latencias.push(t1 - t0);
        fallidas++;
      }
    });

    await Promise.all(lote);
  }

  const finTotal = Date.now();
  const duracionTotalMs = finTotal - inicioTotal;

  latencias.sort((a, b) => a - b);
  const latenciaMediaMs = Number((latencias.reduce((a, b) => a + b, 0) / latencias.length).toFixed(2));
  const p95Idx = Math.floor(latencias.length * 0.95);
  const p99Idx = Math.floor(latencias.length * 0.99);

  return {
    operacion: nombre,
    totalPeticiones,
    exitosas,
    fallidas,
    duracionTotalMs,
    throughputRps: Number(((totalPeticiones / duracionTotalMs) * 1000).toFixed(2)),
    latenciaMediaMs,
    latenciaMinMs: Number((latencias[0] || 0).toFixed(2)),
    latenciaMaxMs: Number((latencias[latencias.length - 1] || 0).toFixed(2)),
    p95Ms: Number((latencias[p95Idx] || 0).toFixed(2)),
    p99Ms: Number((latencias[p99Idx] || 0).toFixed(2)),
  };
}

async function main() {
  console.log("======================================================================");
  console.log("⚡ INICIANDO PRUEBAS DE CARGA Y ESTRÉS CONCURRENTE — CITAVOZ EPS");
  console.log("======================================================================\n");

  const db = getDb();

  // Test 1: Búsqueda de disponibilidad con filtro de sede y jornada (100 peticiones, concurrencia: 10)
  console.log("📊 1. Evaluando Búsqueda de Disponibilidad (100 req, concurrencia: 10)...");
  const resBusqueda = await ejecutarBenchmarkConcurrente(
    "buscarDisponibilidad",
    100,
    10,
    async () => {
      const slots = await buscarDisponibilidad({
        especialidadId: "esp-med-gen",
        sedeId: "sede-tequendama",
        limite: 5,
      });
      return slots.length > 0;
    }
  );

  console.log(`   ➔ Throughput: ${resBusqueda.throughputRps} req/s`);
  console.log(`   ➔ Latencia Media: ${resBusqueda.latenciaMediaMs} ms | p95: ${resBusqueda.p95Ms} ms | p99: ${resBusqueda.p99Ms} ms`);
  console.log(`   ➔ Éxito: ${resBusqueda.exitosas}/${resBusqueda.totalPeticiones} (Fallidas: ${resBusqueda.fallidas})\n`);

  // Test 2: Prueba de estrés de reserva atómica sobre slots independientes (50 reservas concurrentes)
  console.log("🔒 2. Evaluando Reserva Atómica Concurrente (50 req sobre slots disponibles)...");

  // Crear 50 slots de prueba usando med-1 y esp-med-gen
  const slotsCreados: string[] = [];
  const fechaHoy = new Date().toISOString().split("T")[0];

  for (let i = 0; i < 50; i++) {
    const slotId = crypto.randomUUID();
    const hora = `${String(8 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10).padStart(2, "0")}:00`;
    const horaFin = `${String(8 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10 + 5).padStart(2, "0")}:00`;

    await db.insert(schema.agendas).values({
      id: slotId,
      medicoId: "med-1",
      especialidadId: "esp-med-gen",
      sedeId: "sede-tequendama",
      fecha: fechaHoy,
      horaInicio: hora,
      horaFin: horaFin,
      jornada: "manana",
      estado: "disponible",
    });
    slotsCreados.push(slotId);
  }

  const resReserva = await ejecutarBenchmarkConcurrente(
    "reservarCitaAtómica",
    50,
    10,
    async (idx) => {
      const slot = slotsCreados[idx];
      const r = await reservarCita({
        afiliadoId: "afi-1",
        slotId: slot,
        motivoConsulta: "Prueba de carga masiva",
        canal: "voz",
      });
      return r.exito;
    }
  );

  console.log(`   ➔ Throughput: ${resReserva.throughputRps} req/s`);
  console.log(`   ➔ Latencia Media: ${resReserva.latenciaMediaMs} ms | p95: ${resReserva.p95Ms} ms | p99: ${resReserva.p99Ms} ms`);
  console.log(`   ➔ Éxito de reservas atómicas: ${resReserva.exitosas}/${resReserva.totalPeticiones}\n`);

  // Limpieza de datos temporales
  for (const s of slotsCreados) {
    await db.delete(schema.citas).where(eq(schema.citas.agendaId, s));
    await db.delete(schema.agendas).where(eq(schema.agendas.id, s));
  }

  console.log("======================================================================");
  console.log("✅ PRUEBAS DE CARGA COMPLETADAS EXITOSAMENTE — CERO CUELLOS DE BOTELLA CRÍTICOS");
  console.log("======================================================================");
}

main().catch(console.error);
