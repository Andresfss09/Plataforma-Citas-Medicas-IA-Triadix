import { ComprobanteCitaData } from "../pdf/comprobante";

/**
 * Genera el contenido de un archivo .ics conforme al estándar RFC 5545 (iCalendar)
 * para agregar la cita a Google Calendar, Apple Calendar o Microsoft Outlook.
 */
export function generarArchivoIcs(data: ComprobanteCitaData): string {
  // Construir marcas temporales ISO en UTC a partir de la fecha y hora de Cali (UTC-5)
  const [año, mes, dia] = data.fechaCita.split("-");
  const [horaIni, minIni] = data.horaInicio.split(":");
  const [horaFin, minFin] = data.horaFin.split(":");

  // Cali está en UTC-5, sumamos 5 horas para la representación UTC en .ics
  const dInicioUtc = new Date(Date.UTC(parseInt(año), parseInt(mes) - 1, parseInt(dia), parseInt(horaIni) + 5, parseInt(minIni)));
  const dFinUtc = new Date(Date.UTC(parseInt(año), parseInt(mes) - 1, parseInt(dia), parseInt(horaFin) + 5, parseInt(minFin)));

  const formatearFechaIcs = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const dtStart = formatearFechaIcs(dInicioUtc);
  const dtEnd = formatearFechaIcs(dFinUtc);
  const dtStamp = formatearFechaIcs(new Date());

  const summary = `Cita Médica: ${data.especialidadNombre} - EPS TRIADIX`;
  const location = `${data.sedeNombre}, ${data.sedeDireccion}, Cali, Colombia`;
  const description = `Cita médica de ${data.especialidadNombre} con el profesional ${data.medicoNombre} (${data.registroRethus}).\\n\\nCódigo Radicado: ${data.codigoCita}\\nAfiliado: ${data.afiliadoNombre}\\n\\nRecuerde presentarse 20 minutos antes con su documento de identidad.`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EPS TRIADIX//CitaVoz Cali//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:cita-${data.codigoCita}@triadix.test`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de Cita Médica EPS TRIADIX mañana",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de Cita Médica EPS TRIADIX en 2 horas",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

