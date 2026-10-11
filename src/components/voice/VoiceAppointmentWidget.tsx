"use client";

import React, { useState } from "react";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { SiriVoiceButton } from "@/components/voice/SiriVoiceButton";
import { TranscriptPanel } from "@/components/voice/TranscriptPanel";

interface VoiceAppointmentWidgetProps {
  sedesCount: number;
  medicosCount: number;
  slotsCount: number;
}

export const VoiceAppointmentWidget: React.FC<VoiceAppointmentWidgetProps> = ({
  sedesCount,
  medicosCount,
  slotsCount,
}) => {
  const {
    isListening,
    isSpeaking,
    isProcessing,
    mensajes,
    comprobanteCodigo,
    alertaEmergencia,
    toggleEscucha,
    enviarTextoManual,
  } = useVoiceAssistant();

  const [textoManual, setTextoManual] = useState("");

  const handleEnviarManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoManual.trim()) return;
    enviarTextoManual(textoManual.trim());
    setTextoManual("");
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Urgencia Vital (Protocolo Triage 123) */}
      {alertaEmergencia && (
        <section
          className="bg-rose-700 text-white rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 border border-rose-600"
          role="alert"
          aria-live="assertive"
        >
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-base font-bold flex items-center justify-center sm:justify-start gap-2 text-rose-100">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span>ACTIVACIÓN DE PROTOCOLO DE URGENCIA MÉDICA VITAL</span>
            </div>
            <p className="text-sm text-rose-100 leading-relaxed max-w-2xl">
              {alertaEmergencia}
            </p>
          </div>
          <a
            href="tel:123"
            className="shrink-0 bg-white text-rose-700 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-rose-50 transition"
          >
            Llamar a Emergencias (123)
          </a>
        </section>
      )}

      {/* Grid Principal: Módulo de Entrada de Audio + Bitácora Clínica */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Dispositivo de Voz & Entrada Alternativa */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <SiriVoiceButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            onClick={toggleEscucha}
          />

          {/* Entrada de Texto Suplementaria para Accesibilidad */}
          <form onSubmit={handleEnviarManual} className="pt-5 border-t border-slate-100 space-y-2">
            <label htmlFor="textoManual" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Entrada Alternativa por Teclado:
            </label>
            <div className="flex gap-2">
              <input
                id="textoManual"
                type="text"
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                placeholder="Escriba su motivo o sede..."
                className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Enviar
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Bitácora de la Consulta */}
        <div className="lg:col-span-7">
          <TranscriptPanel
            mensajes={mensajes}
            comprobanteCodigo={comprobanteCodigo}
          />
        </div>
      </div>
    </div>
  );
};
