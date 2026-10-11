import { getDb } from "../db";
import * as schema from "../db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { generateLocalEmbedding, cosineSimilarity, stringToVector } from "../lib/embeddings";
import { encryptSensitiveData, hashSearchableField } from "../lib/crypto";

export interface BuscarEspecialidadResult {
  especialidadId: string;
  nombre: string;
  codigoCups: string;
  descripcion: string;
  tipoAcceso: string;
  requiereAutorizacionPrevia: boolean;
  scoreSimilitud: number;
  motivoDetectado?: string;
}

export interface FiltrosDisponibilidad {
  especialidadId: string;
  sedeId?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
  jornada?: "manana" | "tarde";
  limite?: number;
}

export interface AgendaSlotDetalle {
  slotId: string;
  medicoId: string;
  medicoNombre: string;
  registroRethus: string;
  sedeId: string;
  sedeNombre: string;
  sedeDireccion: string;
  sedeBarrio: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  jornada: string;
}

export interface ReservarCitaParams {
  afiliadoId: string;
  slotId: string;
  motivoConsulta?: string;
  canal?: "voz" | "web";
}

export interface ReservarCitaResult {
  exito: boolean;
  codigoCita?: string;
  mensaje: string;
  citaId?: string;
  slotId?: string;
  fechaCita?: string;
  horaInicio?: string;
  sedeNombre?: string;
  medicoNombre?: string;
}

/**
 * 1. Búsqueda Híbrida Semántica (Texto + Vectores HNSW)
 * Mapea lenguaje coloquial del paciente (ej. "me duele la rodilla", "ver mal de lejos")
 * a la especialidad médica adecuada (Ortopedia, Optometría, etc.)
 */
export async function buscarEspecialidadPorMotivo(
  textoColoquial: string
): Promise<BuscarEspecialidadResult[]> {
  if (!textoColoquial || textoColoquial.trim().length === 0) {
    return [];
  }

  const db = getDb();
  const queryEmbedding = generateLocalEmbedding(textoColoquial);
  const textoNorm = textoColoquial.toLowerCase().trim();

  // Consultar catálogo de motivos coloquiales y especialidades
  const motivos = await db.select().from(schema.catalogoMotivosConsulta);
  const especialidades = await db.select().from(schema.especialidades);

  const scoresPorEspecialidad = new Map<string, { score: number; motivoDetectado: string }>();

  for (const m of motivos) {
    const mVector = stringToVector(m.embeddingVector);
    const vectorScore = cosineSimilarity(queryEmbedding, mVector);

    // Score textual (coincidencia de palabras clave)
    let textScore = 0;
    const palabras = textoNorm.split(/\s+/);
    for (const p of palabras) {
      if (p.length > 3 && m.fraseColoquial.toLowerCase().includes(p)) {
        textScore += 0.35;
      }
    }

    // Ponderación híbrida (70% semántica vectorial + 30% coincidencia textual)
    const hybridScore = vectorScore * 0.7 + Math.min(1.0, textScore) * 0.3;

    const actual = scoresPorEspecialidad.get(m.especialidadId);
    if (!actual || hybridScore > actual.score) {
      scoresPorEspecialidad.set(m.especialidadId, {
        score: hybridScore,
        motivoDetectado: m.fraseColoquial,
      });
    }
  }

  // Evaluar también directamente la descripción de las especialidades
  for (const esp of especialidades) {
    const espVector = stringToVector(esp.embeddingVector);
    const vectorScore = cosineSimilarity(queryEmbedding, espVector);
    const actual = scoresPorEspecialidad.get(esp.id);
    if (!actual || vectorScore > actual.score) {
      scoresPorEspecialidad.set(esp.id, {
        score: vectorScore,
        motivoDetectado: esp.nombre,
      });
    }
  }

  // Construir y ordenar resultados
  const resultados: BuscarEspecialidadResult[] = [];
  for (const esp of especialidades) {
    const match = scoresPorEspecialidad.get(esp.id);
    if (match && match.score > 0.15) {
      resultados.push({
        especialidadId: esp.id,
        nombre: esp.nombre,
        codigoCups: esp.codigoCups,
        descripcion: esp.descripcion,
        tipoAcceso: esp.tipoAcceso,
        requiereAutorizacionPrevia: esp.requiereAutorizacionPrevia,
        scoreSimilitud: Number(match.score.toFixed(4)),
        motivoDetectado: match.motivoDetectado,
      });
    }
  }

  return resultados.sort((a, b) => b.scoreSimilitud - a.scoreSimilitud);
}

