import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptSensitiveData } from "@/lib/crypto";
import { generarPdfBinarioComprobante } from "@/lib/pdf/pdf-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;
  const db = getDb();

  const [cita] = await db
    .select({
      codigoCita: schema.citas.codigoCita,
      fechaCita: schema.citas.fechaCita,
      horaInicio: schema.citas.horaInicio,
      horaFin: schema.citas.horaFin,
      afiliadoNombres: schema.afiliados.nombresEnc,
      afiliadoApellidos: schema.afiliados.apellidosEnc,
      afiliadoDoc: schema.afiliados.numeroDocumentoEnc,
      afiliadoTipoDoc: schema.afiliados.tipoDocumento,
      afiliadoRegimen: schema.afiliados.regimen,
      afiliadoCat: schema.afiliados.categoria,
      especialidad: schema.especialidades.nombre,
      medicoNombres: schema.medicos.nombres,
      medicoApellidos: schema.medicos.apellidos,
      rethus: schema.medicos.registroMedicoRethus,
      sedeNombre: schema.sedesIps.nombre,
      sedeDireccion: schema.sedesIps.direccion,
      sedeBarrio: schema.sedesIps.barrio,
      sedeTelefono: schema.sedesIps.telefono,
    })
    .from(schema.citas)
    .innerJoin(schema.afiliados, eq(schema.citas.afiliadoId, schema.afiliados.id))
    .innerJoin(schema.especialidades, eq(schema.citas.especialidadId, schema.especialidades.id))
    .innerJoin(schema.medicos, eq(schema.citas.medicoId, schema.medicos.id))
    .innerJoin(schema.sedesIps, eq(schema.citas.sedeId, schema.sedesIps.id))
    .where(eq(schema.citas.codigoCita, codigo));

  if (!cita) {
    return new NextResponse("Cita médica no encontrada", { status: 404 });
  }

  const urlBase = req.nextUrl.origin || "http://localhost:3000";

  const pdfBytes = await generarPdfBinarioComprobante(
    {
      codigoCita: cita.codigoCita,
      afiliadoNombre: `${decryptSensitiveData(cita.afiliadoNombres)} ${decryptSensitiveData(cita.afiliadoApellidos)}`,
      afiliadoDocumento: decryptSensitiveData(cita.afiliadoDoc),
      afiliadoTipoDoc: cita.afiliadoTipoDoc,
      afiliadoRegimen: cita.afiliadoRegimen,
      afiliadoCategoria: cita.afiliadoCat,
      especialidadNombre: cita.especialidad,
      medicoNombre: `Dr. ${cita.medicoNombres} ${cita.medicoApellidos}`,
      registroRethus: cita.rethus,
      sedeNombre: cita.sedeNombre,
      sedeDireccion: cita.sedeDireccion,
      sedeBarrio: cita.sedeBarrio,
      sedeTelefono: cita.sedeTelefono,
      fechaCita: cita.fechaCita,
      horaInicio: cita.horaInicio,
      horaFin: cita.horaFin,
    },
    urlBase
  );

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comprobante-${cita.codigoCita}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

