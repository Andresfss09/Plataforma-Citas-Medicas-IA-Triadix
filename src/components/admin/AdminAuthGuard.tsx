"use client";

import { useEffect, useState } from "react";
import { AdminLoginModal } from "./AdminLoginModal";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const hasAdminSession = cookies.some((c) => c.startsWith("citavoz_admin_session="));
    setAutenticado(hasAdminSession);
    setVerificando(false);
  }, []);

  const handleCerrarSesion = async () => {
    try {
      await fetch("/api/auth/admin-login", { method: "DELETE" });
    } finally {
      document.cookie = "citavoz_admin_session=; path=/; max-age=0";
      setAutenticado(false);
      window.location.reload();
    }
  };

  if (verificando) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Verificando permisos de seguridad TI...</span>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return <AdminLoginModal onLoginSuccess={() => setAutenticado(true)} />;
  }

  return (
    <div className="space-y-6">
      {/* Barra de Sesión Activa de TI */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-mono font-bold">
            IT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Sesión Administrativa: admin.ti</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Acceso Concedido
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Oficina de Tecnología e Información • Base de Datos Neon (Producción)</p>
          </div>
        </div>

        <button
          onClick={handleCerrarSesion}
          className="text-xs font-medium px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
        >
          Cerrar Sesión TI ➔
        </button>
      </div>

      {children}
    </div>
  );
}

