import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  date,
  time,
} from "drizzle-orm/pg-core";

/**
 * Sedes de atención presencial de EPS TRIADIX en Cali
 */
export const sedes = pgTable("sedes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  direccion: varchar("direccion", { length: 255 }).notNull(),
  barrio: varchar("barrio", { length: 100 }).notNull(),
  ciudad: varchar("ciudad", { length: 50 }).default("Cali").notNull(),
  telefono: varchar("telefono", { length: 50 }).notNull(),
  horarioApertura: time("horario_apertura").default("06:00:00").notNull(),
  horarioCierre: time("horario_cierre").default("19:00:00").notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Especialidades médicas ofrecidas por EPS TRIADIX
 */
export const especialidades = pgTable("especialidades", {
  id: varchar("id", { length: 36 }).primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion").notNull(),
  duracionMinutos: integer("duracion_minutos").default(30).notNull(),
  requiereRemision: boolean("requiere_remision").default(false).notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Médicos adscritos a EPS TRIADIX en Cali
 */
export const medicos = pgTable("medicos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nombres: varchar("nombres", { length: 100 }).notNull(),
  apellidos: varchar("apellidos", { length: 100 }).notNull(),
  registroMedico: varchar("registro_medico", { length: 50 }).notNull().unique(),
  especialidadId: varchar("especialidad_id", { length: 36 })
    .references(() => especialidades.id)
    .notNull(),
  sedeId: varchar("sede_id", { length: 36 })
    .references(() => sedes.id)
    .notNull(),
  email: varchar("email", { length: 150 }).notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Pacientes (Ley 1581 / Habeas Data):
 * - numeroDocumentoHash: HMAC-SHA256 para búsqueda exacta sin exponer el documento plano
 * - Datos sensibles personales (cédula, nombres, teléfono, etc.) se almacenan cifrados con AES-256-GCM
 */
export const pacientes = pgTable("pacientes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tipoDocumento: varchar("tipo_documento", { length: 10 }).notNull(), // CC, TI, CE, PA
  numeroDocumentoHash: varchar("numero_documento_hash", { length: 64 }).notNull().unique(),
  numeroDocumentoEnc: text("numero_documento_enc").notNull(),
  nombresEnc: text("nombres_enc").notNull(),
  apellidosEnc: text("apellidos_enc").notNull(),
  telefonoEnc: text("telefono_enc").notNull(),
  emailEnc: text("email_enc"),
  fechaNacimiento: date("fecha_nacimiento").notNull(),
  genero: varchar("genero", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Registro explícito e inviolable de Consentimiento Informado (Ley 1581 de 2012 / Decreto 1377 de 2013)
 */
export const consentimientosHabeasData = pgTable("consentimientos_habeas_data", {
  id: varchar("id", { length: 36 }).primaryKey(),
  pacienteId: varchar("paciente_id", { length: 36 })
    .references(() => pacientes.id)
    .notNull(),
  canal: varchar("canal", { length: 20 }).notNull(), // "voz" | "web"
  acepto: boolean("acepto").notNull(),
  versionPolitica: varchar("version_politica", { length: 20 }).default("v1.0-2026").notNull(),
  ipOrigen: varchar("ip_origen", { length: 45 }).default("127.0.0.1").notNull(),
  textoConsentimiento: text("texto_consentimiento").notNull(),
  fechaConsentimiento: timestamp("fecha_consentimiento").defaultNow().notNull(),
  revocado: boolean("revocado").default(false).notNull(),
});

/**
 * Disponibilidad y franjas horarias de citas médicas
 */
export const disponibilidadMedica = pgTable("disponibilidad_medica", {
  id: varchar("id", { length: 36 }).primaryKey(),
  medicoId: varchar("medico_id", { length: 36 })
    .references(() => medicos.id)
    .notNull(),
  sedeId: varchar("sede_id", { length: 36 })
    .references(() => sedes.id)
    .notNull(),
  fecha: date("fecha").notNull(),
  horaInicio: time("hora_inicio").notNull(),
  horaFin: time("hora_fin").notNull(),
  estado: varchar("estado", { length: 20 }).default("disponible").notNull(), // disponible, reservada, cancelada
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Citas agendadas por los afiliados en EPS TRIADIX
 */
export const citas = pgTable("citas", {
  id: varchar("id", { length: 36 }).primaryKey(),
  codigoCita: varchar("codigo_cita", { length: 30 }).notNull().unique(), // CTX-2026-XXXXX
  pacienteId: varchar("paciente_id", { length: 36 })
    .references(() => pacientes.id)
    .notNull(),
  medicoId: varchar("medico_id", { length: 36 })
    .references(() => medicos.id)
    .notNull(),
  sedeId: varchar("sede_id", { length: 36 })
    .references(() => sedes.id)
    .notNull(),
  disponibilidadId: varchar("disponibilidad_id", { length: 36 })
    .references(() => disponibilidadMedica.id)
    .notNull(),
  fechaCita: date("fecha_cita").notNull(),
  horaInicio: time("hora_inicio").notNull(),
  horaFin: time("hora_fin").notNull(),
  motivoConsultaEnc: text("motivo_consulta_enc"),
  canal: varchar("canal", { length: 20 }).default("voz").notNull(), // "voz" | "web"
  estado: varchar("estado", { length: 20 }).default("agendada").notNull(), // agendada, confirmada, cancelada, completada
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Logs de auditoría sin datos clínicos en texto plano
 */
export const logsAuditoria = pgTable("logs_auditoria", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accion: varchar("accion", { length: 100 }).notNull(),
  entidad: varchar("entidad", { length: 50 }).notNull(),
  entidadId: varchar("entidad_id", { length: 36 }).notNull(),
  usuarioOrigen: varchar("usuario_origen", { length: 100 }).default("asistente_voz").notNull(),
  ip: varchar("ip", { length: 45 }).default("127.0.0.1").notNull(),
  detallesHash: varchar("detalles_hash", { length: 64 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

