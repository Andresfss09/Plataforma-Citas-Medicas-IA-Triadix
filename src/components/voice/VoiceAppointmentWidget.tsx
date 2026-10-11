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
      {/* Alerta Prioritaria de Emergencia Vital (Triage 123) */}
      {alertaEmergencia && (
        <section
          className="bg-red-600 text-white rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border-4 border-red-300 animate-bounce"
          role="alert"
          aria-live="assertive"
        >
          <div className="space-y-1">
            <div className="text-xl font-black flex items-center gap-2">
              <span>🚨</span> ALERTA DE EMERGENCIA MÉDICA VITAL
            </div>
            <p className="text-sm font-semibold text-red-100">
              {alertaEmergencia}
            </p>
          </div>
          <a
            href="tel:123"
            className="shrink-0 bg-white text-red-700 px-6 py-3 rounded-2xl font-black text-base shadow-xl hover:bg-red-50 transition focus:ring-4 focus:ring-red-400"
          >
            Llamar al 123 Ahora
          </a>
        </section>
      )}

      {/* Grid Principal: Botón Siri de Voz + Panel de Transcripción */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Botón Siri y entrada accesible */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-md p-8 flex flex-col items-center justify-center space-y-6">
          <SiriVoiceButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            onClick={toggleEscucha}
          />

          {/* Formulario Fallback Accesible por Teclado */}
          <form onSubmit={handleEnviarManual} className="w-full pt-4 border-t border-slate-100 space-y-2">
            <label htmlFor="textoManual" className="block text-xs font-bold text-slate-600 uppercase">
              O escriba su mensaje si prefiere el teclado:
            </label>
            <div className="flex gap-2">
              <input
                id="textoManual"
                type="text"
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                placeholder="Ej. Necesito cita de medicina general..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow transition"
              >
                Enviar
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Panel de Transcripción */}
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

