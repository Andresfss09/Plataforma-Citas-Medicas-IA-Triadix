/**
 * Normalizador Fonético del Español Colombiano y Jerga Caleña.
 * Convierte dictados de números hablados dígito a dígito o por bloques a números arábigos,
 * y limpia expresiones coloquiales típicas de Cali y el Valle del Cauca.
 */

const MAPA_DIGITOS_TEXTO: Record<string, string> = {
  cero: "0",
  uno: "1",
  una: "1",
  un: "1",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
  nueve: "9",
};

const MAPA_NUMEROS_COMPUESTOS: Record<string, string> = {
  diez: "10",
  once: "11",
  doce: "12",
  trece: "13",
  catorce: "14",
  quince: "15",
  dieciseis: "16",
  diecisiete: "17",
  dieciocho: "18",
  diecinueve: "19",
  veinte: "20",
  veintiuno: "21",
  veintidos: "22",
  veintitres: "23",
  veinticuatro: "24",
  veinticinco: "25",
  veintiseis: "26",
  veintisiete: "27",
  veintiocho: "28",
  veintinueve: "29",
  treinta: "30",
  cuarenta: "40",
  cincuenta: "50",
  sesenta: "60",
  setenta: "70",
  ochenta: "80",
  noventa: "90",
};

/**
 * Normaliza y extrae un número de cédula dictado de forma hablada en español
 * Ejemplos soportados:
 * - "uno uno cuatro cuatro uno dos tres cuatro cinco seis" -> "1144123456"
 * - "once cuarenta y cuatro doce treinta y cuatro cincuenta y seis" -> "1144123456"
 * - "mi cédula es 1144123456" -> "1144123456"
 */
export function normalizarDocumentoHablado(texto: string): string | null {
  if (!texto) return null;

  // 1. Si ya contiene dígitos numéricos directos contiguos de 7 a 10 cifras
  const matchDirecto = texto.match(/\b\d{7,10}\b/);
  if (matchDirecto) {
    return matchDirecto[0];
  }

  // 2. Si contiene dígitos con espacios (ej. "1 1 4 4 1 2 3 4 5 6")
  const digitosSeparados = texto.replace(/[^\d\s]/g, "").trim().split(/\s+/);
  if (digitosSeparados.length >= 7 && digitosSeparados.every(d => d.length <= 2)) {
    const concatenado = digitosSeparados.join("");
    if (concatenado.length >= 7 && concatenado.length <= 10) {
      return concatenado;
    }
  }

  // 3. Normalizar palabras numéricas habladas en español
  const limpio = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,.-]/g, " ")
    .replace(/\by\b/g, " ");

  const palabras = limpio.split(/\s+/);
  const digitosExtraidos: string[] = [];

  for (const p of palabras) {
    if (MAPA_DIGITOS_TEXTO[p]) {
      digitosExtraidos.push(MAPA_DIGITOS_TEXTO[p]);
    } else if (MAPA_NUMEROS_COMPUESTOS[p]) {
      digitosExtraidos.push(MAPA_NUMEROS_COMPUESTOS[p]);
    } else if (/^\d+$/.test(p)) {
      digitosExtraidos.push(p);
    }
  }

  const resultadoConcatenado = digitosExtraidos.join("");
  if (resultadoConcatenado.length >= 7 && resultadoConcatenado.length <= 10) {
    return resultadoConcatenado;
  }

  return null;
}

/**
 * Limpia modismos, muletillas y expresiones de cortesía caleñas/vallecaucanas
 * para facilitar la interpretación de intenciones por el LLM.
 */
export function limpiarModismosCalenos(texto: string): string {
  if (!texto) return "";

  return texto
    .replace(/\b(veni|mira|ois|ve|mirave|haceme el favor|porfa|por fa)\b/gi, "")
    .replace(/\b(hagale|de una|panita|parce|mi reina|mi rey|doctorcita)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

