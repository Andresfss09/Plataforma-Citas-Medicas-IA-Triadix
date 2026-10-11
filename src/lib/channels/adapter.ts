import { ConversationalOrchestrator, ContextoSesion } from "../llm/orchestrator";

export interface MensajeEntranteCanal {
  canalId: "whatsapp" | "ivr_telefono" | "web";
  usuarioId: string;
  texto: string;
  telefono?: string;
}

export interface RespuestaCanal {
  textoRespuesta: string;
  metadata?: Record<string, any>;
  opcionesInteractivas?: string[];
  twimlXml?: string; // Para canal IVR telefónico
}

export interface CanalAdapter {
  nombreCanal: string;
  procesarMensaje(mensaje: MensajeEntranteCanal, contexto: ContextoSesion): Promise<RespuestaCanal>;
}

/**
 * Adaptador para canal WhatsApp Business API
 */
export class WhatsAppAdapter implements CanalAdapter {
  public nombreCanal = "whatsapp";

  constructor(private orchestrator: ConversationalOrchestrator) {}

  async procesarMensaje(mensaje: MensajeEntranteCanal, contexto: ContextoSesion): Promise<RespuestaCanal> {
    const res = await this.orchestrator.procesarTurno(contexto, mensaje.texto);

    // Formatear botones rápidos si el agente está en confirmación
    const opciones = contexto.estado === "CONFIRMACION_EXPLICITA" ? ["Sí, confirmar cita", "No, ver otro horario"] : undefined;

    return {
      textoRespuesta: `🏥 *EPS TRIADIX Cali*\n\n${res.respuestaVoz}`,
      opcionesInteractivas: opciones,
      metadata: { toolEjecutada: res.toolEjecutada, estado: contexto.estado },
    };
  }
}

/**
 * Adaptador para canal Telefónico IVR (Twilio / Voz SIP)
 */
export class TwilioIVRAdapter implements CanalAdapter {
  public nombreCanal = "ivr_telefono";

  constructor(private orchestrator: ConversationalOrchestrator) {}

  async procesarMensaje(mensaje: MensajeEntranteCanal, contexto: ContextoSesion): Promise<RespuestaCanal> {
    const res = await this.orchestrator.procesarTurno(contexto, mensaje.texto);

    // Generar TwiML para respuesta de voz telefónica
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="es-MX" voice="Polly.Mia">${res.respuestaVoz}</Say>
    <Gather input="speech" language="es-CO" timeout="3" action="/api/channels/ivr/gather"/>
</Response>`;

    return {
      textoRespuesta: res.respuestaVoz,
      twimlXml: twiml,
      metadata: { toolEjecutada: res.toolEjecutada },
    };
  }
}

