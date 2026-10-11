"use client";

import { useState } from "react";

export function AdminLoginModal({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        setError(data.error || "Credenciales de administrador incorrectas.");
        setCargando(false);
        return;
      }

      onLoginSuccess();
    } catch (err) {
      setError("Error de comunicación con el servicio de autenticación.");
      setCargando(false);
    }
  };

  const autoCompletarTI = () => {
    setUsuario("admin.ti");
    setPassword("TriadixIT2026*");
    setError(null);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Cabecera Técnica de TI */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Consola Administrativa TI
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                EPS TRIADIX • Gerencia de Tecnología
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de Acceso Restringido */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-normal flex items-start gap-2">
            <span className="font-bold shrink-0">⚠️ ACCESO RESTRINGIDO:</span>
            <span>Módulo exclusivo para ingenieros de sistemas, administradores de base de datos y personal de soporte TI.</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario de Dominio TI
              </label>
              <input
                type="text"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ej. admin.ti"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Clave de Seguridad
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando en Directorio TI...</span>
                </>
              ) : (
                <span>Validar Acceso TI</span>
              )}
            </button>
          </form>

          {/* Atajo de Credenciales para Demostración */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={autoCompletarTI}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-left transition cursor-pointer text-xs"
            >
              <div className="font-semibold text-slate-700 flex items-center justify-between">
                <span>🔑 Credenciales Demo TI:</span>
                <span className="text-[10px] text-indigo-700 font-bold uppercase">Autocompletar</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Usuario: <strong className="text-slate-800">admin.ti</strong> • Clave: <strong className="text-slate-800">TriadixIT2026*</strong>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

