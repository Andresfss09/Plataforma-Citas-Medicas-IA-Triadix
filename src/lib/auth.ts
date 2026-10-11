import { getDb } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { hashSearchableField, decryptSensitiveData } from "./crypto";
import crypto from "crypto";

export interface AfiliadoSesion {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  regimen: string;
  categoria: string;
  estadoAfiliacion: string;
}

// Almacén seguro en memoria para OTPs activos (válidos por 5 minutos)
interface OtpChallenge {
  afiliadoId: string;
  codigoOtp: string;
  intentos: number;
  expiraEn: number;
}

// Almacén de sesiones activas (válidas por 15 minutos)
interface SesionRecord {
  afiliado: AfiliadoSesion;
  expiraEn: number;
}

const otpStore = new Map<string, OtpChallenge>();
const sessionStore = new Map<string, SesionRecord>();

export const COOKIE_SESSION_NAME = "triadix_session_token";

/**
 * 1. Solicitar código OTP simulado verificando tipo, número de documento y fecha de nacimiento
 */
export async function solicitarOtp(params: {
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string; // YYYY-MM-DD o DD/MM/AAAA
}): Promise<{ exito: boolean; mensaje: string; telefonoEnmascarado?: string; challengeId?: string; codigoOtpDebug?: string }> {
  const db = getDb();
  const { tipoDocumento, numeroDocumento, fechaNacimiento } = params;

  // Normalizar fecha de nacimiento
  let fechaNorm = fechaNacimiento.trim();
  if (fechaNorm.includes("/")) {
    const parts = fechaNorm.split("/");
    if (parts.length === 3) {
      fechaNorm = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  const docHash = hashSearchableField(numeroDocumento);

  const [afiliado] = await db
    .select()
    .from(schema.afiliados)
    .where(eq(schema.afiliados.numeroDocumentoHash, docHash));

  if (!afiliado || afiliado.tipoDocumento !== tipoDocumento) {
    return {
      exito: false,
      mensaje: "No se encontró ningún afiliado con los datos suministrados en EPS TRIADIX.",
    };
  }

  // Validar coincidencia de fecha de nacimiento
  if (afiliado.fechaNacimiento !== fechaNorm) {
    return {
      exito: false,
      mensaje: "La fecha de nacimiento no coincide con nuestros registros.",
    };
  }

  // Generar código OTP de 6 dígitos
  const codigoOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const challengeId = crypto.randomUUID();

  // Guardar challenge con expiración de 5 minutos
  otpStore.set(challengeId, {
    afiliadoId: afiliado.id,
    codigoOtp: codigoOtp,
    intentos: 0,
    expiraEn: Date.now() + 5 * 60 * 1000,
  });

  const telReal = decryptSensitiveData(afiliado.telefonoEnc);
  const telEnmascarado = telReal ? `${telReal.slice(0, 3)}***${telReal.slice(-2)}` : "su número registrado";

  // Registro de auditoría
  await db.insert(schema.auditoria).values({
    id: crypto.randomUUID(),
    accion: "SOLICITUD_OTP_AUTENTICACION",
    entidad: "afiliados",
    entidadId: afiliado.id,
    usuarioOrigen: "sistema_auth",
    ip: "127.0.0.1",
    detallesHash: hashSearchableField(`Challenge: ${challengeId}`),
  });

  console.log(`\n📲 [SIMULADOR SMS EPS TRIADIX] Código OTP para ${telReal}: [ ${codigoOtp} ] (Válido por 5 minutos)`);

  return {
    exito: true,
    mensaje: `Se ha enviado un código de verificación de 6 dígitos a su teléfono celular terminado en ${telEnmascarado}.`,
    telefonoEnmascarado: telEnmascarado,
    challengeId: challengeId,
    codigoOtpDebug: codigoOtp, // Para facilitar pruebas y demo
  };
}

/**
 * 2. Verificar código OTP y emitir token de sesión seguro
 */
export async function verificarOtp(params: {
  challengeId: string;
  codigoOtp: string;
}): Promise<{ exito: boolean; mensaje: string; sessionToken?: string; afiliado?: AfiliadoSesion }> {
  const { challengeId, codigoOtp } = params;
  const challenge = otpStore.get(challengeId);

  if (!challenge) {
    return { exito: false, mensaje: "El desafío de autenticación no existe o ha expirado. Por favor solicite un nuevo código." };
  }

  if (Date.now() > challenge.expiraEn) {
    otpStore.delete(challengeId);
    return { exito: false, mensaje: "El código ha expirado. Por favor solicite uno nuevo." };
  }

  if (challenge.intentos >= 3) {
    otpStore.delete(challengeId);
    return { exito: false, mensaje: "Ha superado el número máximo de intentos permitidos (3). Solicite un nuevo código por seguridad." };
  }

  if (challenge.codigoOtp !== codigoOtp.trim()) {
    challenge.intentos += 1;
    return { exito: false, mensaje: `Código de verificación incorrecto. Le quedan ${3 - challenge.intentos} intentos.` };
  }

  // Código correcto: eliminar challenge
  otpStore.delete(challengeId);

  // Obtener datos del afiliado
  const db = getDb();
  const [afiliado] = await db
    .select()
    .from(schema.afiliados)
    .where(eq(schema.afiliados.id, challenge.afiliadoId));

  if (!afiliado) {
    return { exito: false, mensaje: "Error al recuperar datos del afiliado." };
  }

  const afiliadoSesion: AfiliadoSesion = {
    id: afiliado.id,
    tipoDocumento: afiliado.tipoDocumento,
    numeroDocumento: decryptSensitiveData(afiliado.numeroDocumentoEnc),
    nombres: decryptSensitiveData(afiliado.nombresEnc),
    apellidos: decryptSensitiveData(afiliado.apellidosEnc),
    telefono: decryptSensitiveData(afiliado.telefonoEnc),
    regimen: afiliado.regimen,
    categoria: afiliado.categoria,
    estadoAfiliacion: afiliado.estadoAfiliacion,
  };

  // Generar token de sesión (15 minutos)
  const sessionToken = crypto.randomBytes(32).toString("hex");
  sessionStore.set(sessionToken, {
    afiliado: afiliadoSesion,
    expiraEn: Date.now() + 15 * 60 * 1000,
  });

  return {
    exito: true,
    mensaje: `Autenticación exitosa. Bienvenido don/doña ${afiliadoSesion.nombres}.`,
    sessionToken: sessionToken,
    afiliado: afiliadoSesion,
  };
}

/**
 * 3. Obtener el afiliado autenticado a partir del token de sesión
 */
export function getAuthenticatedAfiliado(token?: string | null): AfiliadoSesion | null {
  if (!token) return null;
  const sesion = sessionStore.get(token);
  if (!sesion) return null;

  if (Date.now() > sesion.expiraEn) {
    sessionStore.delete(token);
    return null;
  }

  return sesion.afiliado;
}

