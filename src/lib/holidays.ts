/**
 * Calendario de festivos oficiales en Colombia (Ley Emiliani - Ley 51 de 1983).
 * Incluye festivos fijos y trasladados al lunes siguiente para los años 2026 y 2027.
 */

const FESTIVOS_COLOMBIA_2026: Set<string> = new Set([
  // 2026
  "2026-01-01", // Año Nuevo
  "2026-01-12", // Reyes Magos
  "2026-03-23", // San José
  "2026-04-02", // Jueves Santo
  "2026-04-03", // Viernes Santo
  "2026-05-01", // Día del Trabajo
  "2026-05-18", // Ascensión del Señor
  "2026-06-08", // Corpus Christi
  "2026-06-15", // Sagrado Corazón
  "2026-06-29", // San Pedro y San Pablo
  "2026-07-20", // Día de la Independencia
  "2026-08-07", // Batalla de Boyacá
  "2026-08-17", // La Asunción
  "2026-10-12", // Día de la Raza
  "2026-11-02", // Todos los Santos
  "2026-11-16", // Independencia de Cartagena
  "2026-12-08", // Inmaculada Concepción
  "2026-12-25", // Navidad
  // 2027
  "2027-01-01",
  "2027-01-11",
]);

/**
 * Verifica si una fecha dada en formato YYYY-MM-DD o Date es día no hábil en Colombia (Domingo o Festivo).
 */
export function esDiaNoHabilColombia(fecha: string | Date): boolean {
  const d = typeof fecha === "string" ? new Date(fecha + "T00:00:00-05:00") : fecha;
  // 0 = Domingo
  if (d.getDay() === 0) {
    return true;
  }
  const isoDate = d.toISOString().split("T")[0];
  return FESTIVOS_COLOMBIA_2026.has(isoDate);
}

/**
 * Retorna las próximas N fechas hábiles para agendamiento médico en Colombia.
 */
export function obtenerFechasHabilesProximas(diasASumar: number = 30, fechaInicio: Date = new Date()): string[] {
  const fechasHabiles: string[] = [];
  const cursor = new Date(fechaInicio);

  while (fechasHabiles.length < diasASumar) {
    cursor.setDate(cursor.getDate() + 1);
    if (!esDiaNoHabilColombia(cursor)) {
      fechasHabiles.push(cursor.toISOString().split("T")[0]);
    }
  }

  return fechasHabiles;
}

