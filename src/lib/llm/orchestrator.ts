import { LLMProvider, ChatMessage } from "./provider";
import { GeminiProvider, MockLLMProvider } from "./adapters";
import { getSystemPrompt } from "./prompts";
import { executeTool } from "../tools/executor";
import { evaluateMedicalTriage } from "../triage";
import { env } from "../env";

export type EstadoConversacion =
  | "INICIO"
  | "IDENTIFICACION"
  | "MOTIVO_SINTOMA"
  | "SELECCION_ESPECIALIDAD"
  | "CONSULTA_DISPONIBILIDAD"
  | "CONFIRMACION_EXPLICITA"
  | "COMPROBANTE_FINAL"
  | "EMERGENCIA_ACTIVADA";

export interface ContextoSesion {
  afiliadoId?: string;
  afiliadoNombre?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  especialidadId?: string;
  especialidadNombre?: string;
  sedeId?: string;
  sedeNombre?: string;
  slotPropuesto?: {
    slotId: string;
    fecha: string;
    horaInicio: string;
    medicoNombre: string;
  };
  citaAgendadaCodigo?: string;
  estado: EstadoConversacion;
  historialTurnos: ChatMessage[];
}

export class ConversationalOrchestrator {
  private llm: LLMProvider;

  constructor(customProvider?: LLMProvider) {
    if (customProvider) {
      this.llm = customProvider;
    } else if (env.LLM_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
      this.llm = new GeminiProvider();
    } else {
      this.llm = new MockLLMProvider();
    }
  }

  /**
   * Inicializa un nuevo contexto de sesión
   */
  public crearNuevoContexto(): ContextoSesion {
    return {
      estado: "INICIO",
      historialTurnos: [{ role: "system", content: getSystemPrompt() }],
    };
  }

