import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { decryptSensitiveData } from "@/lib/crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formato = searchParams.get("formato") || "excel"; // 'excel' (CSV) o 'pdf'
    const anio = searchParams.get("anio");
    const mes = searchParams.get("mes");
    const dia = searchParams.get("dia");
    const sedeId = searchParams.get("sedeId");

    const db = getDb();

    // Consultar citas de la base de datos de Neon con relaciones completas
    const citasRaw = await db
      .select({
        id: schema.citas.id,
        codigoCita: schema.citas.codigoCita,
        fechaCita: schema.citas.fechaCita,
        horaInicio: schema.citas.horaInicio,
        horaFin: schema.citas.horaFin,
        estado: schema.citas.estado,
        canal: schema.citas.canal,
        motivoConsulta: schema.citas.motivoConsulta,
        createdAt: schema.citas.createdAt,
        afiliadoId: schema.afiliados.id,
        afiliadoDoc: schema.afiliados.numeroDocumento,
        afiliadoDocEnc: schema.afiliados.numeroDocumentoEnc,
        nombresEnc: schema.afiliados.nombresEnc,
        apellidosEnc: schema.afiliados.apellidosEnc,
        regimen: schema.afiliados.regimen,
        especialidad: schema.especialidades.nombre,
        codigoCups: schema.especialidades.codigoCups,
        sedeNombre: schema.sedesIps.nombre,
        sedeComuna: schema.sedesIps.comuna,
        sedeDireccion: schema.sedesIps.direccion,
        medicoNombres: schema.medicos.nombres,
        medicoApellidos: schema.medicos.apellidos,
        rethus: schema.medicos.registroMedicoRethus,
      })
      .from(schema.citas)
      .innerJoin(schema.afiliados, eq(schema.citas.afiliadoId, schema.afiliados.id))
      .innerJoin(schema.especialidades, eq(schema.citas.especialidadId, schema.especialidades.id))
      .innerJoin(schema.sedesIps, eq(schema.citas.sedeId, schema.sedesIps.id))
      .innerJoin(schema.medicos, eq(schema.citas.medicoId, schema.medicos.id))
      .orderBy(desc(schema.citas.fechaCita))
      .limit(500);

    // Mapear y desencriptar datos para el reporte
    let datos = citasRaw.map((c) => {
      let nom = "Afiliado";
      let ape = "";
      let doc = c.afiliadoDoc || "";

      try {
        nom = decryptSensitiveData(c.nombresEnc);
        ape = decryptSensitiveData(c.apellidosEnc);
        if (!doc && c.afiliadoDocEnc) doc = decryptSensitiveData(c.afiliadoDocEnc);
      } catch (err) {}

      return {
        ...c,
        pacienteNombre: `${nom} ${ape}`.trim(),
        pacienteDoc: doc,
        medicoNombre: `Dr. ${c.medicoNombres} ${c.medicoApellidos}`.trim(),
      };
    });

    // Aplicar filtros por fecha (año, mes, día) y sede
    if (anio) {
      datos = datos.filter((d) => d.fechaCita.startsWith(anio));
    }
    if (mes) {
      const mesPadded = mes.padStart(2, "0");
      datos = datos.filter((d) => {
        const parts = d.fechaCita.split("-");
        return parts[1] === mesPadded;
      });
    }
    if (dia) {
      const diaPadded = dia.padStart(2, "0");
      datos = datos.filter((d) => {
        const parts = d.fechaCita.split("-");
        return parts[2] === diaPadded;
      });
    }
    if (sedeId && sedeId !== "todas") {
      datos = datos.filter((d) => d.sedeNombre.toLowerCase().includes(sedeId.toLowerCase()));
    }

    const filtroTexto = [
      dia ? `Día ${dia}` : null,
      mes ? `Mes ${mes}` : null,
      anio ? `Año ${anio}` : "Histórico",
    ]
      .filter(Boolean)
      .join(" - ");

    // ==========================================
    // REPORTE EN EXCEL / CSV CON FORMATO UTF-8 BOM
    // ==========================================
    if (formato === "excel") {
      const encabezados = [
        "Código Cita",
        "Fecha Cita",
        "Hora Inicio",
        "Estado",
        "Canal",
        "Documento Paciente",
        "Nombre Paciente",
        "Régimen",
        "Especialidad",
        "Código CUPS",
        "Sede IPS (Cali)",
        "Comuna",
        "Médico Asignado",
        "Registro RETHUS",
        "Motivo Registrado",
      ];

      const filas = datos.map((d) => [
        `"${d.codigoCita}"`,
        `"${d.fechaCita}"`,
        `"${d.horaInicio}"`,
        `"${d.estado.toUpperCase()}"`,
        `"${d.canal.toUpperCase()}"`,
        `"${d.pacienteDoc}"`,
        `"${d.pacienteNombre}"`,
        `"${d.regimen}"`,
        `"${d.especialidad}"`,
        `"${d.codigoCups}"`,
        `"${d.sedeNombre}"`,
        `"Comuna ${d.sedeComuna}"`,
        `"${d.medicoNombre}"`,
        `"${d.rethus}"`,
        `"${(d.motivoConsulta || "Control ordinario").replace(/"/g, '""')}"`,
      ]);

      const csvContent = "\uFEFF" + [encabezados.join(";"), ...filas.map((f) => f.join(";"))].join("\r\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Reporte_Citas_EPS_TRIADIX_${anio || "General"}_${Date.now()}.csv"`,
        },
      });
    }

    // ==========================================
    // REPORTE EN PDF EJECUTIVO CON PDF-LIB
    // ==========================================
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 Horizontal (Landscape) para tabla de datos
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const primaryColor = rgb(0.06, 0.28, 0.32); // Teal corporativo
    const textDark = rgb(0.09, 0.13, 0.19);
    const grayText = rgb(0.4, 0.45, 0.5);

    // Cabecera institucional
    page.drawText("EPS TRIADIX S.A.S. • REPORTE OPERATIVO DE CITAS MÉDICAS", {
      x: 40,
      y: height - 45,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText(`Filtro Aplicado: ${filtroTexto} • Generado el: ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })} • Total Registros: ${datos.length}`, {
      x: 40,
      y: height - 60,
      size: 9,
      font: fontRegular,
      color: grayText,
    });

    page.drawLine({
      start: { x: 40, y: height - 70 },
      end: { x: width - 40, y: height - 70 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92),
    });

    // Encabezados de la tabla
    const yHeaders = height - 88;
    page.drawRectangle({
      x: 40,
      y: yHeaders - 4,
      width: width - 80,
      height: 18,
      color: rgb(0.95, 0.96, 0.98),
    });

    const cols = [
      { label: "CÓDIGO", x: 45 },
      { label: "FECHA / HORA", x: 140 },
      { label: "PACIENTE", x: 250 },
      { label: "DOCUMENTO", x: 410 },
      { label: "ESPECIALIDAD", x: 500 },
      { label: "SEDE (CALI)", x: 640 },
      { label: "ESTADO", x: 760 },
    ];

    cols.forEach((c) => {
      page.drawText(c.label, {
        x: c.x,
        y: yHeaders,
        size: 8,
        font: fontBold,
        color: textDark,
      });
    });

    // Filas de datos (máximo 22 en la primera página)
    let currentY = yHeaders - 20;
    const itemsToShow = datos.slice(0, 22);

    itemsToShow.forEach((item, idx) => {
      // Línea de fondo alternante
      if (idx % 2 === 0) {
        page.drawRectangle({
          x: 40,
          y: currentY - 3,
          width: width - 80,
          height: 16,
          color: rgb(0.98, 0.99, 1),
        });
      }

      page.drawText(item.codigoCita, { x: 45, y: currentY, size: 8, font: fontBold, color: textDark });
      page.drawText(`${item.fechaCita} ${item.horaInicio.slice(0, 5)}`, { x: 140, y: currentY, size: 8, font: fontRegular, color: textDark });
      page.drawText(item.pacienteNombre.slice(0, 24), { x: 250, y: currentY, size: 8, font: fontRegular, color: textDark });
      page.drawText(item.pacienteDoc, { x: 410, y: currentY, size: 8, font: fontRegular, color: textDark });
      page.drawText(item.especialidad.slice(0, 20), { x: 500, y: currentY, size: 8, font: fontRegular, color: textDark });
      page.drawText(item.sedeNombre.replace("Sede ", "").slice(0, 18), { x: 640, y: currentY, size: 8, font: fontRegular, color: textDark });
      page.drawText(item.estado.toUpperCase(), {
        x: 760,
        y: currentY,
        size: 8,
        font: fontBold,
        color: item.estado === "programada" ? rgb(0.05, 0.5, 0.3) : rgb(0.7, 0.2, 0.2),
      });

      currentY -= 18;
    });

    // Pie de página oficial
    page.drawText("EPS TRIADIX S.A.S. • NIT 901.845.120-4 • Reporte generado conforme a la Ley 1581 de 2012 y Circular 002 de Supersalud", {
      x: 40,
      y: 25,
      size: 8,
      font: fontRegular,
      color: grayText,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Reporte_Citas_EPS_TRIADIX_${anio || "General"}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error al exportar reporte:", error);
    return NextResponse.json({ exito: false, error: "Error interno al generar el reporte." }, { status: 500 });
  }
}

