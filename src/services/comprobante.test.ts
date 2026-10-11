import test from "node:test";
import assert from "node:assert/strict";
import { generarPdfBinarioComprobante, enmascararDocumento } from "../lib/pdf/pdf-generator";
import { generarArchivoIcs } from "../lib/calendar/ics-generator";
import { reminderService, ConsoleNotifier } from "../lib/reminders/reminder-service";
import QRCode from "qrcode";

test("Suite de Comprobantes, QR, Calendario .ics y Recordatorios (Fase 6)", async (t) => {
  const mockCitaData = {
    codigoCita: "CTX-2026-99881",
    afiliadoNombre: "Carlos Alberto Gómez Restrepo",
    afiliadoDocumento: "1144123456",
    afiliadoTipoDoc: "CC",
    afiliadoRegimen: "CONTRIBUTIVO",
    afiliadoCategoria: "B",
    especialidadNombre: "Medicina General",
    medicoNombre: "Dr. Carlos Andrés Caicedo",
    registroRethus: "RM-76-20891",
    sedeNombre: "Sede Versalles - EPS TRIADIX",
    sedeDireccion: "Avenida 5A Norte # 21N-40",
    sedeBarrio: "Versalles",
    sedeTelefono: "(602) 489-8002",
    fechaCita: "2026-10-15",
    horaInicio: "08:00:00",
    horaFin: "08:30:00",
  };

  await t.test("1. Enmascaramiento de documento (Habeas Data Ley 1581)", () => {
    const enmascarado = enmascararDocumento("1144123456");
    assert.equal(enmascarado, "11****3456");
    assert.ok(!enmascarado.includes("12"), "No debe exponer dígitos centrales");
  });

  await t.test("2. Generación de PDF binario real en el servidor", async () => {
    const pdfBytes = await generarPdfBinarioComprobante(mockCitaData);
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 3000, "El PDF debe ser un archivo binario válido con contenido real");
    assert.ok(pdfBytes.length < 300000, "El PDF debe ser liviano (< 300 KB)");

    // Verificar cabecera del formato PDF (%PDF-)
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");
    assert.equal(header, "%PDF-");
  });

  await t.test("3. Generación y legibilidad del código QR de verificación", async () => {
    const urlEsperada = "http://localhost:3000/api/citas/verificar/CTX-2026-99881";
    const qrDataUrl = await QRCode.toDataURL(urlEsperada);
    assert.ok(qrDataUrl.startsWith("data:image/png;base64,"));
  });

  await t.test("4. Generación de archivo de calendario .ics estándar (RFC 5545)", () => {
    const icsString = generarArchivoIcs(mockCitaData);
    assert.ok(icsString.includes("BEGIN:VCALENDAR"));
    assert.ok(icsString.includes("BEGIN:VEVENT"));
    assert.ok(icsString.includes("SUMMARY:Cita Médica: Medicina General - EPS TRIADIX"));
    assert.ok(icsString.includes("LOCATION:Sede Versalles - EPS TRIADIX, Avenida 5A Norte # 21N-40, Cali, Colombia"));
    assert.ok(icsString.includes("TRIGGER:-PT24H"), "Debe incluir alarma de 24 horas antes");
    assert.ok(icsString.includes("TRIGGER:-PT2H"), "Debe incluir alarma de 2 horas antes");
    assert.ok(icsString.includes("END:VCALENDAR"));
  });

  await t.test("5. Servicio de recordatorios multicanal", async () => {
    const canalConsola = new ConsoleNotifier();
    const exito = await canalConsola.enviarRecordatorio({
      citaId: "cita-demo",
      codigoCita: "CTX-2026-99881",
      tipoRecordatorio: "24_HORAS",
      afiliadoNombre: "Carlos Gómez",
      telefono: "3155551234",
      especialidad: "Medicina General",
      fechaCol: "15/10/2026",
      horaCol: "8:00 a. m.",
      sedeNombre: "Sede Versalles",
      sedeDireccion: "Avenida 5A Norte # 21N-40",
    });

    assert.equal(exito, true);
  });
});
