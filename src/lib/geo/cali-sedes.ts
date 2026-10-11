/**
 * Geolocalización y Optimización de Sedes EPS TRIADIX en Santiago de Cali.
 * Contiene coordenadas geográficas reales de las comunas y sedes de Cali,
 * cálculo de distancias geodésicas y sugerencia de agrupación de citas.
 */

export interface SedeGeo {
  id: string;
  nombre: string;
  direccion: string;
  barrio: string;
  comuna: number;
  zona: string;
  lat: number;
  lng: number;
}

export const SEDES_CALI_GEO: SedeGeo[] = [
  { id: "sede-tequendama", nombre: "Sede Principal Tequendama", direccion: "Calle 5 # 42-25", barrio: "Tequendama", comuna: 19, zona: "Sur", lat: 3.4283, lng: -76.5458 },
  { id: "sede-versalles", nombre: "Sede Versalles", direccion: "Avenida 5A Norte # 21N-40", barrio: "Versalles", comuna: 2, zona: "Norte", lat: 3.4658, lng: -76.5292 },
  { id: "sede-pasoancho", nombre: "Sede Pasoancho", direccion: "Calle 13 # 66-50", barrio: "Pasoancho", comuna: 17, zona: "Sur", lat: 3.3986, lng: -76.5381 },
  { id: "sede-sanfernando", nombre: "Sede Pediátrica San Fernando", direccion: "Carrera 36 # 4B-10", barrio: "San Fernando", comuna: 3, zona: "Centro", lat: 3.4328, lng: -76.5411 },
  { id: "sede-eldiamante", nombre: "Sede El Diamante", direccion: "Carrera 28D # 42-15", barrio: "El Diamante", comuna: 13, zona: "Oriente", lat: 3.4211, lng: -76.5028 },
  { id: "sede-salomia", nombre: "Sede Salomia", direccion: "Carrera 1 # 46-20", barrio: "Salomia", comuna: 5, zona: "Norte", lat: 3.4725, lng: -76.5089 },
  { id: "sede-elguabal", nombre: "Sede El Guabal", direccion: "Calle 14A # 40A-05", barrio: "El Guabal", comuna: 10, zona: "Sur", lat: 3.4158, lng: -76.5319 },
  { id: "sede-ciudadcordoba", nombre: "Sede Ciudad Córdoba", direccion: "Calle 50 # 42B-18", barrio: "Ciudad Córdoba", comuna: 15, zona: "Oriente", lat: 3.4022, lng: -76.5056 },
  { id: "sede-ciudadjardin", nombre: "Sede Especializada Ciudad Jardín", direccion: "Avenida San Joaquín # 14-80", barrio: "Ciudad Jardín", comuna: 22, zona: "Sur", lat: 3.3644, lng: -76.5369 },
  { id: "sede-aguacatal", nombre: "Sede Aguacatal", direccion: "Avenida 9 Oeste # 12-30", barrio: "Aguacatal", comuna: 1, zona: "Oeste", lat: 3.4542, lng: -76.5583 },
];

/**
 * Fórmula de Haversine para calcular distancia en kilómetros entre dos coordenadas
 */
export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Retorna las sedes ordenadas por proximidad a un barrio, comuna o zona de Cali
 */
export function obtenerSedesOrdenadasPorCercania(criterioUsuario: string): SedeGeo[] {
  const crit = criterioUsuario.toLowerCase().trim();

  // Buscar coincidencia exacta por nombre de barrio o comuna
  const sedeDirecta = SEDES_CALI_GEO.find(
    (s) => crit.includes(s.barrio.toLowerCase()) || crit.includes(`comuna ${s.comuna}`) || crit.includes(`c${s.comuna}`)
  );

  if (sedeDirecta) {
    // Ordenar todas las sedes según su distancia a esta sede de referencia
    return [...SEDES_CALI_GEO].sort((a, b) => {
      const distA = calcularDistanciaKm(sedeDirecta.lat, sedeDirecta.lng, a.lat, a.lng);
      const distB = calcularDistanciaKm(sedeDirecta.lat, sedeDirecta.lng, b.lat, b.lng);
      return distA - distB;
    });
  }

  // Si el usuario especificó zona geográfica (Norte, Sur, Oriente, Oeste)
  if (crit.includes("sur")) {
    return [...SEDES_CALI_GEO].sort((a, b) => (a.zona === "Sur" ? -1 : 1));
  }
  if (crit.includes("norte")) {
    return [...SEDES_CALI_GEO].sort((a, b) => (a.zona === "Norte" ? -1 : 1));
  }
  if (crit.includes("oriente")) {
    return [...SEDES_CALI_GEO].sort((a, b) => (a.zona === "Oriente" ? -1 : 1));
  }
  if (crit.includes("oeste")) {
    return [...SEDES_CALI_GEO].sort((a, b) => (a.zona === "Oeste" ? -1 : 1));
  }

  return SEDES_CALI_GEO;
}

/**
 * Algoritmo de sugerencia de agrupación:
 * Evalúa si el usuario ya tiene una cita ese día para sugerir agendar la nueva cita
 * en la misma sede con una separación ideal de 60 a 90 minutos para evitar doble desplazamiento.
 */
export function sugerirAgrupacionCitaMismoDia(
  citaExistente: { sedeId: string; sedeNombre: string; fecha: string; horaFin: string },
  franjasDisponibles: Array<{ slotId: string; sedeId: string; fecha: string; horaInicio: string }>
): { slotSugerido?: any; mensajeSugerencia?: string } {
  const coincidente = franjasDisponibles.find(
    (f) => f.sedeId === citaExistente.sedeId && f.fecha === citaExistente.fecha && f.horaInicio > citaExistente.horaFin
  );

  if (coincidente) {
    return {
      slotSugerido: coincidente,
      mensajeSugerencia: `Noto que ya tiene una cita el ${citaExistente.fecha} en la ${citaExistente.sedeNombre}. Le sugiero agendar esta segunda cita a las ${coincidente.horaInicio} en la misma sede para que aproveche una sola salida.`,
    };
  }

  return {};
}

