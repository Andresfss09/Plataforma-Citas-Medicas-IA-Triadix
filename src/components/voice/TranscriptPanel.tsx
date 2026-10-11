import React from "react";

export interface MensajeChat {
  id: string;
  remitente: "usuario" | "asistente" | "sistema";
  texto: string;
  hora: string;
}

interface TranscriptPanelProps {
  mensajes: MensajeChat[];
  comprobanteCodigo?: string;
  onDescargarComprobante?: (codigo: string) => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  mensajes,
  comprobanteCodigo,
  onDescargarComprobante,
}) => {
  return (
    <div
      className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 flex flex-col h-[420px]"
      role="region"
      aria-label="Transcripción de la conversación de voz"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          Conversación en Vivo (Cali)
        </h2>
        <span className="text-xs text-slate-400 font-medium">Accesible para lector de pantalla</span>
      </div>

      <div
        className="flex-1 overflow-y-auto py-4 space-y-3 pr-2 scroll-smooth"
        aria-live="polite"
        tabIndex={0}
        role="log"
      >
        {mensajes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center italic">
            Presione el botón de micrófono o escriba para iniciar su agendamiento en EPS TRIADIX...
          </div>
        ) : (
          mensajes.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.remitente === "usuario" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.remitente === "usuario"
                    ? "bg-blue-700 text-white rounded-tr-none"
                    : m.remitente === "sistema"
                    ? "bg-red-50 text-red-900 border border-red-200"
                    : "bg-slate-100 text-slate-900 rounded-tl-none font-medium"
                }`}
              >
                {m.texto}
              </div>
              <span className="text-[10px] text-slate-400 px-1 mt-0.5">{m.hora}</span>
            </div>
          ))
        )}
      </div>

      {comprobanteCodigo && (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
          <div>
            <div className="text-xs font-bold text-emerald-900">¡Cita Agendada con Éxito!</div>
            <div className="text-xs text-emerald-700 font-mono">Radicado: {comprobanteCodigo}</div>
          </div>
          <a
            href={`/api/comprobantes/${comprobanteCodigo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow transition focus:ring-2 focus:ring-emerald-500"
          >
            Descargar PDF
          </a>
        </div>
      )}
    </div>
  );
};