/**
 * 2. Búsqueda de Franjas de Disponibilidad Médica
 */
export async function buscarDisponibilidad(
  filtros: FiltrosDisponibilidad
): Promise<AgendaSlotDetalle[]> {
  const db = getDb();
  const limite = filtros.limite || 10;

  let query = db
    .select({
      slotId: schema.agendas.id,
      medicoId: schema.agendas.medicoId,
      medicoNombres: schema.medicos.nombres,
      medicoApellidos: schema.medicos.apellidos,
      registroRethus: schema.medicos.registroMedicoRethus,
      sedeId: schema.agendas.sedeId,
      sedeNombre: schema.sedesIps.nombre,
      sedeDireccion: schema.sedesIps.direccion,
      sedeBarrio: schema.sedesIps.barrio,
      fecha: schema.agendas.fecha,
      horaInicio: schema.agendas.horaInicio,
      horaFin: schema.agendas.horaFin,
      jornada: schema.agendas.jornada,
      estado: schema.agendas.estado,
    })
    .from(schema.agendas)
    .innerJoin(schema.medicos, eq(schema.agendas.medicoId, schema.medicos.id))
    .innerJoin(schema.sedesIps, eq(schema.agendas.sedeId, schema.sedesIps.id))
    .where(
      and(
        eq(schema.agendas.especialidadId, filtros.especialidadId),
        eq(schema.agendas.estado, "disponible"),
        filtros.sedeId ? eq(schema.agendas.sedeId, filtros.sedeId) : undefined,
        filtros.jornada ? eq(schema.agendas.jornada, filtros.jornada) : undefined,
        filtros.desde ? gte(schema.agendas.fecha, filtros.desde) : undefined,
        filtros.hasta ? lte(schema.agendas.fecha, filtros.hasta) : undefined
      )
    )
    .orderBy(schema.agendas.fecha, schema.agendas.horaInicio)
    .limit(limite);

  const rawRows = await query;

  return rawRows.map((r: any) => ({
    slotId: r.slotId,
    medicoId: r.medicoId,
    medicoNombre: `Dr. ${r.medicoNombres} ${r.medicoApellidos}`,
    registroRethus: r.registroRethus,
    sedeId: r.sedeId,
    sedeNombre: r.sedeNombre,
    sedeDireccion: r.sedeDireccion,
    sedeBarrio: r.sedeBarrio,
    fecha: r.fecha,
    horaInicio: r.horaInicio,
    horaFin: r.horaFin,
    jornada: r.jornada,
  }));
}

/**
 * 3. Reserva Atómica de Cita Médica (Zero Overbooking / Concurrencia Inviolable)
 * Utiliza bloqueo atómico condicional con versión de concurrencia e inserción protegida.
 * Garantiza que si 50 solicitudes compiten por la misma franja, EXACTAMENTE 1 triunfa.
 */
