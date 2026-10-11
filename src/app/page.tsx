import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { decryptSensitiveData } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDb();

  // Consultar métricas de la base de datos de EPS TRIADIX
  const sedesList = await db.select().from(schema.sedes);
  const especialidadesList = await db.select().from(schema.especialidades);
  const medicosList = await db.select().from(schema.medicos);
  const pacientesList = await db.select().from(schema.pacientes);
  const slotsList = await db.select().from(schema.disponibilidadMedica);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner de Bienvenida Accesible */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-800/80 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200 border border-blue-700">
            <span>Fase 1: Infraestructura & Modelo Normativo Lista</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Asistente de Agendamiento por Voz <br className="hidden sm:inline" />
            <span className="text-blue-300">EPS TRIADIX Cali</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
            Plataforma inclusiva diseñada con altos estándares de accesibilidad para adultos mayores, protección estricta de datos personales de salud (Ley 1581) y detección inmediata de emergencias médicas vitales.
          </p>
        </div>
      </section>

      {/* Protocolo de Emergencias (123 Cali) */}
      <section className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm" role="alert">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-lg text-amber-900">
            <span className="text-2xl" aria-hidden="true">🚨</span>
            Protocolo de Triage y Urgencia Vital (Cali)
          </div>
          <p className="text-sm text-amber-800">
            CitaVoz interrumpe inmediatamente el agendamiento si detecta dolor torácico, asfixia o pérdida de conciencia, derivando de inmediato a la <strong>Línea 123</strong> de Cali y clínicas de urgencia de EPS TRIADIX.
          </p>
        </div>
        <a
          href="tel:123"
          className="shrink-0 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-red-700 transition focus:ring-4 focus:ring-red-400"
        >
          Llamar al 123
        </a>
      </section>

      {/* Resumen de Infraestructura y Datos de Cali */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-3xl font-black text-blue-800 block">{sedesList.length}</span>
          <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Sedes en Cali</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-3xl font-black text-blue-800 block">{especialidadesList.length}</span>
          <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Especialidades</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-3xl font-black text-blue-800 block">{medicosList.length}</span>
          <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Médicos Adscritos</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <span className="text-3xl font-black text-emerald-700 block">{slotsList.length}</span>
          <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Franjas Disponibles</span>
        </div>
      </section>

      {/* Sedes de EPS TRIADIX en Cali */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>📍</span> Sedes de Atención en Cali
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {sedesList.map((sede: any) => (
            <div key={sede.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition">
              <h3 className="font-bold text-slate-900">{sede.nombre}</h3>
              <p className="text-sm text-slate-600">{sede.direccion} • Barrio {sede.barrio}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Tel: {sede.telefono}</span>
                <span className="text-emerald-700 font-semibold">Abierto: {sede.horarioApertura} - {sede.horarioCierre}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pacientes Ficticios para Pruebas (Habeas Data) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>🔐</span> Pacientes Sintéticos (Cifrado AES-256-GCM / Ley 1581)
          </h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">
            Solo para pruebas
          </span>
        </div>
        <p className="text-sm text-slate-600">
          En cumplimiento del Decreto 1377 de 2013 y Ley 1581, ningún dato sensible se guarda en texto plano. Los pacientes cuentan con hash de búsqueda y payload cifrado.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Habeas Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pacientesList.map((p: any) => {
                const nombre = decryptSensitiveData(p.nombresEnc);
                const apellido = decryptSensitiveData(p.apellidosEnc);
                const doc = decryptSensitiveData(p.numeroDocumentoEnc);
                const tel = decryptSensitiveData(p.telefonoEnc);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-900">{p.tipoDocumento} {doc}</td>
                    <td className="py-3 px-4 font-medium">{nombre} {apellido}</td>
                    <td className="py-3 px-4 text-slate-600">{tel}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        Consentimiento Aceptado
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

