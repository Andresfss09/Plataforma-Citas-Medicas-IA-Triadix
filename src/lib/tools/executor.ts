import { getDb } from "../../db";
import * as schema from "../../db/schema";
import { eq, and } from "drizzle-orm";
import {
  buscarEspecialidadPorMotivo,
  buscarDisponibilidad,
  reservarCita,
  cancelarCita,
  reprogramarCita,
} from "../../services/citas.service";
import { hashSearchableField, decryptSensitiveData } from "../crypto";
import { evaluateMedicalTriage } from "../triage";
import {
  verificarAfiliadoSchema,
  buscarEspecialidadSchema,
  consultarDisponibilidadSchema,
  agendarCitaSchema,
  consultarMisCitasSchema,
  reprogramarCitaSchema,
  cancelarCitaSchema,
  generarComprobantePdfSchema,
  escalarAHumanoSchema,
  reportarUrgenciaSchema,
} from "./definitions";
import crypto from "crypto";

export interface ToolExecutionResponse {
  tool: string;
  exito: boolean;
  data?: any;
  error?: string;
  auditId: string;
}

/**
 * Ejecutor central de Tools con validación Zod, reglas de negocio y auditoría criptográfica
 */
export async function executeTool(
  toolName: string,
  params: unknown,
  context: { ip?: string; sessionAfiliadoId?: string } = {}
): Promise<ToolExecutionResponse> {
  const db = getDb();
  const auditId = crypto.randomUUID();
  const ipOrigen = context.ip || "127.0.0.1";

  try {
    let resultData: any = null;

    switch (toolName) {
      // 1. verificar_afiliado
      case "verificar_afiliado": {
        const input = verificarAfiliadoSchema.parse(params);
        const docHash = hashSearchableField(input.numeroDocumento);
        const [afiliado] = await db
          .select()
          .from(schema.afiliados)
          .where(eq(schema.afiliados.numeroDocumentoHash, docHash));

        if (!afiliado) {
          resultData = {
            encontrado: false,
            mensaje: "El documento no figura en la base de afiliados de EPS TRIADIX.",
          };
        } else {
          const nombres = decryptSensitiveData(afiliado.nombresEnc);
          const apellidos = decryptSensitiveData(afiliado.apellidosEnc);
          resultData = {
            encontrado: true,
            afiliadoId: afiliado.id,
            nombreCompleto: `${nombres} ${apellidos}`,
            tipoDocumento: afiliado.tipoDocumento,
            regimen: afiliado.regimen,
            categoria: afiliado.categoria,
            estadoAfiliacion: afiliado.estadoAfiliacion,
            activoParaAgendar: afiliado.estadoAfiliacion === "ACTIVO",
          };
        }
        break;
      }

      // 2. buscar_especialidad_por_motivo
      case "buscar_especialidad_por_motivo": {
        const input = buscarEspecialidadSchema.parse(params);
        // Primero evaluar si el motivo es una emergencia vital
        const triage = evaluateMedicalTriage(input.motivoConsulta);
        if (triage.isEmergency) {
          resultData = {
            esEmergenciaVital: true,
            alerta: triage.protocolMessage,
            lineaEmergencia: "123",
            especialidadesRecomendadas: [],
          };
        } else {
          const especialidades = await buscarEspecialidadPorMotivo(input.motivoConsulta);
          resultData = {
            esEmergenciaVital: false,
            especialidadesRecomendadas: especialidades.slice(0, 3),
          };
        }
        break;
      }

      // 3. consultar_disponibilidad
      case "consultar_disponibilidad": {
        const input = consultarDisponibilidadSchema.parse(params);
        const slots = await buscarDisponibilidad({
          especialidadId: input.especialidadId,
          sedeId: input.sedeId,
          jornada: input.jornada,
          desde: input.desde,
          hasta: input.hasta,
          limite: 6,
        });
        resultData = {
          totalDisponibles: slots.length,
          franjas: slots,
        };
        break;
      }

      // 4. agendar_cita
      case "agendar_cita": {
        const input = agendarCitaSchema.parse(params);
        // Validar si requiere remisión previa
        const [agendaSlot] = await db
          .select()
          .from(schema.agendas)
          .where(eq(schema.agendas.id, input.slotId));

        if (agendaSlot) {
          const [esp] = await db
            .select()
            .from(schema.especialidades)
            .where(eq(schema.especialidades.id, agendaSlot.especialidadId));

          if (esp && esp.requiereAutorizacionPrevia) {
            // Verificar si el afiliado tiene orden médica vigente
            const [orden] = await db
              .select()
              .from(schema.autorizaciones)
              .where(
                and(
                  eq(schema.autorizaciones.afiliadoId, input.afiliadoId),
                  eq(schema.autorizaciones.especialidadId, esp.id),
                  eq(schema.autorizaciones.activa, true)
                )
              );

            if (!orden) {
              return {
                tool: toolName,
                exito: false,
                error: `La especialidad de ${esp.nombre} requiere una autorización médica previa emitida por su médico general. No registramos orden vigente.`,
                auditId,
              };
            }
          }
        }

        const reserva = await reservarCita({
          afiliadoId: input.afiliadoId,
          slotId: input.slotId,
          motivoConsulta: input.motivoConsulta,
          canal: input.canal,
        });

        if (!reserva.exito) {
          return {
            tool: toolName,
            exito: false,
            error: reserva.mensaje,
            auditId,
          };
        }
        resultData = reserva;
        break;
      }

      // 5. consultar_mis_citas
      case "consultar_mis_citas": {
        const input = consultarMisCitasSchema.parse(params);

        // Control de acceso multitenant: validar que no se acceda a datos de otro afiliado
        if (context.sessionAfiliadoId && context.sessionAfiliadoId !== input.afiliadoId) {
          return {
            tool: toolName,
            exito: false,
            error: "Acceso no autorizado: No tiene permisos para consultar información de otro afiliado.",
            auditId,
          };
        }

        const misCitas = await db
          .select({
            citaId: schema.citas.id,
            codigoCita: schema.citas.codigoCita,
            fechaCita: schema.citas.fechaCita,
            horaInicio: schema.citas.horaInicio,
            horaFin: schema.citas.horaFin,
            estado: schema.citas.estado,
            especialidad: schema.especialidades.nombre,
            sede: schema.sedesIps.nombre,
            direccion: schema.sedesIps.direccion,
            medico: schema.medicos.nombres,
          })
          .from(schema.citas)
          .innerJoin(schema.especialidades, eq(schema.citas.especialidadId, schema.especialidades.id))
          .innerJoin(schema.sedesIps, eq(schema.citas.sedeId, schema.sedesIps.id))
          .innerJoin(schema.medicos, eq(schema.citas.medicoId, schema.medicos.id))
          .where(
            and(
              eq(schema.citas.afiliadoId, input.afiliadoId),
              eq(schema.citas.estado, "programada")
            )
          );

        resultData = {
          totalCitasActivas: misCitas.length,
          citas: misCitas,
        };
        break;
      }

      // 6. reprogramar_cita
      case "reprogramar_cita": {
        const input = reprogramarCitaSchema.parse(params);
        const reprog = await reprogramarCita(input);
        if (!reprog.exito) {
          return { tool: toolName, exito: false, error: reprog.mensaje, auditId };
        }
        resultData = reprog;
        break;
      }

      // 7. cancelar_cita
      case "cancelar_cita": {
        const input = cancelarCitaSchema.parse(params);
        const cancel = await cancelarCita(input);
        if (!cancel.exito) {
          return { tool: toolName, exito: false, error: cancel.mensaje, auditId };
        }
        resultData = cancel;
        break;
      }

      // 8. generar_comprobante_pdf
      case "generar_comprobante_pdf": {
        const input = generarComprobantePdfSchema.parse(params);
        const [cita] = await db
          .select({
            codigoCita: schema.citas.codigoCita,
            fechaCita: schema.citas.fechaCita,
            horaInicio: schema.citas.horaInicio,
            sedeNombre: schema.sedesIps.nombre,
            sedeDireccion: schema.sedesIps.direccion,
            especialidad: schema.especialidades.nombre,
            medico: schema.medicos.nombres,
          })
          .from(schema.citas)
          .innerJoin(schema.sedesIps, eq(schema.citas.sedeId, schema.sedesIps.id))
          .innerJoin(schema.especialidades, eq(schema.citas.especialidadId, schema.especialidades.id))
          .innerJoin(schema.medicos, eq(schema.citas.medicoId, schema.medicos.id))
          .where(eq(schema.citas.id, input.citaId));

        if (!cita) {
          return { tool: toolName, exito: false, error: "Cita no encontrada para generar comprobante.", auditId };
        }

        resultData = {
          comprobanteUrl: `/api/comprobantes/${cita.codigoCita}.pdf`,
          codigoCita: cita.codigoCita,
          fecha: cita.fechaCita,
          hora: cita.horaInicio,
          sede: cita.sedeNombre,
          direccion: cita.sedeDireccion,
          recomendaciones: [
            "Presentarse 20 minutos antes de la hora señalada.",
            "Llevar documento de identidad original.",
            "Si la cita requiere ayuno (laboratorio), no ingerir alimentos 8 horas antes.",
          ],
        };
        break;
      }

      // 9. escalar_a_humano
      case "escalar_a_humano": {
        const input = escalarAHumanoSchema.parse(params);
        resultData = {
          escalado: true,
          mensaje: "Se ha transferido la sesión a la mesa de soporte humano de EPS TRIADIX en Cali.",
          lineaTelefonica: "(602) 489-8000 opción 1",
          motivoRegistrado: input.motivoEscalamiento,
        };
        break;
      }

      // 10. reportar_urgencia
      case "reportar_urgencia": {
        const input = reportarUrgenciaSchema.parse(params);
        const triage = evaluateMedicalTriage(input.sintomaCritico);
        resultData = {
          protocoloEmergenciaActivado: true,
          lineaDirecta: "123",
          mensajeVoz: triage.protocolMessage || "Por favor llame de inmediato a la Línea 123 en Cali o acuda al servicio de urgencias.",
          hospitalesRecomendados: [
            "EPS TRIADIX Clínica Tequendama (Calle 5 # 42-25)",
            "Hospital Universitario del Valle (HUV)",
          ],
        };
        break;
      }

      default:
        return {
          tool: toolName,
          exito: false,
          error: `Herramienta desconocida: '${toolName}'`,
          auditId,
        };
    }

    // Registrar en auditoría (sin datos clínicos sensibles en texto plano)
    await db.insert(schema.auditoria).values({
      id: auditId,
      accion: `TOOL_EXECUTION_${toolName.toUpperCase()}`,
      entidad: "tools",
      entidadId: toolName,
      usuarioOrigen: context.sessionAfiliadoId || "agente_voz",
      ip: ipOrigen,
      detallesHash: hashSearchableField(`${toolName}_exito`),
    });

    return {
      tool: toolName,
      exito: true,
      data: resultData,
      auditId,
    };
  } catch (error: any) {
    // Registrar error en auditoría
    await db.insert(schema.auditoria).values({
      id: auditId,
      accion: `TOOL_EXECUTION_ERROR_${toolName.toUpperCase()}`,
      entidad: "tools",
      entidadId: toolName,
      usuarioOrigen: context.sessionAfiliadoId || "agente_voz",
      ip: ipOrigen,
      detallesHash: hashSearchableField(error.message || "Error"),
    });

    return {
      tool: toolName,
      exito: false,
      error: error.message || "Error interno al ejecutar la herramienta",
      auditId,
    };
  }
}

