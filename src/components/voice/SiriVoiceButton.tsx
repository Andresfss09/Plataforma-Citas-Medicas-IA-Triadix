import React from "react";

interface SiriVoiceButtonProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const SiriVoiceButton: React.FC<SiriVoiceButtonProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  onClick,
  disabled = false,
}) => {
  let labelEstado = "Iniciar Orientación por Voz";
  let subtexto = "Haga clic para activar el micrófono y solicitar su cita médica";
  
  if (isListening) {
    labelEstado = "Escuchando su voz...";
    subtexto = "Puede hablar ahora: salude, mencione sus síntomas o pida su cita médica";
  } else if (isProcessing) {
    labelEstado = "Procesando su solicitud con IA...";
    subtexto = "Evaluando especialidad médica y consultando agendas en Cali...";
  } else if (isSpeaking) {
    labelEstado = "Asistente CitaVoz respondiendo...";
    subtexto = "Escuche la orientación médica del asistente en tiempo real";
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/70 rounded-2xl border border-slate-200/80">
      <div className="relative flex items-center justify-center mb-5">
        {/* Anillos de actividad auditiva sutiles y profesionales */}
        {(isListening || isSpeaking) && (
          <>
            <span
              className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-teal-500/20 animate-ping pointer-events-none"
              aria-hidden="true"
            />
            <span
              className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-teal-600/30 animate-pulse pointer-events-none"
              aria-hidden="true"
            />
          </>
        )}

        {/* Botón de audio institucional */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={labelEstado}
          aria-pressed={isListening}
          className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-600/30 cursor-pointer ${
            isListening
              ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 scale-105"
              : isSpeaking
              ? "bg-teal-800 hover:bg-teal-900 text-white shadow-teal-900/25"
              : isProcessing
              ? "bg-amber-600 text-white animate-pulse"
              : "bg-teal-700 hover:bg-teal-800 text-white hover:shadow-teal-700/30 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {isProcessing ? (
            <svg
              className="w-9 h-9 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            <svg
              className="w-9 h-9 sm:w-10 sm:h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>

      <div
        className="text-center font-bold text-base text-slate-950 tracking-tight"
        aria-live="polite"
      >
        {labelEstado}
      </div>
      <p className="text-xs text-slate-600 font-medium max-w-xs text-center mt-1 leading-normal">
        {subtexto}
      </p>

      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600 font-medium">
        <kbd className="px-2 py-0.5 rounded bg-white border border-slate-300 font-mono text-[11px] text-slate-700 shadow-2xs">
          Espacio
        </kbd>
        <span>Activar / Detener micrófono</span>
      </div>
    </div>
  );
};
