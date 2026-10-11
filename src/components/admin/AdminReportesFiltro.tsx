"use client";

import { useState } from "react";

export function AdminReportesFiltro() {
  const anioActual = new Date().getFullYear().toString();
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState("");
  const [dia, setDia] = useState("");
  const [sede, setSede] = useState("todas");
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);

  const handleDescargar = (formato: "excel" | "pdf") => {
    setDescargando(formato);
    const params = new URLSearchParams();
    params.set("formato", formato);
    if (anio) params.set("anio", anio);
    if (mes) params.set("mes", mes);
    if (dia) params.set("dia", dia);
    if (sede && sede !== "todas") params.set("sedeId", sede);

    // Abrir o descargar
    window.location.href = `/api/admin/reportes?${params.toString()}`;
    setTimeout(() => setDescargando(null), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Generador de Reportes y Auditoría de Citas
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Exporte la base consolidada de citas médicas filtrada por día, mes y año en formatos oficiales
          </p>
        </div>
        <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 self-start sm:self-auto">
          Módulo SGSSS • RIPS Compatible
        </span>
      </div>

      {/* Controles de Filtrado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Año
          </label>
          <select
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
          >
            <option value="2026">2026 (Vigente)</option>
            <option value="2025">2025</option>
            <option value="">Todos los años</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Mes
          </label>
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
          >
            <option value="">Todo el año</option>
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Día Específico
          </label>
          <input
            type="number"
            min="1"
            max="31"
            placeholder="Todos (ej. 15)"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Sede IPS (Cali)
          </label>
          <select
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white font-medium focus:ring-1 focus:ring-teal-600 focus:outline-none"
          >
            <option value="todas">Todas las sedes</option>
            <option value="Tequendama">Sede Tequendama</option>
            <option value="Versalles">Sede Versalles</option>
            <option value="Pasoancho">Sede Pasoancho</option>
            <option value="San Fernando">Sede San Fernando</option>
            <option value="Ciudad Jardín">Sede Ciudad Jardín</option>
            <option value="El Diamante">Sede El Diamante</option>
          </select>
        </div>
      </div>

      {/* Botones de Descarga Profesional */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
        <div className="text-xs text-slate-500 text-center sm:text-left">
          <span>Formato listo para análisis de auditoría médica y facturación electrónica EPS.</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Botón Descargar Excel */}
          <button
            type="button"
            disabled={descargando !== null}
            onClick={() => handleDescargar("excel")}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{descargando === "excel" ? "Generando..." : "Descargar Excel (.CSV)"}</span>
          </button>

          {/* Botón Descargar PDF */}
          <button
            type="button"
            disabled={descargando !== null}
            onClick={() => handleDescargar("pdf")}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>{descargando === "pdf" ? "Generando..." : "Descargar PDF Ejecutivo"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
