"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PacienteDemo {
  nombre: string;
  documento: string;
  clave: string;
  regimen: string;
}

const PACIENTES_DEMO_RAPIDOS: PacienteDemo[] = [
  { nombre: "Valentina Garcés", documento: "1100015838", clave: "triadix5838", regimen: "Contributivo - Cat A" },
  { nombre: "Juan David Bonilla", documento: "1100023757", clave: "triadix3757", regimen: "Contributivo - Cat B" },
  { nombre: "Carlos Andrés Caicedo", documento: "1100031676", clave: "triadix1676", regimen: "Subsidiado" },
  { nombre: "Mariana Arana", documento: "1100039595", clave: "triadix9595", regimen: "Contributivo - Cat C" },
];

export function LoginModal({ onLoginSuccess }: { onLoginSuccess: (paciente: any) => void }) {
  const [tipoDocumento, setTipoDocumento] = useState("CC");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoDocumento, numeroDocumento, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        setError(data.error || "Documento o clave incorrectos.");
        setCargando(false);
        return;
      }

      onLoginSuccess(data.afiliado);
    } catch (err: any) {
      setError("Error de red o conexión al servidor.");
      setCargando(false);
    }
  };

  const seleccionarDemo = (p: PacienteDemo) => {
    setNumeroDocumento(p.documento);
    setPassword(p.clave);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Cabecera institucional */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
            <span className="text-2xl">🏥</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Portal Paciente EPS TRIADIX</h2>
          <p className="text-xs text-blue-200 mt-1">Identifíquese para acceder al asistente de voz y citas médicas</p>
        </div>

        {/* Formulario */}
        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo de Documento
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none text-sm"
              >
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PA">Pasaporte (PA)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Número de Cédula / Documento
              </label>
              <input
                type="text"
                required
                placeholder="Ej. 1100015838"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none text-sm placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña Asignada
              </label>
              <input
                type="password"
                required
                placeholder="Ej. triadix5838"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none text-sm placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Regla del demo: la clave es <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded">triadix + últimos 4 dígitos</code> de la cédula.
              </p>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] transition font-bold text-white text-sm shadow-lg shadow-blue-700/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando afiliación...</span>
                </>
              ) : (
                <span>Ingresar a la Plataforma</span>
              )}
            </button>
          </form>

          {/* Atajos de Pacientes Demo para facilitar la prueba */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
              💡 Pacientes Ficticios Rápidos (Clic para probar):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PACIENTES_DEMO_RAPIDOS.map((p) => (
                <button
                  key={p.documento}
                  type="button"
                  onClick={() => seleccionarDemo(p)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition bg-slate-50 group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">{p.nombre}</div>
                  <div className="text-[11px] text-slate-500 font-mono">CC: {p.documento}</div>
                  <div className="text-[10px] text-blue-600 font-semibold font-mono">Clave: {p.clave}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

