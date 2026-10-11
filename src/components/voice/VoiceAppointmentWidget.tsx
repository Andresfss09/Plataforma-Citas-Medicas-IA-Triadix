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
    textoEnVivo,
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

  const handleAtajoVoz = (frase: string) => {
    enviarTextoManual(frase);
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
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-300 shadow-md p-6 space-y-5">
          <SiriVoiceButton
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            onClick={toggleEscucha}
          />

          {/* Transcripción en vivo si el micrófono está capturando voz */}
          {isListening && textoEnVivo && (
            <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl animate-pulse">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 mb-1">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                <span>Capturando voz en tiempo real:</span>
              </div>
              <p className="text-xs text-slate-800 font-medium italic">
                &ldquo;{textoEnVivo}&rdquo;
              </p>
            </div>
          )}

          {/* Atajos de Consulta Rápida por Voz */}
          <div className="space-y-2 pt-2">
            <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Consultas Rápidas por Voz:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleAtajoVoz("Buenos días")}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-400 border border-slate-300 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                👋 &ldquo;Buenos días&rdquo;
              </button>
              <button
                type="button"
                onClick={() => handleAtajoVoz("Tengo dolor de estómago y mala digestión")}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-400 border border-slate-300 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                🥗 &ldquo;Problema de nutrición / digestión&rdquo;
              </button>
              <button
                type="button"
                onClick={() => handleAtajoVoz("No veo bien de lejos y me duelen los ojos")}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-400 border border-slate-300 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                👁️ &ldquo;Problemas de visión&rdquo;
              </button>
              <button
                type="button"
                onClick={() => handleAtajoVoz("Necesito cita de medicina general en la sede Tequendama")}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-400 border border-slate-300 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                🏥 &ldquo;Medicina General Tequendama&rdquo;
              </button>
              <button
                type="button"
                onClick={() => handleAtajoVoz("Opción 1")}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-400 border border-slate-300 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                ✅ &ldquo;Opción 1&rdquo;
              </button>
            </div>
          </div>

          {/* Entrada de Texto Suplementaria para Accesibilidad */}
          <form onSubmit={handleEnviarManual} className="pt-4 border-t border-slate-200 space-y-2">
            <label htmlFor="textoManual" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Entrada por Teclado:
            </label>
            <div className="flex gap-2">
              <input
                id="textoManual"
                type="text"
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                placeholder="Escriba su motivo o sede..."
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-500 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
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
