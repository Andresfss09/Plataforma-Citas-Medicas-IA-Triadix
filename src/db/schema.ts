import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  date,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * 1. Sedes e IPS de EPS TRIADIX en Cali (distribuidas por comunas)
 */
export const sedesIps = pgTable("sedes_ips", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  codigoHabilitacionReps: varchar("codigo_reps", { length: 50 }).notNull(),
  direccion: varchar("direccion", { length: 255 }).notNull(),
  barrio: varchar("barrio", { length: 100 }).notNull(),
  comuna: integer("comuna").notNull(),
  zona: varchar("zona", { length: 50 }).notNull(), // Norte, Sur, Centro, Oriente, Oeste
  ciudad: varchar("ciudad", { length: 50 }).default("Cali").notNull(),
  telefono: varchar("telefono", { length: 50 }).notNull(),
  horarioApertura: time("horario_apertura").default("06:00:00").notNull(),
  horarioCierre: time("horario_cierre").default("19:00:00").notNull(),
  urgencias24Horas: boolean("urgencias_24h").default(false).notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 2. Especialidades médicas
 */
export const especialidades = pgTable("especialidades", {
  id: varchar("id", { length: 36 }).primaryKey(),
  codigoCups: varchar("codigo_cups", { length: 20 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion").notNull(),
  duracionMinutos: integer("duracion_minutos").default(30).notNull(),
  tipoAcceso: varchar("tipo_acceso", { length: 30 }).default("directo").notNull(), // directo | remision
  requiereAutorizacionPrevia: boolean("requiere_autorizacion").default(false).notNull(),
  // Vector embedding de 384 dimensiones almacenado como texto vectorizado para portabilidad
  embeddingVector: text("embedding_vector"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 3. Catálogo de motivos de consulta en lenguaje natural (para búsqueda híbrida y semántica)
 */
export const catalogoMotivosConsulta = pgTable("catalogo_motivos_consulta", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fraseColoquial: varchar("frase_coloquial", { length: 255 }).notNull(),
  especialidadId: varchar("especialidad_id", { length: 36 })
    .references(() => especialidades.id)
    .notNull(),
  descripcionClinica: text("descripcion_clinica").notNull(),
  embeddingVector: text("embedding_vector"), // Vector 384 dimensiones
  prioridad: integer("prioridad").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 4. Médicos adscritos a EPS TRIADIX
 */
export const medicos = pgTable("medicos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombres: varchar("nombres", { length: 100 }).notNull(),
  apellidos: varchar("apellidos", { length: 100 }).notNull(),
  registroMedicoRethus: varchar("registro_rethus", { length: 50 }).notNull().unique(),
  sedePrincipalId: varchar("sede_principal_id", { length: 36 })
    .references(() => sedesIps.id)
    .notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 5. Relación Médico - Especialidades (N:M)
 */
export const medicoEspecialidad = pgTable(
  "medico_especialidad",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    medicoId: varchar("medico_id", { length: 36 })
      .references(() => medicos.id)
      .notNull(),
    especialidadId: varchar("especialidad_id", { length: 36 })
      .references(() => especialidades.id)
      .notNull(),
    esPrincipal: boolean("es_principal").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_medico_especialidad").on(table.medicoId, table.especialidadId),
  ]
);

/**
 * 6. Afiliados (Pacientes) - Cumplimiento Ley 1581 de 2012 / Decreto 1377
 */
export const afiliados = pgTable(
  "afiliados",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tipoDocumento: varchar("tipo_documento", { length: 10 }).notNull(), // CC, TI, RC, CE, PA
    numeroDocumento: varchar("numero_documento", { length: 20 }), // Documento en texto plano para login
    numeroDocumentoHash: varchar("numero_documento_hash", { length: 64 }).notNull().unique(),
    numeroDocumentoEnc: text("numero_documento_enc").notNull(),
    passwordHash: varchar("password_hash", { length: 128 }), // Clave para acceso a la plataforma
    nombresEnc: text("nombres_enc").notNull(),
    apellidosEnc: text("apellidos_enc").notNull(),
    telefonoEnc: text("telefono_enc").notNull(),
    emailEnc: text("email_enc"),
    fechaNacimiento: date("fecha_nacimiento").notNull(),
    genero: varchar("genero", { length: 20 }).notNull(),
    regimen: varchar("regimen", { length: 20 }).notNull(), // CONTRIBUTIVO | SUBSIDIADO
    tipoCotizante: varchar("tipo_cotizante", { length: 30 }).notNull(), // COTIZANTE | BENEFICIARIO
    categoria: varchar("categoria", { length: 10 }).notNull(), // A | B | C
    estadoAfiliacion: varchar("estado_afiliacion", { length: 30 }).default("ACTIVO").notNull(), // ACTIVO | SUSPENDIDO | RETIRADO
    ipsPrimariaId: varchar("ips_primaria_id", { length: 36 }).references(() => sedesIps.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_afiliado_doc_hash").on(table.numeroDocumentoHash),
  ]
);

/**
 * 7. Agendas y Franjas de Disponibilidad Médica
 * Contiene índice único para garantizar matemáticamente CERO sobrecupo (Zero Overbooking)
 */
export const agendas = pgTable(
  "agendas",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    medicoId: varchar("medico_id", { length: 36 })
      .references(() => medicos.id)
      .notNull(),
    especialidadId: varchar("especialidad_id", { length: 36 })
      .references(() => especialidades.id)
      .notNull(),
    sedeId: varchar("sede_id", { length: 36 })
      .references(() => sedesIps.id)
      .notNull(),
    fecha: date("fecha").notNull(),
    horaInicio: time("hora_inicio").notNull(),
    horaFin: time("hora_fin").notNull(),
    jornada: varchar("jornada", { length: 20 }).notNull(), // manana | tarde
    estado: varchar("estado", { length: 20 }).default("disponible").notNull(), // disponible | reservada | bloqueada
    versionConcurrencia: integer("version_concurrencia").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_medico_franja_unica").on(table.medicoId, table.fecha, table.horaInicio),
    index("idx_agendas_busqueda").on(table.especialidadId, table.sedeId, table.fecha, table.estado),
  ]
);

/**
 * 8. Autorizaciones / Remisiones médicas vigentes para especialistas
 */
export const autorizaciones = pgTable("autorizaciones", {
  id: varchar("id", { length: 36 }).primaryKey(),
  numeroAutorizacionMipres: varchar("numero_mipres", { length: 50 }).notNull().unique(),
  afiliadoId: varchar("afiliado_id", { length: 36 })
    .references(() => afiliados.id)
    .notNull(),
  especialidadId: varchar("especialidad_id", { length: 36 })
    .references(() => especialidades.id)
    .notNull(),
  fechaExpedicion: date("fecha_expedicion").notNull(),
  fechaVencimiento: date("fecha_vencimiento").notNull(),
  consultasAutorizadas: integer("consultas_autorizadas").default(1).notNull(),
  consultasConsumidas: integer("consultas_consumidas").default(0).notNull(),
  activa: boolean("activa").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * 9. Citas médicas agendadas
 */
export const citas = pgTable(
  "citas",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    codigoCita: varchar("codigo_cita", { length: 30 }).notNull().unique(), // CTX-2026-XXXXX
    afiliadoId: varchar("afiliado_id", { length: 36 })
      .references(() => afiliados.id)
      .notNull(),
    medicoId: varchar("medico_id", { length: 36 })
      .references(() => medicos.id)
      .notNull(),
    especialidadId: varchar("especialidad_id", { length: 36 })
      .references(() => especialidades.id)
      .notNull(),
    sedeId: varchar("sede_id", { length: 36 })
      .references(() => sedesIps.id)
      .notNull(),
    agendaId: varchar("agenda_id", { length: 36 })
      .references(() => agendas.id)
      .notNull().unique(), // Un slot solo puede tener UNA cita asociada
    autorizacionId: varchar("autorizacion_id", { length: 36 }).references(() => autorizaciones.id),
    fechaCita: date("fecha_cita").notNull(),
    horaInicio: time("hora_inicio").notNull(),
    horaFin: time("hora_fin").notNull(),
    tipoCita: varchar("tipo_cita", { length: 50 }).default("medicina_general").notNull(),
    motivoConsultaEnc: text("motivo_consulta_enc"),
    canal: varchar("canal", { length: 20 }).default("voz").notNull(), // voz | web
    estado: varchar("estado", { length: 30 }).default("programada").notNull(), // programada | confirmada | cancelada | reprogramada | cumplida | inasistida
    motivoCancelacion: text("motivo_cancelacion"),
    comprobantePdfUrl: text("comprobante_pdf_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_citas_afiliado").on(table.afiliadoId, table.estado),
  ]
);

/**
 * 10. Consentimientos de Habeas Data (Ley 1581 / Dcto 1377)
 */
export const consentimientos = pgTable("consentimientos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  afiliadoId: varchar("afiliado_id", { length: 36 })
    .references(() => afiliados.id)
    .notNull(),
  canal: varchar("canal", { length: 20 }).notNull(), // voz | web
  acepto: boolean("acepto").notNull(),
  versionPolitica: varchar("version_politica", { length: 20 }).default("v1.0-2026").notNull(),
  ipOrigen: varchar("ip_origen", { length: 45 }).default("127.0.0.1").notNull(),
  textoConsentimiento: text("texto_consentimiento").notNull(),
  fechaConsentimiento: timestamp("fecha_consentimiento").defaultNow().notNull(),
  revocado: boolean("revocado").default(false).notNull(),
});

/**
 * 11. Auditoría del sistema (sin datos de salud en texto plano)
 */
export const auditoria = pgTable("auditoria", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accion: varchar("accion", { length: 100 }).notNull(),
  entidad: varchar("entidad", { length: 50 }).notNull(),
  entidadId: varchar("entidad_id", { length: 36 }).notNull(),
  usuarioOrigen: varchar("usuario_origen", { length: 100 }).default("asistente_voz").notNull(),
  ip: varchar("ip", { length: 45 }).default("127.0.0.1").notNull(),
  detallesHash: varchar("detalles_hash", { length: 64 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

/**
 * 12. Sesiones conversacionales y memoria del agente de voz
 */
export const sesionesConversacion = pgTable("sesiones_conversacion", {
  id: varchar("id", { length: 36 }).primaryKey(),
  afiliadoId: varchar("afiliado_id", { length: 36 }).references(() => afiliados.id),
  canal: varchar("canal", { length: 20 }).default("voz").notNull(),
  estadoConversacion: varchar("estado_conversacion", { length: 50 }).default("iniciada").notNull(),
  contextoJson: text("contexto_json"), // Memoria y entidades detectadas
  ultimoTurnoTimestamp: timestamp("ultimo_turno_timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
