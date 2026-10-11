"use client";

import { useEffect, useState } from "react";
import { LoginModal } from "./LoginModal";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [pacienteAutenticado, setPacienteAutenticado] = useState<any>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    // Comprobar si ya existe la cookie de sesión del paciente
    const cookies = document.cookie.split("; ");
    const infoCookie = cookies.find((c) => c.startsWith("citavoz_paciente_info="));

    if (infoCookie) {
      try {
        const data = JSON.parse(decodeURIComponent(infoCookie.split("=")[1]));
        setPacienteAutenticado(data);
      } catch (err) {
        setPacienteAutenticado(null);
      }
    }
    setVerificando(false);
  }, []);

  const handleCerrarSesion = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      document.cookie = "citavoz_paciente_session=; path=/; max-age=0";
      document.cookie = "citavoz_paciente_info=; path=/; max-age=0";
      setPacienteAutenticado(null);
      window.location.reload();
    }
  };

  if (verificando) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Verificando estado de afiliación...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {!pacienteAutenticado && (
        <LoginModal
          onLoginSuccess={(paciente) => {
            setPacienteAutenticado(paciente);
          }}
        />
      )}

      {pacienteAutenticado && (
        <div className="space-y-6">
          {/* Barra superior de sesión: diseño sobrio y profesional */}
          <div className="bg-white border border-slate-300 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                <svg className="w-5 h-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                    Afiliado Activo
                  </span>
                  <span className="text-xs text-slate-600 font-mono font-semibold">
                    C.C. {pacienteAutenticado.documento || pacienteAutenticado.numeroDocumento}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-950 mt-0.5">
                  {[pacienteAutenticado.nombres || pacienteAutenticado.nombre, pacienteAutenticado.apellidos].filter(Boolean).join(" ")}
                </p>
              </div>
            </div>

            <button
              onClick={handleCerrarSesion}
              className="text-xs font-bold px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>Finalizar Sesión</span>
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {children}
        </div>
      )}
    </>
  );
}
