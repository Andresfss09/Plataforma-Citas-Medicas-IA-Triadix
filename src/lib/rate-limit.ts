/**
 * Rate Limiter en memoria ligero con ventana deslizante (Token Bucket / Sliding Window).
 * Sin dependencias externas ni costo de infraestructura ($0 USD).
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs?: number; // Ventana de tiempo en milisegundos (por defecto 1 minuto)
  maxRequests?: number; // Máximo de peticiones permitidas en la ventana
}

/**
 * Valida si un identificador (IP o token de sesión) excede el límite de peticiones.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetInMs: number } {
  const windowMs = options.windowMs || 60 * 1000; // 1 minuto
  const maxRequests = options.maxRequests || 30; // 30 req / minuto

  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || now > record.resetTime) {
    memoryStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInMs: windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: record.resetTime - now,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetInMs: record.resetTime - now,
  };
}

/**
 * Limpieza periódica de registros expirados para evitar fugas de memoria
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

