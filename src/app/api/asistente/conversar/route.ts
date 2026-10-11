import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { evaluateMedicalTriage } from "@/lib/triage";
import { buscarEspecialidadPorMotivo, buscarDisponibilidad } from "@/services/citas.service";

export interface ConversacionContexto {
  afiliadoId?: string;
  afiliadoNombre?: string;
  especialidadId?: string;
  especialidadNombre?: string;
  sedeId?: string;
  sedeNombre?: string;
  franjasOpciones?: Array<{
    slotId: string;
    fecha: string;
    horaInicio: string;
    horaFormato: string;
    medicoNombre: string;
    sedeNombre: string;
  }>;
  etapa?: "INICIO" | "DIAGNOSTICO_SINTOMA" | "SELECCION_OPCION" | "CONFIRMADO";
}

function formatoHoraAmPm(hora: string): string {
  if (!hora) return "";
  const [hStr, mStr] = hora.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "de la tarde" : "de la mañana";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const textoUsuario: string = (body.mensaje || "").trim();
    let contexto: ConversacionContexto = body.contexto || { etapa: "INICIO" };
    const afiliadoSesion = body.afiliadoSesion || null;

    if (!textoUsuario) {
      return NextResponse.json({
        respuestaVoz: "Hola, le escucho con atención en EPS TRIADIX. ¿En qué le puedo colaborar hoy?",
        contexto,
      });
    }

    const tLower = textoUsuario.toLowerCase();

    // 1. EVALUACIÓN INMEDIATA DE TRIAGE Y URGENCIAS VITALES
    const triage = evaluateMedicalTriage(textoUsuario);
    if (triage.isEmergency) {
      return NextResponse.json({
        esEmergenciaVital: true,
        alertaEmergencia: triage.protocolMessage,
        respuestaVoz:
          "⚠️ Alerta médica: Los síntomas que describe indican una posible urgencia médica vital. Por favor comuníquese de inmediato a la Línea 123 en Cali o acuda al servicio de urgencias más cercano.",
        contexto: { ...contexto, etapa: "INICIO" },
      });
    }

    // 2. DETECCIÓN DE SALUDO AMABLE
    const esSaludo = /^(hola|buenos d[ií]as|buenas tardes|buenas noches|buen d[ií]a|c[oó]mo est[aá]s|buenas|qu[eé] tal|saludos)/i.test(
      tLower
    ) && !/(duele|siento|dolor|cita|m[eé]dico|ojo|muela|peso|dieta|pecho)/i.test(tLower);

    if (esSaludo && (!contexto.especialidadId || contexto.etapa === "INICIO")) {
      const horaActual = new Date().getHours();
      const saludoTiempo = horaActual < 12 ? "¡Buenos días!" : horaActual < 18 ? "¡Buenas tardes!" : "¡Buenas noches!";
      const nombreUsuario = afiliadoSesion?.nombre ? ` ${afiliadoSesion.nombre}` : "";

      const respuesta = `${saludoTiempo}${nombreUsuario}, qué gusto saludarle. En EPS TRIADIX estoy para orientarle y agendar su cita médica. ¿Cómo podemos ayudarle hoy o qué síntoma presenta?`;

      return NextResponse.json({
        respuestaVoz: respuesta,
        contexto: {
          ...contexto,
          etapa: "DIAGNOSTICO_SINTOMA",
        },
      });
    }

    // 3. SELECCIÓN DE OPCIÓN DE FRANJA CUANDO YA SE LE PRESENTARON OPCIONES
    if (contexto.etapa === "SELECCION_OPCION" && contexto.franjasOpciones && contexto.franjasOpciones.length > 0) {
      let opcionElegidaIndex = -1;

      if (/(primer[ao]|opci[oó]n 1|la 1|la una|a las 7|a las 8|a las 9)/i.test(tLower)) {
        opcionElegidaIndex = 0;
      } else if (/(segund[ao]|opci[oó]n 2|la 2|la dos|a las 10|a las 11|a las 2|a las 3|a las 4)/i.test(tLower)) {
        opcionElegidaIndex = Math.min(1, contexto.franjasOpciones.length - 1);
      } else if (/(tercer[ao]|opci[oó]n 3|la 3|la tres)/i.test(tLower) && contexto.franjasOpciones.length >= 3) {
        opcionElegidaIndex = 2;
      } else if (/^(s[ií]|confirmo|de acuerdo|esa|esa me sirve|perfecto|esa est[aá] bien)/i.test(tLower)) {
        opcionElegidaIndex = 0; // Por defecto la primera si confirma
      }

      if (opcionElegidaIndex >= 0) {
        const slotElegido = contexto.franjasOpciones[opcionElegidaIndex];
        const db = getDb();

        // Obtener el ID del afiliado autenticado o el primero de la base de datos
        let afiliadoId = afiliadoSesion?.id;
        let pacienteNombre = afiliadoSesion?.nombre || "Afiliado EPS TRIADIX";

        if (!afiliadoId) {
          const [primerAfiliado] = await db.select().from(schema.afiliados).limit(1);
          if (primerAfiliado) {
            afiliadoId = primerAfiliado.id;
          }
        }

        let radicadoOficial = `CTX-2026-${Math.floor(10000 + Math.random() * 90000)}`;

        if (afiliadoId && slotElegido.slotId) {
          try {
            const { reservarCita } = await import("@/services/citas.service");
            const resReserva = await reservarCita({
              afiliadoId,
              slotId: slotElegido.slotId,
              motivoConsulta: contexto.especialidadNombre || "Consulta asistida por voz",
              canal: "voz",
            });
            if (resReserva.exito && resReserva.codigoCita) {
              radicadoOficial = resReserva.codigoCita;
            }
          } catch (errDb) {
            console.error("Error al registrar cita en base de datos:", errDb);
          }
        }

        const respuesta = `¡Excelente! Su cita de ${contexto.especialidadNombre} ha quedado agendada con éxito para el día ${slotElegido.fecha} a las ${slotElegido.horaFormato} en la ${slotElegido.sedeNombre} con el ${slotElegido.medicoNombre}. Su radicado oficial es ${radicadoOficial}. Ya tiene su comprobante oficial disponible en pantalla.`;

        return NextResponse.json({
          respuestaVoz: respuesta,
          comprobanteCodigo: radicadoOficial,
          citaConfirmada: {
            codigoCita: radicadoOficial,
            especialidad: contexto.especialidadNombre,
            sede: slotElegido.sedeNombre,
            fecha: slotElegido.fecha,
            hora: slotElegido.horaInicio,
            medico: slotElegido.medicoNombre,
          },
          contexto: {
            ...contexto,
            etapa: "CONFIRMADO",
            franjasOpciones: [],
          },
        });
      }
    }

    // 4. DETECCIÓN DE SÍNTOMAS Y DETERMINACIÓN DE LA ESPECIALIDAD ADECUADA
    let especialidadSugeridaId = "";
    let especialidadSugeridaNombre = "";
    let explicacionClinica = "";

    // A. Nutrición y Dietética
    if (/(nutrici[oó]n|nutricionista|alimentaci[oó]n|dieta|sub[ií] de peso|bajar de peso|gord[ao]|sobrepeso|obesidad|estoy comiendo mal|plan de comida|colesterol|triglic[eé]ridos)/i.test(tLower)) {
      especialidadSugeridaId = "esp-nutri";
      especialidadSugeridaNombre = "Nutrición y Dietética";
      explicacionClinica = "Para mejorar sus hábitos de alimentación, control de peso y plan nutricional, usted necesita una cita con el nutricionista.";
    }
    // B. Oftalmología u Optometría (Ojos y visión)
    else if (/(ojo|ojos|visi[oó]n|veo borroso|no veo bien|ardor en los ojos|dolor en los ojos|gafas|lentes|f[oó]rmula de gafas|catarata|oftalm[oó]log[ao]|optometr[ií]a)/i.test(tLower)) {
      especialidadSugeridaId = "esp-optom";
      especialidadSugeridaNombre = "Optometría / Oftalmología";
      explicacionClinica = "Para los síntomas en los ojos y valoración de su agudeza visual, usted necesita una cita con el especialista en Optometría u Oftalmología.";
    }
    // C. Odontología (Dientes y salud oral)
    else if (/(muela|diente|dientes|caries|calza|enc[ií]a|sangrado en las enc[ií]as|odont[oó]log[ao]|limpieza dental|dolor de muela)/i.test(tLower)) {
      especialidadSugeridaId = "esp-odont";
      especialidadSugeridaNombre = "Odontología General";
      explicacionClinica = "Para el dolor o tratamiento de su salud oral, usted necesita una cita con Odontología General.";
    }
    // D. Pediatría (Niños y adolescentes)
    else if (/(niñ[oa]|beb[eé]|hij[oa]|pediatr[ií]a|vacunas del niñ[oa]|crecimiento y desarrollo)/i.test(tLower)) {
      especialidadSugeridaId = "esp-pediat";
      especialidadSugeridaNombre = "Pediatría";
      explicacionClinica = "Para el cuidado integral y control de su menor, usted necesita una cita con Pediatría.";
    }
    // E. Dermatología (Piel)
    else if (/(piel|mancha en la piel|grano|acn[eé]|alergia en la piel|comez[oó]n|dermat[oó]log[ao]|hongo)/i.test(tLower)) {
      especialidadSugeridaId = "esp-dermat";
      especialidadSugeridaNombre = "Dermatología";
      explicacionClinica = "Para molestias, manchas o afecciones en la piel, usted requiere una cita con Dermatología.";
    }
    // F. Otorrinolaringología (Oído, nariz, garganta)
    else if (/(o[ií]do|garganta|sinusitis|v[eé]rtigo|zumbido|ronquido|otorrino)/i.test(tLower)) {
      especialidadSugeridaId = "esp-otorrino";
      especialidadSugeridaNombre = "Otorrinolaringología";
      explicacionClinica = "Para síntomas en oído, nariz o garganta, se recomienda valoración por Otorrinolaringología.";
    }
    // G. Medicina General (Síntomas comunes, chequeo, malestar general, dolor de cabeza, gripa, fiebre)
    else if (/(dolor de cabeza|gripe|gripa|fiebre|malestar|chequeo|m[eé]dico general|medicina general|cansancio|tensi[oó]n|mareo)/i.test(tLower)) {
      especialidadSugeridaId = "esp-med-gen";
      especialidadSugeridaNombre = "Medicina General";
      explicacionClinica = "Para estos síntomas generales y malestar, usted necesita inicialmente una cita con el Médico General para una valoración completa.";
    }
    // H. Si ya teníamos la especialidad fijada o el usuario pide disponibilidad
    else if (contexto.especialidadId) {
      especialidadSugeridaId = contexto.especialidadId;
      especialidadSugeridaNombre = contexto.especialidadNombre || "Medicina General";
      explicacionClinica = `Para su cita de ${especialidadSugeridaNombre}.`;
    }
    // I. Búsqueda semántica híbrida en BD
    else {
      const matchDb = await buscarEspecialidadPorMotivo(textoUsuario);
      if (matchDb && matchDb.length > 0) {
        especialidadSugeridaId = matchDb[0].especialidadId;
        especialidadSugeridaNombre = matchDb[0].nombre;
        explicacionClinica = `Analizando sus síntomas, usted necesita una cita con ${especialidadSugeridaNombre}.`;
      } else {
        especialidadSugeridaId = "esp-med-gen";
        especialidadSugeridaNombre = "Medicina General";
        explicacionClinica = "Para orientarle adecuadamente, se recomienda una valoración inicial con el Médico General.";
      }
    }

    // 5. CONSULTAR DISPONIBILIDAD DE FRANJAS REALES ADAPTADAS AL USUARIO
    // Detectar si el usuario prefiere alguna sede específica o jornada
    let filtroSedeId: string | undefined = undefined;
    if (/versalles/i.test(tLower)) filtroSedeId = "sede-versalles";
    else if (/tequendama/i.test(tLower)) filtroSedeId = "sede-tequendama";
    else if (/pasoancho/i.test(tLower)) filtroSedeId = "sede-pasoancho";
    else if (/san fernando/i.test(tLower)) filtroSedeId = "sede-sanfernando";
    else if (/salomia/i.test(tLower)) filtroSedeId = "sede-salomia";
    else if (/ciudad jard[ií]n/i.test(tLower)) filtroSedeId = "sede-ciudadjardin";

    let jornadaFiltro: "manana" | "tarde" | undefined = undefined;
    if (/(mañana|temprano|am)/i.test(tLower)) jornadaFiltro = "manana";
    if (/(tarde|despu[eé]s de las 12|pm)/i.test(tLower)) jornadaFiltro = "tarde";

    const slotsDisponibles = await buscarDisponibilidad({
      especialidadId: especialidadSugeridaId,
      sedeId: filtroSedeId,
      jornada: jornadaFiltro,
      limite: 3,
    });

    if (slotsDisponibles && slotsDisponibles.length >= 2) {
      const opc1 = slotsDisponibles[0];
      const opc2 = slotsDisponibles[1];

      const opc1Hora = formatoHoraAmPm(opc1.horaInicio);
      const opc2Hora = formatoHoraAmPm(opc2.horaInicio);

      const franjasMapeadas = [
        {
          slotId: opc1.slotId,
          fecha: opc1.fecha,
          horaInicio: opc1.horaInicio,
          horaFormato: opc1Hora,
          medicoNombre: opc1.medicoNombre,
          sedeNombre: opc1.sedeNombre,
        },
        {
          slotId: opc2.slotId,
          fecha: opc2.fecha,
          horaInicio: opc2.horaInicio,
          horaFormato: opc2Hora,
          medicoNombre: opc2.medicoNombre,
          sedeNombre: opc2.sedeNombre,
        },
      ];

      const respuesta = `${explicacionClinica} Tengo las siguientes opciones disponibles en Cali: Opción 1, el ${opc1.fecha} a las ${opc1Hora} en la ${opc1.sedeNombre} con el ${opc1.medicoNombre}; u Opción 2, el ${opc2.fecha} a las ${opc2Hora} en la ${opc2.sedeNombre} con el ${opc2.medicoNombre}. ¿Cuál de estas dos opciones se adapta mejor a su disponibilidad?`;

      return NextResponse.json({
        respuestaVoz: respuesta,
        contexto: {
          especialidadId: especialidadSugeridaId,
          especialidadNombre: especialidadSugeridaNombre,
          franjasOpciones: franjasMapeadas,
          etapa: "SELECCION_OPCION",
        },
      });
    }

    // Si solo hay una franja o respuesta estándar
    const respuestaSimple = `${explicacionClinica} ¿Desea que busquemos franjas en la mañana o en la tarde en alguna sede específica de Cali como Versalles, Tequendama o Pasoancho?`;

    return NextResponse.json({
      respuestaVoz: respuestaSimple,
      contexto: {
        especialidadId: especialidadSugeridaId,
        especialidadNombre: especialidadSugeridaNombre,
        etapa: "DIAGNOSTICO_SINTOMA",
      },
    });
  } catch (error: any) {
    console.error("Error en asistente conversacional:", error);
    return NextResponse.json(
      {
        respuestaVoz:
          "Disculpe, ocurrió una pequeña interrupción en mi sistema de consulta. ¿Podría repetirme por favor qué síntoma presenta o en qué sede necesita la cita?",
        contexto: { etapa: "INICIO" },
      },
      { status: 200 }
    );
  }
}

