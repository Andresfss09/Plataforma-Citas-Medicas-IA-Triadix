/**
 * Observabilidad y Telemetría Estructurada del Agente CitaVoz.
 * Desglosa las latencias de cada componente (STT, LLM, Tools, TTS)
 * y emite registros estructurados en JSON libres de PII para cumplimiento de la Ley 1581.
 */

export interface MetricasTurno {
  sessionId: string;
  canal: "voz_web" | "whatsapp" | "ivr_telefono";
  latenciaTotalMs: number;
  latenciaSttMs?: number;
  latenciaLlmMs?: number;
  latenciaToolsMs?: number;
  latenciaTtsMs?: number;
  toolInvocada?: string;
  estadoFinal: string;
  exito: boolean;
  timestamp: string;
}

const bufferMetricas: MetricasTurno[] = [];

/**
 * Registra una métrica de turno estructurada
 */
export function registrarMetricaTurno(metrica: Omit<MetricasTurno, "timestamp">): void {
  const registroCompleto: MetricasTurno = {
    ...metrica,
    timestamp: new Date().toISOString(),
  };

  bufferMetricas.push(registroCompleto);

  // Alerta si la latencia percibida supera el objetivo SLA de 3.0 segundos
  if (registroCompleto.latenciaTotalMs > 3000) {
    console.warn(`⚠️ [SLA ALERT] Latencia excedida en turno ${registroCompleto.sessionId}: ${registroCompleto.latenciaTotalMs} ms (> 3000 ms)`);
  }

  // Log estructurado (sin PII)
  console.log(`📊 [TELEMETRÍA AGENTE] Turno procesado en ${registroCompleto.latenciaTotalMs} ms | Tool: ${registroCompleto.toolInvocada || "ninguna"} | Estado: ${registroCompleto.estadoFinal}`);
}

/**
 * Obtiene métricas agregadas anonimizadas para el panel de observabilidad
 */
export function obtenerMetricasAgregadas(): {
  totalTurnos: number;
  latenciaPromedioMs: number;
  tasaExitoPercent: number;
  turnosExcedieronSla: number;
} {
  if (bufferMetricas.length === 0) {
    return {
      totalTurnos: 0,
      latenciaPromedioMs: 0,
      tasaExitoPercent: 100,
      turnosExcedieronSla: 0,
    };
  }

  const sumaLatencia = bufferMetricas.reduce((acc, m) => acc + m.latenciaTotalMs, 0);
  const exitosos = bufferMetricas.filter((m) => m.exito).length;
  const sobreSla = bufferMetricas.filter((m) => m.latenciaTotalMs > 3000).length;

  return {
    totalTurnos: bufferMetricas.length,
    latenciaPromedioMs: Math.round(sumaLatencia / bufferMetricas.length),
    tasaExitoPercent: Number(((exitosos / bufferMetricas.length) * 100).toFixed(1)),
    turnosExcedieronSla: sobreSla,
  };
}

