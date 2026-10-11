import { getDb } from "../db";
import * as schema from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { buscarDisponibilidad, reservarCita } from "./citas.service";

export interface EntradaListaEspera {
  afiliadoId: string;
  especialidadId: string;
  sedeId?: string;
  canal: string;
}

// Almacén en memoria persistente de la lista de espera para reasignación inmediata
const colaEspera: Array<{
  id: string;
  afiliadoId: string;
  especialidadId: string;
  sedeId?: string;
  fechaRegistro: Date;
}> = [];

/**
 * Inscribe a un afiliado en la lista de espera cuando no encuentra cupos inmediatos
 */
export async function inscribirEnListaEspera(params: EntradaListaEspera): Promise<{ exito: boolean; posicion: number; mensaje: string }> {
  const id = `espera-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  colaEspera.push({
    id,
    afiliadoId: params.afiliadoId,
    especialidadId: params.especialidadId,
    sedeId: params.sedeId,
    fechaRegistro: new Date(),
  });

  const posicion = colaEspera.filter((e) => e.especialidadId === params.especialidadId).length;

  return {
    exito: true,
    posicion,
    mensaje: `Ha quedado inscrito en la lista de espera automática de EPS TRIADIX en la posición #${posicion}. Tan pronto se libere un cupo, el sistema le contactará prioritariamente.`,
  };
}

/**
 * Reprogramación proactiva tras cancelación:
 * Consulta y devuelve de inmediato las 3 mejores opciones próximas en la misma sede o sedes contiguas de Cali.
 */
export async function obtenerOpcionesProactivasTrasCancelacion(params: {
  especialidadId: string;
  sedeId: string;
}): Promise<any[]> {
  const opciones = await buscarDisponibilidad({
    especialidadId: params.especialidadId,
    sedeId: params.sedeId,
    limite: 3,
  });

  if (opciones.length < 3) {
    // Si no hay 3 en la misma sede, buscar en toda la red de Cali
    const alternativas = await buscarDisponibilidad({
      especialidadId: params.especialidadId,
      limite: 3,
    });
    return alternativas;
  }

  return opciones;
}

/**
 * Reasignación automática de cupo liberado a la lista de espera
 */
export async function procesarReasignacionCupoLiberado(slotId: string, especialidadId: string): Promise<any | null> {
  const index = colaEspera.findIndex((e) => e.especialidadId === especialidadId);
  if (index === -1) return null;

  const primeroEnEspera = colaEspera.splice(index, 1)[0];

  // Reservar automáticamente para el afiliado en espera
  const resultado = await reservarCita({
    afiliadoId: primeroEnEspera.afiliadoId,
    slotId: slotId,
    motivoConsulta: "Asignación automática desde Lista de Espera EPS TRIADIX",
    canal: "voz",
  });

  return {
    afiliadoBeneficiadoId: primeroEnEspera.afiliadoId,
    reserva: resultado,
  };
}

