import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatearFechaColombiana, formatearHora12 } from "@/lib/pdf/comprobante";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;
  const db = getDb();

  const [cita] = await db
    .select({
      codigoCita: schema.citas.codigoCita,
      estado: schema.citas.estado,
      fechaCita: schema.citas.fechaCita,
      horaInicio: schema.citas.horaInicio,
      especialidad: schema.especialidades.nombre,
      medicoNombres: schema.medicos.nombres,
      medicoApellidos: schema.medicos.apellidos,
      sedeNombre: schema.sedesIps.nombre,
      sedeDireccion: schema.sedesIps.direccion,
      sedeBarrio: schema.sedesIps.barrio,
    })
    .from(schema.citas)
    .innerJoin(schema.especialidades, eq(schema.citas.especialidadId, schema.especialidades.id))
    .innerJoin(schema.medicos, eq(schema.citas.medicoId, schema.medicos.id))
    .innerJoin(schema.sedesIps, eq(schema.citas.sedeId, schema.sedesIps.id))
    .where(eq(schema.citas.codigoCita, codigo));

  // Si se solicita formato JSON (para clientes de API o aplicaciones móviles)
  const aceptaJson = req.headers.get("accept")?.includes("application/json");

  if (!cita) {
    if (aceptaJson) {
      return NextResponse.json({ valida: false, mensaje: "Cita no encontrada en el sistema" }, { status: 404 });
    }
    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="utf-8"><title>Verificación de Cita - EPS TRIADIX</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc;">
        <h2 style="color: #dc2626;">Código de Cita No Válido</h2>
        <p>No se encontró ningún registro para el radicado ${codigo}.</p>
      </body>
      </html>
    `, { headers: { "Content-Type": "text/html" }, status: 404 });
  }

  const fechaCol = formatearFechaColombiana(cita.fechaCita);
  const horaCol = formatearHora12(cita.horaInicio);

  if (aceptaJson) {
    return NextResponse.json({
      valida: true,
      radicado: cita.codigoCita,
      estado: cita.estado,
      especialidad: cita.especialidad,
      profesional: `Dr. ${cita.medicoNombres} ${cita.medicoApellidos}`,
      sede: `${cita.sedeNombre} (${cita.sedeDireccion})`,
      fecha: fechaCol,
      hora: horaCol,
    });
  }

  // Página web pública responsiva de validación del QR
  return new NextResponse(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Verificación de Cita Oficial - EPS TRIADIX Cali</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; display: flex; justify-content: center; }
        .card { background: white; max-width: 460px; width: 100%; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; padding: 32px; box-sizing: border-box; text-align: center; }
        .badge-ok { display: inline-flex; align-items: center; gap: 6px; background: #ecfdf5; color: #047857; font-weight: 800; font-size: 13px; padding: 6px 16px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 16px; }
        .radicado { font-size: 24px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px; margin: 0 0 16px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; text-align: left; }
        .info-label { color: #64748b; font-weight: 600; }
        .info-value { color: #0f172a; font-weight: 700; text-align: right; }
        .actions { margin-top: 24px; display: flex; gap: 10px; }
        .btn { flex: 1; padding: 12px; border-radius: 12px; font-weight: bold; font-size: 13px; text-decoration: none; text-align: center; }
        .btn-pdf { background: #1e40af; color: white; }
        .btn-ics { background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; }
        .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge-ok">✓ CITA MÉDICA VÁLIDA Y AUTÉNTICA</div>
        <div class="radicado">${cita.codigoCita}</div>
        
        <div class="info-row">
          <span class="info-label">Especialidad:</span>
          <span class="info-value">${cita.especialidad}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha:</span>
          <span class="info-value">${fechaCol}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Hora:</span>
          <span class="info-value">${horaCol}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Profesional:</span>
          <span class="info-value">Dr. ${cita.medicoNombres} ${cita.medicoApellidos}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sede en Cali:</span>
          <span class="info-value">${cita.sedeNombre}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dirección:</span>
          <span class="info-value">${cita.sedeDireccion}</span>
        </div>

        <div class="actions">
          <a href="/api/citas/${cita.codigoCita}/pdf" class="btn btn-pdf">Descargar PDF</a>
          <a href="/api/citas/${cita.codigoCita}/calendario.ics" class="btn btn-ics">Agregar Calendario</a>
        </div>

        <div class="footer">
          EPS TRIADIX Cali • Certificado de Verificación Pública sin exposición de datos sensibles (Ley 1581 de 2012).
        </div>
      </div>
    </body>
    </html>
  `, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

