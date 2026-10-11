import { getDb } from "../../db";
import * as schema from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { decryptSensitiveData, hashSearchableField } from "../crypto";
import { formatearFechaColombiana, formatearHora12 } from "../pdf/comprobante";

export interface RecordatorioNotificacion {
  citaId: string;
  codigoCita: string;
  tipoRecordatorio: "24_HORAS" | "2_HORAS";
  afiliadoNombre: string;
  telefono: string;
  especialidad: string;
  fechaCol: string;
  horaCol: string;
  sedeNombre: string;
  sedeDireccion: string;
}

export interface CanalNotificador {
  canal: string;
  enviarRecordatorio(notificacion: RecordatorioNotificacion): Promise<boolean>;
}

/**
 * Adaptador de notificación en consola / desarrollo
 */
export class ConsoleNotifier implements CanalNotificador {
  public canal = "consola";

  async enviarRecordatorio(notif: RecordatorioNotificacion): Promise<boolean> {
    console.log(`\n🔔 [RECORDATORIO EPS TRIADIX - ${notif.tipoRecordatorio}]`);
    console.log(`   Para: ${notif.afiliadoNombre} (Tel: ${notif.telefono})`);
    console.log(`   Cita de ${notif.especialidad} en ${notif.sedeNombre} (${notif.sedeDireccion})`);
    console.log(`   Horario: ${notif.fechaCol} a las ${notif.horaCol} • Radicado: ${notif.codigoCita}`);
    console.log(`   Indicación: Llegar 20 min antes con documento original.`);
    return true;
  }
}

/**
 * Adaptador de notificación por correo electrónico
 */
export class EmailNotifier implements CanalNotificador {
  public canal = "email";

  async enviarRecordatorio(notif: RecordatorioNotificacion): Promise<boolean> {
    // Interfaz para envío real mediante Resend / SendGrid / SMTP
    console.log(`📧 [EMAIL RECORDATORIO ENVIADO] A ${notif.afiliadoNombre} para cita ${notif.codigoCita}`);
    return true;
  }
}

/**
 * Servicio centralizado de escaneo y envío de recordatorios
 */
export class ReminderService {
  private notificadores: CanalNotificador[];

  constructor(notificadores?: CanalNotificador[]) {
    this.notificadores = notificadores || [new ConsoleNotifier(), new EmailNotifier()];
  }

  /**
   * Ejecuta el escaneo de citas próximas y envía los recordatorios
   */
  public async ejecutarEscaneoRecordatorios(): Promise<{ recordatoriosEnviados: number }> {
    const db = getDb();
    let totalEnviados = 0;

    // Obtener citas activas
    const citasActivas = await db
      .select({
        citaId: schema.citas.id,
        codigoCita: schema.citas.codigoCita,
        fechaCita: schema.citas.fechaCita,
        horaInicio: schema.citas.horaInicio,
        afiliadoNombres: schema.afiliados.nombresEnc,
        afiliadoApellidos: schema.afiliados.apellidosEnc,
        afiliadoTel: schema.afiliados.telefonoEnc,
        especialidad: schema.especialidades.nombre,
        sedeNombre: schema.sedesIps.nombre,
        sedeDireccion: schema.sedesIps.direccion,
      })
      .from(schema.citas)
      .innerJoin(schema.afiliados, eq(schema.citas.afiliadoId, schema.afiliados.id))
      .innerJoin(schema.especialidades, eq(schema.citas.especialidadId, schema.especialidades.id))
      .innerJoin(schema.sedesIps, eq(schema.citas.sedeId, schema.sedesIps.id))
      .where(eq(schema.citas.estado, "programada"))
      .limit(10);

    for (const c of citasActivas) {
      const notificacion: RecordatorioNotificacion = {
        citaId: c.citaId,
        codigoCita: c.codigoCita,
        tipoRecordatorio: "24_HORAS",
        afiliadoNombre: `${decryptSensitiveData(c.afiliadoNombres)} ${decryptSensitiveData(c.afiliadoApellidos)}`,
        telefono: decryptSensitiveData(c.afiliadoTel),
        especialidad: c.especialidad,
        fechaCol: formatearFechaColombiana(c.fechaCita),
        horaCol: formatearHora12(c.horaInicio),
        sedeNombre: c.sedeNombre,
        sedeDireccion: c.sedeDireccion,
      };

      for (const notifier of this.notificadores) {
        await notifier.enviarRecordatorio(notificacion);
      }

      // Registro de auditoría
      await db.insert(schema.auditoria).values({
        id: crypto.randomUUID(),
        accion: "ENVIO_RECORDATORIO_CITA",
        entidad: "citas",
        entidadId: c.citaId,
        usuarioOrigen: "sistema_recordatorios",
        ip: "127.0.0.1",
        detallesHash: hashSearchableField(`Notificacion 24h: ${c.codigoCita}`),
      });

      totalEnviados++;
    }

    return { recordatoriosEnviados: totalEnviados };
  }
}

export const reminderService = new ReminderService();

