import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Credenciales administrativas del personal de TI / Sistemas EPS TRIADIX
const ADMIN_USER_TI = process.env.ADMIN_USER_TI || "admin.ti";
const ADMIN_PASS_TI = process.env.ADMIN_PASS_TI || "TriadixIT2026*";

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json();

    if (!usuario || !password) {
      return NextResponse.json(
        { exito: false, error: "Usuario institucional y credencial requeridos." },
        { status: 400 }
      );
    }

    if (usuario.trim() !== ADMIN_USER_TI || password.trim() !== ADMIN_PASS_TI) {
      return NextResponse.json(
        { exito: false, error: "Credenciales denegadas. Acceso restringido exclusivamente a la Oficina de TI y Soporte de Sistemas." },
        { status: 401 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");

    const response = NextResponse.json({
      exito: true,
      mensaje: "Sesión administrativa autenticada",
      admin: {
        usuario: ADMIN_USER_TI,
        rol: "Oficina de Tecnología e Información (TI)",
        sede: "Sede Principal Tequendama (Cali)",
      },
    });

    response.cookies.set("citavoz_admin_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas de turno
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ exito: false, error: "Error en autenticación administrativa." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ exito: true, mensaje: "Sesión administrativa cerrada" });
  response.cookies.delete("citavoz_admin_session");
  return response;
}

