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
    <div className="w-full py-4 sm:py-8 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden grid lg:grid-cols-12">
        
        {/* Panel Izquierdo: Branding y Seguridad Institucional TI */}
        <div className="lg:col-span-5 bg-[#0b1329] text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          {/* Fondo sutil de cuadrícula médica */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-700 flex items-center justify-center text-white font-black text-xl shadow-sm tracking-tight">
                TX
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight text-white leading-tight">
                  EPS TRIADIX
                </h1>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Gerencia de Tecnología & TI
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3">
              <span className="inline-block px-2.5 py-1 rounded bg-teal-950 text-teal-300 border border-teal-800/80 text-xs font-bold tracking-wide uppercase">
                Consola de Administración y Auditoría
              </span>
              <h2 className="text-2xl font-black text-slate-100 leading-snug">
                Operaciones, Telemetría y Red Asistencial
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-normal pt-1">
                Supervisión gerencial de capacidad instalada, generación de reportes oficiales en Excel/PDF y control del agente clínico en Santiago de Cali.
              </p>
            </div>
          </div>

          {/* Información de Ciberseguridad al pie */}
          <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/80 space-y-2 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Protocolo Seguro de Ciberseguridad TI</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight font-normal">
              Cifrado AES-256-GCM en base de datos PostgreSQL Neon y trazabilidad estricta conforme a la Ley 1581.
            </p>
          </div>
        </div>

        {/* Panel Derecho: Formulario de Autenticación TI */}
        <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xl font-black text-slate-950 tracking-tight">
                  Iniciar Sesión de Administrador
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                  Área TI
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Ingrese sus credenciales de dominio corporativo de infraestructura y soporte.
              </p>
            </div>

            {/* Aviso de Acceso Restringido */}
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 leading-relaxed flex items-start gap-2.5">
              <span className="text-sm shrink-0">⚠️</span>
              <div>
                <strong className="font-bold block text-amber-950">Acceso Restringido al Personal de TI:</strong>
                <span className="text-amber-900 font-normal">Módulo reservado para ingenieros, administradores de base de datos y auditoría de la EPS.</span>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 font-semibold flex items-start gap-2.5">
                <svg className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Usuario de Dominio TI
                </label>
                <input
                  type="text"
                  required
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="ej. admin.ti"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-950 font-medium font-mono text-sm focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none transition shadow-xs placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Clave de Seguridad
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-950 font-medium font-mono text-sm focus:border-teal-700 focus:ring-1 focus:ring-teal-700 focus:outline-none transition shadow-xs placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-3 px-4 rounded-lg bg-teal-800 hover:bg-teal-900 active:bg-teal-950 font-bold text-white text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {cargando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validando privilegios TI...</span>
                    </>
                  ) : (
                    <span>Validar Acceso a la Consola TI</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Atajo de Credenciales de Demostración Oficial */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Credenciales de Prueba TI (Neon DB):
              </span>
              <span className="text-[11px] text-slate-600 font-medium">Clic para autocompletar</span>
            </div>

            <button
              type="button"
              onClick={autoCompletarTI}
              className="w-full p-3 rounded-lg border border-slate-300 hover:border-teal-700 hover:bg-teal-50/60 bg-slate-50 transition text-left cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-950 group-hover:text-teal-950 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>Ingeniero Administrador TI (Root)</span>
                </span>
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                  Autocompletar
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-700 font-mono mt-1">
                <span>Usuario: <strong className="text-slate-950 font-bold">admin.ti</strong></span>
                <span>•</span>
                <span>Clave: <strong className="text-teal-800 font-bold">TriadixIT2026*</strong></span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

