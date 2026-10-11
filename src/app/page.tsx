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
        
        {/* Banner Institucional EPS TRIADIX */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-slate-800">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 bg-teal-950/80 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-300 border border-teal-800/60">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Canal Virtual Oficial de Asignación de Citas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Orientación y Agendamiento Asistido por Voz
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
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
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Red Asistencial Propia — Sedes EPS TRIADIX en Santiago de Cali
              </h2>
              <p className="text-xs text-slate-500">Puntos de atención ambulatoria habilitados por la Secretaría de Salud</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
              {sedesList.length} Sedes Disponibles
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedesList.slice(0, 6).map((sede: any) => (
              <div
                key={sede.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-600/60 hover:shadow-xs transition space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm group-hover:text-teal-900 transition">
                    {sede.nombre}
                  </h3>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    Comuna {sede.comuna}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {sede.direccion} • Barrio {sede.barrio}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Conmutador: {sede.telefono}</span>
                  <span className="font-medium text-teal-800">
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
