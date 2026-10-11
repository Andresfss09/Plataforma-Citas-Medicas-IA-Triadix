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
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[460px] overflow-hidden"
      role="region"
      aria-label="Registro de interacción clínica"
    >
      {/* Cabecera del panel de interacción */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" aria-hidden="true" />
          <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Canal de Orientación en Tiempo Real
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
          Red Cali • es-CO
        </span>
      </div>

      {/* Trazas de la conversación */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-3.5 scroll-smooth bg-white"
        aria-live="polite"
        tabIndex={0}
        role="log"
      >
        {mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs text-slate-500 font-medium">
              El canal de voz está listo. Presione el botón del micrófono o escriba para iniciar la consulta.
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Ejemplo: &quot;Necesito una cita de medicina general en la sede Tequendama&quot;
            </p>
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
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  m.remitente === "usuario"
                    ? "bg-teal-700 text-white rounded-br-none shadow-sm"
                    : m.remitente === "sistema"
                    ? "bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-none font-medium"
                    : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60 font-normal"
                }`}
              >
                {m.texto}
              </div>
              <span className="text-[10px] text-slate-400 px-1 mt-1 font-mono">{m.hora}</span>
            </div>
          ))
        )}
      </div>

      {/* Comprobante emitido al finalizar */}
      {comprobanteCodigo && (
        <div className="p-4 border-t border-slate-200 bg-teal-50/70 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
              <svg className="w-4 h-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Cita Programada Oficialmente</span>
            </div>
            <div className="text-xs text-slate-600 font-mono mt-0.5">
              Radicado Único: <strong className="text-teal-800 font-bold">{comprobanteCodigo}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/citas/${comprobanteCodigo}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Descargar PDF
            </a>
            <a
              href={`/api/citas/${comprobanteCodigo}/calendario.ics`}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              .ICS
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
