import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verificarOtp, COOKIE_SESSION_NAME } from "@/lib/auth";
import { z } from "zod";

const requestSchema = z.object({
  challengeId: z.string().uuid(),
  codigoOtp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = checkRateLimit(`auth_verificar_${ip}`, { windowMs: 60 * 1000, maxRequests: 5 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { exito: false, mensaje: "Demasiados intentos de verificación. Espere un momento." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    const resultado = await verificarOtp(parsed);

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 401 });
    }

    const response = NextResponse.json(resultado, { status: 200 });

    // Establecer cookie de sesión segura httpOnly
    if (resultado.sessionToken) {
      response.cookies.set({
        name: COOKIE_SESSION_NAME,
        value: resultado.sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60, // 15 minutos
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { exito: false, mensaje: error.message || "Parámetros inválidos" },
      { status: 400 }
    );
  }
}

