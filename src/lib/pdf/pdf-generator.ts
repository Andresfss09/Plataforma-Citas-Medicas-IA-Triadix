import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { ComprobanteCitaData, formatearFechaColombiana, formatearHora12 } from "./comprobante";

/**
 * Enmascara un número de documento para cumplir la Ley 1581 de 2012 (ej. 1100007919 -> 11****7919)
 */
export function enmascararDocumento(doc: string): string {
  if (!doc || doc.length <= 4) return doc || "****";
  const inicio = doc.slice(0, 2);
  const fin = doc.slice(-4);
  return `${inicio}****${fin}`;
}

/**
 * Genera un archivo binario PDF real oficial de EPS TRIADIX con código QR incrustado
 */
export async function generarPdfBinarioComprobante(
  data: ComprobanteCitaData,
  urlBase: string = "http://localhost:3000"
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 estándar
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0.12, 0.23, 0.54); // Azul TRIADIX (#1e3a8a)
  const secondaryColor = rgb(0.2, 0.4, 0.8);
  const textColor = rgb(0.06, 0.09, 0.16); // Slate 900
  const grayColor = rgb(0.4, 0.45, 0.55);

  // 1. Membrete oficial
  page.drawText("EPS TRIADIX S.A.S.", {
    x: 50,
    y: height - 55,
    size: 20,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText("CitaVoz • Asistente Oficial de Agendamiento en Cali", {
    x: 50,
    y: height - 72,
    size: 10,
    font: fontRegular,
    color: grayColor,
  });

  page.drawText("NIT: 901.845.120-4 • Vigilado Supersalud", {
    x: 50,
    y: height - 85,
    size: 9,
    font: fontRegular,
    color: grayColor,
  });

  // Línea divisoria superior
  page.drawLine({
    start: { x: 50, y: height - 98 },
    end: { x: width - 50, y: height - 98 },
    thickness: 2,
    color: primaryColor,
  });

  // 2. Título y Código Radicado
  page.drawText("COMPROBANTE OFICIAL DE CITA MÉDICA", {
    x: 50,
    y: height - 125,
    size: 13,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText(`RADICADO: ${data.codigoCita}`, {
    x: width - 230,
    y: height - 125,
    size: 12,
    font: fontBold,
    color: rgb(0.02, 0.47, 0.34), // Verde esmeralda
  });

  // 3. Generar e incrustar Código QR de verificación pública
  const urlVerificacion = `${urlBase}/api/citas/verificar/${data.codigoCita}`;
  const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
    margin: 1,
    width: 150,
    color: {
      dark: "#1e3a8a",
      light: "#ffffff",
    },
  });
  const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // Dibujar QR en el lateral
  page.drawImage(qrImage, {
    x: width - 170,
    y: height - 290,
    width: 120,
    height: 120,
  });

  page.drawText("Escanee para verificar validez", {
    x: width - 178,
    y: height - 302,
    size: 8,
    font: fontRegular,
    color: grayColor,
  });

  // 4. Datos del Afiliado (con documento enmascarado Ley 1581)
  let yPos = height - 160;
  const docEnmascarado = enmascararDocumento(data.afiliadoDocumento);

  page.drawText("DATOS DEL AFILIADO:", { x: 50, y: yPos, size: 10, font: fontBold, color: grayColor });
  yPos -= 18;
  page.drawText(data.afiliadoNombre, { x: 50, y: yPos, size: 14, font: fontBold, color: textColor });
  yPos -= 16;
  page.drawText(`Documento: ${data.afiliadoTipoDoc} ${docEnmascarado}`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });
  yPos -= 14;
  page.drawText(`Régimen: ${data.afiliadoRegimen}   |   Categoría: ${data.afiliadoCategoria}`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });

  // 5. Datos de la Cita Médica
  yPos -= 32;
  page.drawText("INFORMACIÓN DE LA CITA:", { x: 50, y: yPos, size: 10, font: fontBold, color: grayColor });
  yPos -= 18;
  page.drawText(data.especialidadNombre, { x: 50, y: yPos, size: 14, font: fontBold, color: secondaryColor });
  yPos -= 16;
  const fechaCol = formatearFechaColombiana(data.fechaCita);
  const horaCol = formatearHora12(data.horaInicio);
  page.drawText(`Fecha y Hora: ${fechaCol} a las ${horaCol}`, { x: 50, y: yPos, size: 12, font: fontBold, color: rgb(0.02, 0.47, 0.34) });
  yPos -= 16;
  page.drawText(`Profesional: ${data.medicoNombre} (${data.registroRethus})`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });

  // 6. Datos de la Sede en Cali
  yPos -= 32;
  page.drawText("LUGAR DE ATENCIÓN EN CALI:", { x: 50, y: yPos, size: 10, font: fontBold, color: grayColor });
  yPos -= 18;
  page.drawText(data.sedeNombre, { x: 50, y: yPos, size: 12, font: fontBold, color: textColor });
  yPos -= 15;
  page.drawText(`Dirección: ${data.sedeDireccion} • Barrio ${data.sedeBarrio}`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });
  yPos -= 14;
  page.drawText(`Línea de Atención Cali: ${data.sedeTelefono}`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });

  // 7. Caja de Indicaciones y Preparación
  yPos -= 38;
  page.drawRectangle({
    x: 50,
    y: yPos - 90,
    width: width - 100,
    height: 100,
    color: rgb(0.99, 0.98, 0.93), // Fondo crema/amarillo
    borderColor: rgb(0.96, 0.62, 0.04),
    borderWidth: 1,
  });

  page.drawText("INDICACIONES PREVIAS Y PREPARACIÓN OBLIGATORIA:", {
    x: 65,
    y: yPos - 12,
    size: 10,
    font: fontBold,
    color: rgb(0.57, 0.25, 0.05),
  });

  const indicaciones = [
    "• Llegar con 20 minutos de anticipación para el trámite de taquilla y verificación de derechos.",
    "• Presentar documento de identidad original en físico en la entrada de la sede.",
    "• Si la cita es con especialista, recuerde llevar su orden médica / remisión vigente.",
    "• Si requiere análisis de laboratorio en ayunas, no consuma alimentos 8 horas antes.",
    "• Si no puede asistir, cancele al menos 2 horas antes por voz o web para liberar el cupo.",
  ];

  let indY = yPos - 28;
  for (const ind of indicaciones) {
    page.drawText(ind, { x: 65, y: indY, size: 8.5, font: fontRegular, color: rgb(0.47, 0.21, 0.06) });
    indY -= 13;
  }

  // 8. Leyenda de Habeas Data y Marco Legal
  yPos = yPos - 130;
  page.drawText("POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES (HABEAS DATA - LEY 1581 DE 2012):", {
    x: 50,
    y: yPos,
    size: 8,
    font: fontBold,
    color: grayColor,
  });

  yPos -= 12;
  const textoLegal = "EPS TRIADIX garantiza la confidencialidad y protección de los datos de salud del afiliado conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Este comprobante no constituye una fórmula médica ni diagnóstico clínico.";
  page.drawText(textoLegal, {
    x: 50,
    y: yPos,
    size: 7.5,
    font: fontRegular,
    color: grayColor,
  });

  // Pie de página
  page.drawLine({
    start: { x: 50, y: 45 },
    end: { x: width - 50, y: 45 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  page.drawText("Documento emitido electrónicamente por CitaVoz EPS • Santiago de Cali, Valle del Cauca", {
    x: 130,
    y: 30,
    size: 8,
    font: fontRegular,
    color: grayColor,
  });

  return await pdfDoc.save();
}

