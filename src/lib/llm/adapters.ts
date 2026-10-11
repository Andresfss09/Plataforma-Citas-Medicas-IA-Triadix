import { LLMProvider, ChatMessage, LLMResponse } from "./provider";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env";

export class GeminiProvider implements LLMProvider {
  public name = "gemini";
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  async generateResponse(
    messages: ChatMessage[],
    tools?: Array<{ name: string; description: string; parameters: any }>
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.genAI || !env.GEMINI_API_KEY) {
      // Degradar con mensaje amable si no hay API key configurada
      return {
        content: "Bienvenido a EPS TRIADIX. El servicio inteligente está en modo local. Por favor dígame su cédula para consultar su cita.",
        provider: "gemini-fallback",
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Transformar mensajes al formato Gemini
      const promptParts = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

      const result = await model.generateContent(promptParts);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        provider: "gemini-1.5-flash",
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      console.warn("⚠️ [GeminiProvider] Error o límite de cuota alcanzado:", error.message);
      return {
        content: "En este momento presento una pequeña congestión en mi sistema. Permítame un momento y con el mayor gusto continúo colaborándole.",
        provider: "gemini-degraded",
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

export class MockLLMProvider implements LLMProvider {
  public name = "mock-triadix";

  async generateResponse(
    messages: ChatMessage[],
    tools?: Array<{ name: string; description: string; parameters: any }>
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || "";

    // Simulación reactiva determinista para el banco de pruebas y fallback sin costo
    if (lastMsg.includes("infarto") || lastMsg.includes("pecho") || lastMsg.includes("ahogo") || lastMsg.includes("morir")) {
      return {
        content: "⚠️ ALERTA MÉDICA: Por favor comuníquese de inmediato a la Línea 123 en Cali o acuda al servicio de urgencias.",
        toolCalls: [
          {
            id: "call-urgencia-1",
            name: "reportar_urgencia",
            arguments: { sintomaCritico: lastMsg },
          },
        ],
        provider: "mock-triadix",
        latencyMs: Date.now() - startTime,
      };
    }

    if (lastMsg.includes("cédula") || /\b\d{7,10}\b/.test(lastMsg)) {
      const matchDoc = lastMsg.match(/\b\d{7,10}\b/);
      const doc = matchDoc ? matchDoc[0] : "1100007919";
      return {
        content: "Con gusto verifico su información en EPS TRIADIX. ¿Para qué especialidad necesita su cita?",
        toolCalls: [
          {
            id: "call-verif-1",
            name: "verificar_afiliado",
            arguments: { tipoDocumento: "CC", numeroDocumento: doc },
          },
        ],
        provider: "mock-triadix",
        latencyMs: Date.now() - startTime,
      };
    }

    if (lastMsg.includes("rodilla") || lastMsg.includes("muela") || lastMsg.includes("ojos") || lastMsg.includes("medicina general") || lastMsg.includes("odontologia")) {
      return {
        content: "Comprendo su necesidad. Permítame verificar las especialidades y horarios disponibles en Cali.",
        toolCalls: [
          {
            id: "call-buscar-esp-1",
            name: "buscar_especialidad_por_motivo",
            arguments: { motivoConsulta: lastMsg },
          },
        ],
        provider: "mock-triadix",
        latencyMs: Date.now() - startTime,
      };
    }

    if (lastMsg.includes("sí") || lastMsg.includes("confirmo") || lastMsg.includes("de acuerdo")) {
      return {
        content: "Perfecto. Su cita ha quedado agendada con éxito en EPS TRIADIX. Ya tiene disponible su comprobante en PDF.",
        provider: "mock-triadix",
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      content: "¡Muy buenos días! Con el mayor gusto le atiendo en EPS TRIADIX Cali. ¿Podría facilitarme su número de documento?",
      provider: "mock-triadix",
      latencyMs: Date.now() - startTime,
    };
  }
}

