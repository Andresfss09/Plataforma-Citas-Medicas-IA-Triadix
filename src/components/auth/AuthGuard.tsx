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
        <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Verificando credenciales de afiliado...</span>
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
          {/* Barra superior de bienvenida del afiliado identificado */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-900 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                👤
              </div>
              <div>
                <p className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
                  Afiliado Identificado en Sesión
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {pacienteAutenticado.nombre || pacienteAutenticado.nombres} • C.C. {pacienteAutenticado.documento || pacienteAutenticado.numeroDocumento}
                </p>
              </div>
            </div>
            <button
              onClick={handleCerrarSesion}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 transition shadow-sm"
            >
              Cerrar Sesión ➔
            </button>
          </div>

          {children}
        </div>
      )}
    </>
  );
}