  /**
   * Procesa un turno del usuario a través de la máquina de estados y bucle agéntico
   */
  public async procesarTurno(
    contexto: ContextoSesion,
    entradaUsuario: string
  ): Promise<{ respuestaVoz: string; contextoActualizado: ContextoSesion; toolEjecutada?: string }> {
    const inputClean = entradaUsuario.trim();

    // 1. GUARDIÁN DETERMINISTA DE TRIAGE: Interrupción inmediata ante banderas rojas
    const triage = evaluateMedicalTriage(inputClean);
    if (triage.isEmergency) {
      contexto.estado = "EMERGENCIA_ACTIVADA";
      await executeTool("reportar_urgencia", { sintomaCritico: inputClean });
      const respuestaEmergencia = "⚠️ Por favor escúcheme: los síntomas que describe indican una posible urgencia médica vital. Llame ya mismo a la Línea de Emergencias 123 en Cali o acuda a la clínica de urgencias más cercana.";
      contexto.historialTurnos.push({ role: "user", content: inputClean });
      contexto.historialTurnos.push({ role: "assistant", content: respuestaEmergencia });
      return {
        respuestaVoz: respuestaEmergencia,
        contextoActualizado: contexto,
        toolEjecutada: "reportar_urgencia",
      };
    }

    // 2. DETECCIÓN DE INTERRUPCIÓN / CANCELACIÓN SOBRE LA MARCHA
    if (/^(espera|cancele|no quiero nada|olvide|detente|cancelar todo)/i.test(inputClean)) {
      contexto.slotPropuesto = undefined;
      contexto.estado = "INICIO";
      const rta = "Entendido, no se preocupe. He detenido el trámite. ¿En qué otra cosa le puedo colaborar?";
      return { respuestaVoz: rta, contextoActualizado: contexto };
    }

    // 2.1 MODO AGENDAMIENTO POR FAMILIAR / ACUDIENTE
    if (/(familiar|mam[aá]|pap[aá]|hijo|hija|esposo|esposa|acudiente)/i.test(inputClean) && !contexto.afiliadoId) {
      const rta = "Con el mayor gusto le colaboro agendando la cita para su familiar. Por favor dígame el número de documento del paciente.";
      contexto.historialTurnos.push({ role: "assistant", content: rta });
      return { respuestaVoz: rta, contextoActualizado: contexto };
    }

    // 3. MÁQUINA DE ESTADOS DETERMINISTA & PROCESAMIENTO
    contexto.historialTurnos.push({ role: "user", content: inputClean });

    // PASO A: IDENTIFICACIÓN DEL AFILIADO (con soporte para dictado fonético dígito a dígito)
    if (!contexto.afiliadoId) {
      // Usar normalizador fonético para cédulas habladas (ej. "uno uno cuatro cuatro...")
      const { normalizarDocumentoHablado } = await import("../normalizers/colombian-speech");
      const docNormalizado = normalizarDocumentoHablado(inputClean);

      if (docNormalizado) {
        const resVerif = await executeTool("verificar_afiliado", { tipoDocumento: "CC", numeroDocumento: docNormalizado });
        if (resVerif.exito && resVerif.data.encontrado) {
          contexto.afiliadoId = resVerif.data.afiliadoId;
          contexto.afiliadoNombre = resVerif.data.nombreCompleto;
          contexto.estado = "MOTIVO_SINTOMA";

          const rta = `¡Qué gusto saludarle, ${contexto.afiliadoNombre}! Cuénteme, ¿para qué especialidad necesita su cita o qué molestia presenta?`;
          contexto.historialTurnos.push({ role: "assistant", content: rta });
          return { respuestaVoz: rta, contextoActualizado: contexto, toolEjecutada: "verificar_afiliado" };
        } else {
          const rta = "No encuentro ese documento en EPS TRIADIX. ¿Podría verificar el número y repetírmelo por favor?";
          return { respuestaVoz: rta, contextoActualizado: contexto };
        }
      } else {
        const rta = "Con el mayor gusto le atiendo en EPS TRIADIX. ¿Podría facilitarme su número de cédula o documento?";
        return { respuestaVoz: rta, contextoActualizado: contexto };
      }
    }

    // PASO B: CONFIRMACIÓN EXPLÍCITA (REGLA DE ORO)
    if (contexto.estado === "CONFIRMACION_EXPLICITA" && contexto.slotPropuesto) {
      if (/^(s[ií]|claro|de acuerdo|confirmo|perfecto|as[ií] est[aá] bien|h[aá]gale|ahora s[ií])/i.test(inputClean)) {
        // Ejecutar agendamiento atómico
        const resAgendar = await executeTool("agendar_cita", {
          afiliadoId: contexto.afiliadoId,
          slotId: contexto.slotPropuesto.slotId,
          motivoConsulta: "Agendamiento asistido por voz",
          canal: "voz",
        });

        if (resAgendar.exito) {
          contexto.citaAgendadaCodigo = resAgendar.data.codigoCita;
          contexto.estado = "COMPROBANTE_FINAL";
          const rta = `¡Listo! Su cita quedó agendada bajo el código ${resAgendar.data.codigoCita}. ¿Quiere que le muestre el comprobante en pantalla o se lo envío por correo electrónico?`;
          contexto.historialTurnos.push({ role: "assistant", content: rta });
          return { respuestaVoz: rta, contextoActualizado: contexto, toolEjecutada: "agendar_cita" };
        } else {
          contexto.estado = "CONSULTA_DISPONIBILIDAD";
          const rta = `${resAgendar.error} ¿Desea que busquemos otro horario?`;
          return { respuestaVoz: rta, contextoActualizado: contexto };
        }
      } else if (/^(no|espera|cambiar|otro horario)/i.test(inputClean)) {
        contexto.slotPropuesto = undefined;
        contexto.estado = "CONSULTA_DISPONIBILIDAD";
        const rta = "Comprendo. ¿Prefiere en la mañana, en la tarde o en alguna otra sede de Cali?";
        return { respuestaVoz: rta, contextoActualizado: contexto };
      }
    }

    // PASO C: BÚSQUEDA DE ESPECIALIDAD Y DISPONIBILIDAD
    if (contexto.estado === "MOTIVO_SINTOMA" || contexto.estado === "SELECCION_ESPECIALIDAD" || contexto.estado === "CONSULTA_DISPONIBILIDAD") {
      // Manejo de petición fuera de Cali
      if (/bogot[aá]|medell[ií]n|barranquilla/i.test(inputClean)) {
        const rta = "EPS TRIADIX CitaVoz actualmente brinda atención exclusivamente en nuestra red de sedes en Santiago de Cali. ¿Desea consultar en Cali?";
        return { respuestaVoz: rta, contextoActualizado: contexto };
      }

      // 1. Identificar especialidad si no se ha fijado
      if (!contexto.especialidadId) {
        const resEsp = await executeTool("buscar_especialidad_por_motivo", { motivoConsulta: inputClean });
        if (resEsp.exito && resEsp.data.especialidadesRecomendadas?.length > 0) {
          const espTop = resEsp.data.especialidadesRecomendadas[0];
          contexto.especialidadId = espTop.especialidadId;
          contexto.especialidadNombre = espTop.nombre;
        } else {
          contexto.especialidadId = "esp-med-gen";
          contexto.especialidadNombre = "Medicina General";
        }
      }

      // Detectar si el usuario mencionó alguna sede en Cali
      let sedeFiltro: string | undefined = undefined;
      if (/versalles/i.test(inputClean)) sedeFiltro = "sede-versalles";
      else if (/tequendama/i.test(inputClean)) sedeFiltro = "sede-tequendama";
      else if (/pasoancho/i.test(inputClean)) sedeFiltro = "sede-pasoancho";

      // 2. Buscar disponibilidad para esa especialidad
      const resDisp = await executeTool("consultar_disponibilidad", {
        especialidadId: contexto.especialidadId,
        sedeId: sedeFiltro,
      });

      if (resDisp.exito && resDisp.data.franjas?.length > 0) {
        const primerSlot = resDisp.data.franjas[0];
        contexto.slotPropuesto = {
          slotId: primerSlot.slotId,
          fecha: primerSlot.fecha,
          horaInicio: primerSlot.horaInicio,
          medicoNombre: primerSlot.medicoNombre,
        };
        contexto.sedeNombre = primerSlot.sedeNombre;
        contexto.estado = "CONFIRMACION_EXPLICITA";

        const horaFormato12 = primerSlot.horaInicio.startsWith("07") ? "7:00 de la mañana" : primerSlot.horaInicio.startsWith("08") ? "8:00 de la mañana" : primerSlot.horaInicio;
        const rta = `Tengo cupo para ${contexto.especialidadNombre} el ${primerSlot.fecha} a las ${horaFormato12} en la ${primerSlot.sedeNombre} con el ${primerSlot.medicoNombre}. ¿Confirma esta cita?`;
        contexto.historialTurnos.push({ role: "assistant", content: rta });
        return { respuestaVoz: rta, contextoActualizado: contexto, toolEjecutada: "consultar_disponibilidad" };
      } else {
        const rta = `En este momento no tengo franjas libres para ${contexto.especialidadNombre}. ¿Le gustaría consultar en otra fecha o sede?`;
        return { respuestaVoz: rta, contextoActualizado: contexto };
      }
    }

    // PASO D: DEFENSA Y FALLBACK AMABLE
    const rtaDefault = "¿En qué otra cosa le puedo colaborar respecto a sus citas en EPS TRIADIX?";
    return { respuestaVoz: rtaDefault, contextoActualizado: contexto };
  }
}
