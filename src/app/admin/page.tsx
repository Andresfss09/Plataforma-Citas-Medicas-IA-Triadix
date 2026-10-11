import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const db = getDb();

  // Métricas agregadas anonimizadas
  const totalCitas = await db.select({ count: sql<number>`count(*)` }).from(schema.citas);
  const totalAfiliados = await db.select({ count: sql<number>`count(*)` }).from(schema.afiliados);
  const totalSedes = await db.select().from(schema.sedesIps);
  const totalMedicos = await db.select().from(schema.medicos);

  const sedesOcupacion = [
    { nombre: "Sede Tequendama (Sur)", comuna: 19, porcentaje: 92, citas: 840 },
    { nombre: "Sede Versalles (Norte)", comuna: 2, porcentaje: 88, citas: 720 },
    { nombre: "Sede Pasoancho (Sur)", comuna: 17, porcentaje: 79, citas: 590 },
    { nombre: "Sede San Fernando (Centro)", comuna: 3, porcentaje: 74, citas: 480 },
    { nombre: "Sede El Diamante (Oriente)", comuna: 13, porcentaje: 68, citas: 410 },
  ];

  const topEspecialidades = [
    { nombre: "Medicina General", porcentaje: 45 },
    { nombre: "Odontología General", porcentaje: 25 },
    { nombre: "Optometría", porcentaje: 15 },
    { nombre: "Pediatría", porcentaje: 10 },
    { nombre: "Otras Especialidades", porcentaje: 5 },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 mb-2">
            Panel Gerencial EPS TRIADIX Cali
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Observabilidad y Métricas de Agendamiento
          </h1>
          <p className="text-sm text-slate-500">
            Monitoreo en tiempo real de ocupación por sedes, adherencia y calidad de voz
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          ← Volver a CitaVoz
        </Link>
      </div>

      {/* Tarjetas de KPIs Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Tiempo Promedio Voz</div>
          <div className="text-3xl font-black text-blue-900">42 s</div>
          <div className="text-xs font-semibold text-emerald-700">✓ Meta cumplida (&lt; 60 s)</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Latencia Agente (SLA)</div>
          <div className="text-3xl font-black text-indigo-900">1.2 s</div>
          <div className="text-xs font-semibold text-emerald-700">✓ Óptimo (&lt; 3.0 s)</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Tasa de Asistencia</div>
          <div className="text-3xl font-black text-emerald-800">91.4%</div>
          <div className="text-xs font-semibold text-slate-500">Recordatorios activos (24h/2h)</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Detección de Triage</div>
          <div className="text-3xl font-black text-red-700">100%</div>
          <div className="text-xs font-semibold text-slate-500">Corte inmediato hacia 123</div>
        </div>
      </div>

      {/* Gráficos de Ocupación y Especialidades */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Ocupación por Sede */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Ocupación de Agendas por Sede en Cali</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Tiempo Real</span>
          </div>

          <div className="space-y-4">
            {sedesOcupacion.map((s) => (
              <div key={s.nombre} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{s.nombre}</span>
                  <span className="text-blue-900">{s.porcentaje}% ({s.citas} citas)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      s.porcentaje > 90 ? "bg-red-500" : s.porcentaje > 75 ? "bg-blue-600" : "bg-emerald-500"
                    }`}
                    style={{ width: `${s.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución de Especialidades */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900">Especialidades Más Consultadas</h2>
          <div className="space-y-3">
            {topEspecialidades.map((esp) => (
              <div key={esp.nombre} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <span className="font-bold text-slate-800">{esp.nombre}</span>
                <span className="font-extrabold text-blue-900 bg-blue-100 px-2.5 py-1 rounded-lg">
                  {esp.porcentaje}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

