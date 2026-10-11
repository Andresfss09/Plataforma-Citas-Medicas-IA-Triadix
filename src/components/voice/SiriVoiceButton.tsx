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
  let labelEstado = "Presione para hablar";
  if (isListening) labelEstado = "Escuchando... Hable ahora";
  else if (isProcessing) labelEstado = "Consultando agendas en Cali...";
  else if (isSpeaking) labelEstado = "CitaVoz hablando...";

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Onda pulsante animada estilo Siri al escuchar o hablar */}
        {(isListening || isSpeaking) && (
          <>
            <span
              className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-blue-500/30 animate-ping pointer-events-none"
              aria-hidden="true"
            />
            <span
              className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-indigo-500/40 animate-pulse pointer-events-none"
              aria-hidden="true"
            />
          </>
        )}

        {/* Botón principal táctil y accesible */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={labelEstado}
          aria-pressed={isListening}
          className={`relative z-10 w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-600 focus:ring-offset-4 ${
            isListening
              ? "bg-red-600 hover:bg-red-700 scale-105 shadow-red-500/50"
              : isSpeaking
              ? "bg-indigo-600 hover:bg-indigo-700 scale-105 shadow-indigo-500/50"
              : isProcessing
              ? "bg-amber-600 animate-pulse"
              : "bg-blue-700 hover:bg-blue-800 hover:scale-105 shadow-blue-900/40"
          }`}
        >
          {isProcessing ? (
            <svg
              className="w-10 h-10 text-white animate-spin"
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
              className="w-10 h-10 sm:w-12 sm:h-12 text-white"
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
        className="text-center font-bold text-base sm:text-lg text-slate-800 tracking-tight"
        aria-live="polite"
      >
        {labelEstado}
      </div>
      <p className="text-xs text-slate-500 max-w-xs text-center">
        Presione el botón o use la barra espaciadora para hablar con el asistente de EPS TRIADIX
      </p>
    </div>
  );
};

