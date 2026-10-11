import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptSensitiveData } from "@/lib/crypto";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipoDocumento = "CC", numeroDocumento, password } = body;

    if (!numeroDocumento || !password) {
      return NextResponse.json(
        { exito: false, error: "El número de documento y la contraseña son requeridos." },
        { status: 400 }
      );
    }

    const db = getDb();
    const docLimpio = numeroDocumento.toString().trim();
    const passLimpia = password.toString().trim();

    // Buscar afiliado por documento
    const [afiliado] = await db
      .select()
      .from(schema.afiliados)
      .where(eq(schema.afiliados.numeroDocumento, docLimpio));

    if (!afiliado) {
      return NextResponse.json(
        { exito: false, error: "No se encontró ningún afiliado con este documento en EPS TRIADIX." },
        { status: 401 }
      );
    }

    // Validar contraseña
    if (afiliado.passwordHash !== passLimpia) {
      return NextResponse.json(
        { exito: false, error: "La contraseña ingresada es incorrecta." },
        { status: 401 }
      );
    }

    if (afiliado.estadoAfiliacion !== "ACTIVO") {
      return NextResponse.json(
        { exito: false, error: `Su afiliación se encuentra ${afiliado.estadoAfiliacion}. Comuníquese con la EPS.` },
        { status: 403 }
      );
    }

    const nombres = decryptSensitiveData(afiliado.nombresEnc);
    const apellidos = decryptSensitiveData(afiliado.apellidosEnc);
    const sessionToken = crypto.randomBytes(32).toString("hex");

    const response = NextResponse.json({
      exito: true,
      mensaje: `Bienvenido(a), ${nombres} ${apellidos}`,
      afiliado: {
        id: afiliado.id,
        tipoDocumento: afiliado.tipoDocumento,
        numeroDocumento: docLimpio,
        nombres,
        apellidos,
        regimen: afiliado.regimen,
        categoria: afiliado.categoria,
      },
      sessionToken,
    });

    // Guardar cookie de sesión HttpOnly
    response.cookies.set("citavoz_paciente_session", sessionToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 horas
      sameSite: "lax",
    });

    // Cookie de lectura para el frontend
    response.cookies.set("citavoz_paciente_info", JSON.stringify({
      id: afiliado.id,
      nombre: nombres,
      documento: docLimpio,
    }), {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { exito: false, error: "Error en el servidor al autenticar." },
      { status: 500 }
    );
  }
}

