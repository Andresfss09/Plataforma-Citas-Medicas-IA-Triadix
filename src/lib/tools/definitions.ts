import { z } from "zod";

/**
 * Catálogo Canónico de 10 Tools del Agente CitaVoz EPS
 * Compatible con esquemas JSON Schema de Function Calling (Gemini, Groq, Ollama y WebMCP)
 */

export interface ToolDefinition<TParams = any> {
  name: string;
  description: string;
  parameters: z.ZodType<TParams>;
  outputSchema?: z.ZodType<any>;
}

// 1. verificar_afiliado
export const verificarAfiliadoSchema = z.object({
  tipoDocumento: z.enum(["CC", "TI", "RC", "CE", "PA"]).describe("Tipo de documento de identidad oficial"),
  numeroDocumento: z.string().min(5).max(15).describe("Número del documento de identidad sin puntos ni comas"),
});

// 2. buscar_especialidad_por_motivo
export const buscarEspecialidadSchema = z.object({
  motivoConsulta: z.string().min(3).describe("Descripción o molestia del paciente en lenguaje coloquial (ej. 'me duele la rodilla', 'dolor de muela')"),
});

// 3. consultar_disponibilidad
export const consultarDisponibilidadSchema = z.object({
  especialidadId: z.string().describe("ID de la especialidad médica (ej. 'esp-med-gen', 'esp-odont')"),
  sedeId: z.string().optional().describe("ID de la sede en Cali (ej. 'sede-tequendama', 'sede-versalles')"),
  jornada: z.enum(["manana", "tarde"]).optional().describe("Preferencia de jornada: 'manana' o 'tarde'"),
  desde: z.string().optional().describe("Fecha inicial en formato YYYY-MM-DD"),
  hasta: z.string().optional().describe("Fecha final en formato YYYY-MM-DD"),
});

// 4. agendar_cita
export const agendarCitaSchema = z.object({
  afiliadoId: z.string().describe("ID del afiliado que solicita la cita"),
  slotId: z.string().describe("ID de la franja horaria seleccionada en agendas"),
  motivoConsulta: z.string().optional().describe("Breve motivo o síntoma manifestado por el usuario"),
  canal: z.enum(["voz", "web"]).default("voz").describe("Canal de agendamiento: voz o web"),
});

// 5. consultar_mis_citas
export const consultarMisCitasSchema = z.object({
  afiliadoId: z.string().describe("ID del afiliado para consultar sus citas programadas"),
});

// 6. reprogramar_cita
export const reprogramarCitaSchema = z.object({
  citaId: z.string().describe("ID de la cita activa que se desea cambiar"),
  nuevoSlotId: z.string().describe("ID del nuevo horario disponible seleccionado"),
  afiliadoId: z.string().describe("ID del afiliado titular de la cita"),
});

// 7. cancelar_cita
export const cancelarCitaSchema = z.object({
  citaId: z.string().describe("ID de la cita que se desea cancelar"),
  motivo: z.string().optional().describe("Razón de la cancelación suministrada por el usuario"),
  afiliadoId: z.string().describe("ID del afiliado titular de la cita"),
});

// 8. generar_comprobante_pdf
export const generarComprobantePdfSchema = z.object({
  citaId: z.string().describe("ID de la cita médica agendada para emitir el comprobante oficial"),
});

// 9. escalar_a_humano
export const escalarAHumanoSchema = z.object({
  motivoEscalamiento: z.string().describe("Razón del traspaso al asesor humano (ej. 'falla de comprensión', 'solicitud de trámite complejo')"),
  afiliadoId: z.string().optional().describe("ID del afiliado si se encuentra autenticado"),
  telefonoContacto: z.string().optional().describe("Número de teléfono para contacto prioritario"),
});

// 10. reportar_urgencia
export const reportarUrgenciaSchema = z.object({
  sintomaCritico: z.string().describe("Síntoma de alarma vital detectado (dolor torácico, disnea, sangrado, pérdida de conciencia, etc.)"),
  afiliadoId: z.string().optional().describe("ID del afiliado si está autenticado"),
});

export const TOOLS_CATALOG: ToolDefinition[] = [
  {
    name: "verificar_afiliado",
    description: "Verifica si el documento corresponde a un afiliado activo de EPS TRIADIX y retorna su estado de cobertura, régimen y categoría.",
    parameters: verificarAfiliadoSchema,
  },
  {
    name: "buscar_especialidad_por_motivo",
    description: "Realiza una búsqueda híbrida (semántica y textual) para identificar la especialidad médica más apropiada a partir de los síntomas descritos en lenguaje natural por el afiliado.",
    parameters: buscarEspecialidadSchema,
  },
  {
    name: "consultar_disponibilidad",
    description: "Consulta las citas y franjas horarias disponibles para una especialidad médica en las sedes de EPS TRIADIX en Cali, excluyendo domingos y festivos.",
    parameters: consultarDisponibilidadSchema,
  },
  {
    name: "agendar_cita",
    description: "Reserva de manera atómica y definitiva una cita médica para el afiliado en la franja horaria seleccionada, garantizando cero sobrecupo.",
    parameters: agendarCitaSchema,
  },
  {
    name: "consultar_mis_citas",
    description: "Lista todas las citas médicas activas y programadas que tiene el afiliado en EPS TRIADIX.",
    parameters: consultarMisCitasSchema,
  },
  {
    name: "reprogramar_cita",
    description: "Cambia la fecha u hora de una cita programada existente, liberando el turno anterior y reservando la nueva franja de forma atómica.",
    parameters: reprogramarCitaSchema,
  },
  {
    name: "cancelar_cita",
    description: "Cancela una cita médica programada con al menos 2 horas de antelación y libera el cupo para otros usuarios.",
    parameters: cancelarCitaSchema,
  },
  {
    name: "generar_comprobante_pdf",
    description: "Genera el comprobante oficial de la cita médica en formato PDF con radicado institucional, recomendaciones de preparación y código de validación.",
    parameters: generarComprobantePdfSchema,
  },
  {
    name: "escalar_a_humano",
    description: "Transfiere la atención de voz a un asesor humano de EPS TRIADIX ante casos complejos, desacuerdos o dificultades de comunicación.",
    parameters: escalarAHumanoSchema,
  },
  {
    name: "reportar_urgencia",
    description: "Activa de forma inmediata el protocolo de emergencia vital, interrumpiendo el flujo ordinario y direccionando a la Línea 123 de Cali.",
    parameters: reportarUrgenciaSchema,
  },
];

