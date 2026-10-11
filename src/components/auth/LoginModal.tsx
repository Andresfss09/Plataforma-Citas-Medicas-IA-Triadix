"use client";

import { useState } from "react";

interface PacienteDemo {
  nombre: string;
  documento: string;
  clave: string;
  regimen: string;
}

const PACIENTES_DEMO_RAPIDOS: PacienteDemo[] = [
  { nombre: "Valentina Garcés Barona", documento: "1100015838", clave: "triadix5838", regimen: "Contributivo • Cat A" },
  { nombre: "Juan David Bonilla Castro", documento: "1100023757", clave: "triadix3757", regimen: "Contributivo • Cat B" },
  { nombre: "Carlos Andrés Caicedo Murillo", documento: "1100031676", clave: "triadix1676", regimen: "Subsidiado" },
  { nombre: "Mariana Arana Hurtado", documento: "1100039595", clave: "triadix9595", regimen: "Contributivo • Cat C" },
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
      setError("Error de comunicación con el servidor central.");
      setCargando(false);
    }
  };

  const seleccionarDemo = (p: PacienteDemo) => {
    setNumeroDocumento(p.documento);
    setPassword(p.clave);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden grid lg:grid-cols-12 min-h-[580px]">
        
        {/* Panel Izquierdo: Branding Corporativo EPS TRIADIX */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          {/* Fondo sutil de cuadrícula médica */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-sm tracking-tight">
                TX
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight text-white leading-tight">
                  EPS TRIADIX
                </h1>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Entidad Promotora de Salud
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <span className="inline-block px-2.5 py-1 rounded bg-teal-950 text-teal-300 border border-teal-800/60 text-[11px] font-semibold tracking-wide uppercase">
                Portal de Servicios en Línea
              </span>
              <h2 className="text-2xl font-bold text-slate-100 leading-snug">
                Acceso a Citas Médicas y Orientación en Salud
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                Autenticación segura para afiliados adscritos a la red asistencial de Santiago de Cali y Valle del Cauca.
              </p>
            </div>
          </div>

          {/* Información legal al pie */}
          <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Vigilado por la Superintendencia Nacional de Salud</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013 de Protección de Datos Personales.
            </p>
          </div>
        </div>

        {/* Panel Derecho: Formulario de Autenticación */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Iniciar Sesión
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Ingrese sus credenciales de afiliado registradas en la base de datos institucional.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-start gap-2.5">
                <svg className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tipo de Documento
                </label>
                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition shadow-sm"
                >
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="TI">Tarjeta de Identidad (TI)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="PA">Pasaporte (PA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Número de Documento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ingrese su documento de identidad"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition shadow-sm placeholder:text-slate-400 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <span className="text-[11px] text-slate-400">
                    triadix + 4 dígitos
                  </span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition shadow-sm placeholder:text-slate-400 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 active:bg-teal-900 font-semibold text-white text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {cargando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validando afiliación...</span>
                    </>
                  ) : (
                    <span>Ingresar al Portal</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Selector de Casos de Prueba Institucionales */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Afiliados de Demostración (Neon DB):
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Haga clic para autocompletar</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PACIENTES_DEMO_RAPIDOS.map((p) => (
                <button
                  key={p.documento}
                  type="button"
                  onClick={() => seleccionarDemo(p)}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition bg-slate-50/50 cursor-pointer text-xs group"
                >
                  <p className="font-semibold text-slate-800 group-hover:text-teal-900 truncate">
                    {p.nombre}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-0.5">
                    <span>CC: {p.documento}</span>
                    <span className="text-teal-700 font-medium">{p.clave}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
