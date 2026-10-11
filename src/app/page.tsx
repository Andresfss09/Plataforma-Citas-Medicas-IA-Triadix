import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { VoiceAppointmentWidget } from "@/components/voice/VoiceAppointmentWidget";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();

  // Consultar sedes y especialidades en la base de datos de Neon
  const sedesList = await db.select().from(schema.sedesIps);
  const especialidadesList = await db.select().from(schema.especialidades);
  const medicosList = await db.select().from(schema.medicos);

  return (
    <AuthGuard>
      <div className="space-y-8 max-w-6xl mx-auto">
        
        {/* Banner Institucional EPS TRIADIX - Sólido, elegante y con textos perfectamente nítidos */}
        <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 bg-teal-950 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-teal-300 border border-teal-700/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Canal Virtual Oficial de Asignación de Citas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Orientación y Agendamiento Asistido por Voz
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed max-w-2xl font-normal">
              Hable con naturalidad o escriba su solicitud para consultar franjas disponibles, verificar médicos especialistas y obtener su comprobante oficial con código QR en la red de clínicas de Santiago de Cali.
            </p>
          </div>
        </section>

        {/* Módulo Principal de Voz y Consulta */}
        <section>
          <VoiceAppointmentWidget
            sedesCount={sedesList.length}
            medicosCount={medicosList.length}
            slotsCount={4000}
          />
        </section>

        {/* Directorio Oficial de Sedes IPS en Cali */}
        <section className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-950 tracking-tight">
                Red Asistencial Propia — Sedes EPS TRIADIX en Santiago de Cali
              </h2>
              <p className="text-xs text-slate-700 font-medium">Puntos de atención ambulatoria habilitados por la Secretaría de Salud</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-300 self-start sm:self-auto">
              {sedesList.length} Sedes Habilitadas
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedesList.slice(0, 6).map((sede: any) => (
              <div
                key={sede.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-700 hover:shadow-md transition space-y-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-950 text-sm group-hover:text-teal-900 transition">
                    {sede.nombre}
                  </h3>
                  <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                    Comuna {sede.comuna}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  {sede.direccion} • Barrio {sede.barrio}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                  <span>Conmutador: <strong className="text-slate-800">{sede.telefono}</strong></span>
                  <span className="font-bold text-teal-800">
                    {sede.horarioApertura.slice(0, 5)} - {sede.horarioCierre.slice(0, 5)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AuthGuard>
  );
}
