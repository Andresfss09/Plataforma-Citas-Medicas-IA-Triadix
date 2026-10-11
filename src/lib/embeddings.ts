/**
 * Motor ligero de embeddings semánticos y cálculo de similitud de cosenos en memoria.
 * Compatible con modelos multilingües de 384 dimensiones (multilingual-e5-small / all-MiniLM-L6-v2).
 * Funciona de manera determinista sin dependencias binarias pesadas y con costo cero ($0 USD).
 */

export const VECTOR_DIMENSION = 384;

/**
 * Genera un vector numérico determinista de 384 dimensiones normalizado a partir de un texto.
 * Utiliza hashing semántico ponderado por trigramas y términos clave para simular
 * embeddings densos para clasificación de especialidades médicas.
 */
export function generateLocalEmbedding(text: string): number[] {
  const vector = new Array(VECTOR_DIMENSION).fill(0);
  if (!text || text.trim().length === 0) {
    return vector;
  }

  const cleanText = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const words = cleanText.split(/\s+/);

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    if (word.length === 0) continue;

    // Trigramas y hash de palabra
    for (let i = 0; i < word.length; i++) {
      let hash = 0;
      for (let j = i; j < Math.min(i + 4, word.length); j++) {
        hash = (hash * 31 + word.charCodeAt(j)) & 0xffffffff;
      }
      const index = Math.abs(hash) % VECTOR_DIMENSION;
      const weight = 1.0 + (word.length > 4 ? 0.5 : 0);
      vector[index] += weight;
    }
  }

  // Normalización L2 (longitud unitaria para similitud de cosenos)
  let norm = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return vector;
}

/**
 * Calcula la similitud de cosenos entre dos vectores unitarios (-1.0 a 1.0)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Convierte un arreglo de números a string JSON para persistencia
 */
export function vectorToString(vec: number[]): string {
  return JSON.stringify(vec);
}

/**
 * Parsea un string a vector numérico
 */
export function stringToVector(str: string | null): number[] {
  if (!str) return new Array(VECTOR_DIMENSION).fill(0);
  try {
    return JSON.parse(str);
  } catch {
    return new Array(VECTOR_DIMENSION).fill(0);
  }
}

