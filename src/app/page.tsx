import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { decryptSensitiveData } from "@/lib/crypto";
import { VoiceAppointmentWidget } from "@/components/voice/VoiceAppointmentWidget";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();

  // Consultar métricas de la base de datos de EPS TRIADIX
  const sedesList = await db.select().from(schema.sedesIps);
  const especialidadesList = await db.select().from(schema.especialidades);
  const medicosList = await db.select().from(schema.medicos);
  const afiliadosList = await db.select().from(schema.afiliados).limit(5);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner Institucional Accesible */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-800/80 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200 border border-blue-700">
            <span>Asistente de Voz Activo en Tiempo Real</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            CitaVoz EPS <br className="hidden sm:inline" />
            <span className="text-blue-300">EPS TRIADIX Cali</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
            Hable con nuestro asistente para agendar su cita médica en segundos. Diseñado para adultos mayores con accesibilidad WCAG 2.1 AA y comprobante oficial en PDF.
          </p>
        </div>
      </section>

      {/* Widget Interactivo de Voz Estilo Siri */}
      <section>
        <VoiceAppointmentWidget
          sedesCount={sedesList.length}
          medicosCount={medicosList.length}
          slotsCount={4000}
        />
      </section>

      {/* Resumen de Sedes IPS en Cali */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Sedes de Atención EPS TRIADIX en Cali
            </h2>
            <p className="text-xs text-slate-500">Distribuidas en 10 comunas para su comodidad</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
            {sedesList.length} Sedes Habilitadas
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sedesList.slice(0, 6).map((sede: any) => (
            <div key={sede.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition space-y-1.5">
              <div className="flex items-start justify-between gap-1">
                <h3 className="font-bold text-slate-900 text-sm">{sede.nombre}</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 shrink-0">
                  C{sede.comuna}
                </span>
              </div>
              <p className="text-xs text-slate-600">{sede.direccion} • {sede.barrio}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                <span>Tel: {sede.telefono}</span>
                <span className="font-semibold text-emerald-700">{sede.horarioApertura} - {sede.horarioCierre}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