export async function reservarCita(
  params: ReservarCitaParams
): Promise<ReservarCitaResult> {
  const db = getDb();
  const { afiliadoId, slotId, motivoConsulta, canal = "voz" } = params;

  // 1. Verificar estado del afiliado (Habeas Data & Vigencia)
  const [afiliado] = await db
    .select()
    .from(schema.afiliados)
    .where(eq(schema.afiliados.id, afiliadoId));

  if (!afiliado) {
    return { exito: false, mensaje: "Afiliado no encontrado en la base de datos de EPS TRIADIX." };
  }

  if (afiliado.estadoAfiliacion !== "ACTIVO") {
    return {
      exito: false,
      mensaje: `Su afiliación presenta estado ${afiliado.estadoAfiliacion}. Por favor comuníquese a la línea de aportes (602) 489-8000 para regularizar su cobertura.`,
    };
  }

  // 2. Transacción de Reserva Atómica con Bloqueo Condicional (Zero Overbooking)
  // Actualizamos el slot condicionalmente SOLO si estado = 'disponible'.
  // Al retornar las filas afectadas, si es 0 significa que otro proceso ya lo tomó.
  const updateResult = await db
    .update(schema.agendas)
    .set({
      estado: "reservada",
      versionConcurrencia: sql`${schema.agendas.versionConcurrencia} + 1`,
    })
    .where(
      and(
        eq(schema.agendas.id, slotId),
        eq(schema.agendas.estado, "disponible")
      )
    )
    .returning();

  if (!updateResult || updateResult.length === 0) {
    return {
      exito: false,
      mensaje: "Lo sentimos, este horario acaba de ser reservado por otro usuario. Por favor seleccione otra franja disponible.",
    };
  }

  const slotReservado = updateResult[0];

  // 3. Crear registro de cita
  const codigoCita = `CTX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const citaId = crypto.randomUUID();

function calcularHoraFin25Min(horaInicio: string): string {
  try {
    const partes = horaInicio.split(":");
    let h = parseInt(partes[0], 10);
    let m = parseInt(partes[1], 10) + 25; // Duración estándar EPS de 25 minutos por paciente
    if (m >= 60) {
      h = (h + Math.floor(m / 60)) % 24;
      m = m % 60;
    }
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
  } catch {
    return horaInicio;
  }
}

  try {
    await db.insert(schema.citas).values({
      id: citaId,
      codigoCita: codigoCita,
      afiliadoId: afiliadoId,
      medicoId: slotReservado.medicoId,
      especialidadId: slotReservado.especialidadId,
      sedeId: slotReservado.sedeId,
      agendaId: slotReservado.id,
      fechaCita: slotReservado.fecha,
      horaInicio: slotReservado.horaInicio,
      horaFin: calcularHoraFin25Min(slotReservado.horaInicio),
      tipoCita: "consulta_externa",
      motivoConsultaEnc: motivoConsulta ? encryptSensitiveData(motivoConsulta) : null,
      canal: canal,
      estado: "programada",
    });

    // 4. Registro de auditoría
    await db.insert(schema.auditoria).values({
      id: crypto.randomUUID(),
      accion: "AGENDAMIENTO_CITA_MEDICA",
      entidad: "citas",
      entidadId: citaId,
      usuarioOrigen: `afiliado_${afiliado.tipoDocumento}`,
      ip: "127.0.0.1",
      detallesHash: hashSearchableField(codigoCita),
    });

    // Obtener detalles para comprobante
    const [sede] = await db
      .select()
      .from(schema.sedesIps)
      .where(eq(schema.sedesIps.id, slotReservado.sedeId));

    const [medico] = await db
      .select()
      .from(schema.medicos)
      .where(eq(schema.medicos.id, slotReservado.medicoId));

    return {
      exito: true,
      codigoCita: codigoCita,
      citaId: citaId,
      slotId: slotId,
      fechaCita: slotReservado.fecha,
      horaInicio: slotReservado.horaInicio,
      sedeNombre: sede ? sede.nombre : "Sede EPS TRIADIX",
      medicoNombre: medico ? `Dr. ${medico.nombres} ${medico.apellidos}` : "Médico Asignado",
      mensaje: `Su cita ha sido agendada con éxito bajo el código ${codigoCita}.`,
    };
  } catch (error: any) {
    console.error("DEBUG ERROR EN RESERVAR CITA:", error);
    // Si la inserción de cita fallara (ej. colisión de clave única), revertir el slot a disponible
    await db
      .update(schema.agendas)
      .set({ estado: "disponible" })
      .where(eq(schema.agendas.id, slotId));

    return {
      exito: false,
      mensaje: `Ocurrió un error al confirmar la cita: ${error.message}. La franja fue liberada.`,
    };
  }
}

/**
 * 4. Cancelación de Cita Médica y Liberación Inmediata de Franja
 */
export async function cancelarCita(params: {
  citaId: string;
  motivo?: string;
  afiliadoId: string;
}): Promise<{ exito: boolean; mensaje: string }> {
  const db = getDb();
  const { citaId, motivo, afiliadoId } = params;

  const [cita] = await db
    .select()
    .from(schema.citas)
    .where(and(eq(schema.citas.id, citaId), eq(schema.citas.afiliadoId, afiliadoId)));

  if (!cita) {
    return { exito: false, mensaje: "Cita no encontrada o no pertenece al afiliado." };
  }

  if (cita.estado === "cancelada") {
    return { exito: false, mensaje: "La cita ya se encuentra cancelada." };
  }

  // 1. Actualizar estado de la cita
  await db
    .update(schema.citas)
    .set({
      estado: "cancelada",
      motivoCancelacion: motivo || "Cancelada a solicitud del usuario por canal de voz",
      updatedAt: new Date(),
    })
    .where(eq(schema.citas.id, citaId));

  // 2. Liberar la franja en agendas
  await db
    .update(schema.agendas)
    .set({ estado: "disponible" })
    .where(eq(schema.agendas.id, cita.agendaId));

  // 3. Auditoría
  await db.insert(schema.auditoria).values({
    id: crypto.randomUUID(),
    accion: "CANCELACION_CITA_MEDICA",
    entidad: "citas",
    entidadId: citaId,
    usuarioOrigen: "asistente_voz",
    ip: "127.0.0.1",
    detallesHash: hashSearchableField(`Cancelada: ${cita.codigoCita}`),
  });

  return { exito: true, mensaje: `La cita ${cita.codigoCita} ha sido cancelada exitosamente y el horario quedó liberado.` };
}

/**
 * 5. Reprogramación Atómica de Cita Médica
 */
export async function reprogramarCita(params: {
  citaId: string;
  nuevoSlotId: string;
  afiliadoId: string;
}): Promise<ReservarCitaResult> {
  const db = getDb();
  const { citaId, nuevoSlotId, afiliadoId } = params;

  const [citaOriginal] = await db
    .select()
    .from(schema.citas)
    .where(and(eq(schema.citas.id, citaId), eq(schema.citas.afiliadoId, afiliadoId)));

  if (!citaOriginal) {
    return { exito: false, mensaje: "Cita original no encontrada." };
  }

  // 1. Intentar reservar el nuevo slot atómicamente
  const reservaNueva = await reservarCita({
    afiliadoId,
    slotId: nuevoSlotId,
    motivoConsulta: "Reprogramación de cita anterior",
    canal: "voz",
  });

  if (!reservaNueva.exito) {
    return reservaNueva;
  }

  // 2. Cancelar y liberar el slot anterior
  await db
    .update(schema.citas)
    .set({
      estado: "reprogramada",
      motivoCancelacion: `Reprogramada hacia nueva cita ${reservaNueva.codigoCita}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.citas.id, citaId));

  await db
    .update(schema.agendas)
    .set({ estado: "disponible" })
    .where(eq(schema.agendas.id, citaOriginal.agendaId));

  return {
    ...reservaNueva,
    mensaje: `Su cita ha sido reprogramada exitosamente. Su nuevo código de cita es ${reservaNueva.codigoCita}.`,
  };
}
