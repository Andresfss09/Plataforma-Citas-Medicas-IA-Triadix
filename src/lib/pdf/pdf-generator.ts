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

  const primaryColor = rgb(0.09, 0.13, 0.2); // Carbón institucional elegante (#172133)
  const textColor = rgb(0.09, 0.13, 0.2);    // Texto principal oscuro
  const mutedColor = rgb(0.38, 0.44, 0.52);  // Gris formal para etiquetas
  const lineBorderColor = rgb(0.8, 0.84, 0.89); // Bordes y líneas tenues
  const boxBgColor = rgb(0.97, 0.98, 0.99);     // Fondo suave para avisos

  // 1. Membrete oficial
  page.drawText("EPS TRIADIX S.A.S.", {
    x: 50,
    y: height - 55,
    size: 18,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText("Sistema General de Seguridad Social en Salud (SGSSS) • NIT 901.845.120-4", {
    x: 50,
    y: height - 72,
    size: 9.5,
    font: fontRegular,
    color: mutedColor,
  });

  page.drawText("Red Prestadora Santiago de Cali • Vigilado Supersalud", {
    x: 50,
    y: height - 85,
    size: 9,
    font: fontRegular,
    color: mutedColor,
  });

  // Línea divisoria superior institucional
  page.drawLine({
    start: { x: 50, y: height - 98 },
    end: { x: width - 50, y: height - 98 },
    thickness: 1.5,
    color: primaryColor,
  });

  // 2. Título y Código Radicado
  page.drawText("COMPROBANTE OFICIAL DE CITA MÉDICA", {
    x: 50,
    y: height - 122,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText(`RADICADO: ${data.codigoCita}`, {
    x: width - 230,
    y: height - 122,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });

  // 3. Generar e incrustar Código QR sobrio (negro estándar de alta definición)
  const urlVerificacion = `${urlBase}/api/citas/verificar/${data.codigoCita}`;
  const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
    margin: 1,
    width: 140,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
  const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  page.drawImage(qrImage, {
    x: width - 165,
    y: height - 280,
    width: 115,
    height: 115,
  });

  page.drawText("Verificación Electrónica QR", {
    x: width - 160,
    y: height - 293,
    size: 8,
    font: fontRegular,
    color: mutedColor,
  });

  // 4. Datos del Paciente / Afiliado
  let yPos = height - 155;
  const docEnmascarado = enmascararDocumento(data.afiliadoDocumento);

  page.drawText("DATOS DEL AFILIADO:", { x: 50, y: yPos, size: 9, font: fontBold, color: mutedColor });
  yPos -= 17;
  page.drawText(data.afiliadoNombre, { x: 50, y: yPos, size: 13, font: fontBold, color: textColor });
  yPos -= 15;
  page.drawText(`Documento: ${data.afiliadoTipoDoc} ${docEnmascarado}`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });
  yPos -= 14;
  page.drawText(`Régimen: ${data.afiliadoRegimen}   |   Categoría: ${data.afiliadoCategoria}`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });

  // 5. Datos de la Consulta Médica
  yPos -= 28;
  page.drawText("INFORMACIÓN DE LA CONSULTA:", { x: 50, y: yPos, size: 9, font: fontBold, color: mutedColor });
  yPos -= 17;
  page.drawText(data.especialidadNombre, { x: 50, y: yPos, size: 13, font: fontBold, color: primaryColor });
  yPos -= 15;
  const fechaCol = formatearFechaColombiana(data.fechaCita);
  const horaCol = formatearHora12(data.horaInicio);
  page.drawText(`Fecha y Hora: ${fechaCol} a las ${horaCol}`, { x: 50, y: yPos, size: 11, font: fontBold, color: textColor });
  yPos -= 15;
  page.drawText(`Duración estimada: 25 minutos por paciente`, { x: 50, y: yPos, size: 9.5, font: fontRegular, color: mutedColor });
  yPos -= 15;
  page.drawText(`Profesional Asignado: ${data.medicoNombre} (${data.registroRethus})`, { x: 50, y: yPos, size: 10, font: fontRegular, color: textColor });

  // 6. Datos de la Sede en Cali
  yPos -= 28;
  page.drawText("LUGAR DE ATENCIÓN (SANTIAGO DE CALI):", { x: 50, y: yPos, size: 9, font: fontBold, color: mutedColor });
  yPos -= 17;
  page.drawText(data.sedeNombre, { x: 50, y: yPos, size: 11.5, font: fontBold, color: textColor });
  yPos -= 14;
  page.drawText(`Dirección: ${data.sedeDireccion} • Barrio ${data.sedeBarrio}`, { x: 50, y: yPos, size: 9.5, font: fontRegular, color: textColor });
  yPos -= 14;
  page.drawText(`Línea Directa Cali: ${data.sedeTelefono}`, { x: 50, y: yPos, size: 9.5, font: fontRegular, color: textColor });

  // 7. Caja de Indicaciones y Preparación - Sobria, elegante en tonos neutros
  yPos -= 32;
  page.drawRectangle({
    x: 50,
    y: yPos - 92,
    width: width - 100,
    height: 98,
    color: boxBgColor,
    borderColor: lineBorderColor,
    borderWidth: 1,
  });

  page.drawText("INDICACIONES PREVIAS Y PREPARACIÓN DEL PACIENTE:", {
    x: 65,
    y: yPos - 12,
    size: 9.5,
    font: fontBold,
    color: primaryColor,
  });

  const indicaciones = [
    "• Duración de la consulta médica: aproximadamente 25 minutos por paciente.",
    "• Llegar con 20 minutos de anticipación para verificación de derechos en taquilla.",
    "• Presentar documento de identidad original en físico en la recepción de la sede.",
    "• Si la cita es de especialista o control, presente su orden médica o remisión vigente.",
    "• Para cancelar o reprogramar, hágalo al menos con 2 horas de anticipación por este canal.",
  ];

  let indY = yPos - 27;
  for (const ind of indicaciones) {
    page.drawText(ind, { x: 65, y: indY, size: 8.5, font: fontRegular, color: textColor });
    indY -= 13;
  }

  // 8. Leyenda de Habeas Data y Marco Legal
  yPos = yPos - 124;
  page.drawText("POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES (LEY 1581 DE 2012 / DECRETO 1377):", {
    x: 50,
    y: yPos,
    size: 7.5,
    font: fontBold,
    color: mutedColor,
  });

  yPos -= 11;
  const textoLegal = "EPS TRIADIX garantiza la confidencialidad y reserva de la historia clínica conforme a la Resolución 1995 de 1999 y Ley 1581 de 2012. Este comprobante acredita la reserva horaria ambulatoria institucional.";
  page.drawText(textoLegal, {
    x: 50,
    y: yPos,
    size: 7,
    font: fontRegular,
    color: mutedColor,
  });

  // Pie de página
  page.drawLine({
    start: { x: 50, y: 40 },
    end: { x: width - 50, y: 40 },
    thickness: 1,
    color: lineBorderColor,
  });

  page.drawText("Documento emitido electrónicamente por CitaVoz EPS TRIADIX • Santiago de Cali, Valle del Cauca", {
    x: 120,
    y: 28,
    size: 8,
    font: fontRegular,
    color: mutedColor,
  });

  return await pdfDoc.save();
}

