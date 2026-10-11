import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { solicitarOtp } from "@/lib/auth";
import { z } from "zod";

const requestSchema = z.object({
  tipoDocumento: z.enum(["CC", "TI", "RC", "CE", "PA"]),
  numeroDocumento: z.string().min(5).max(15),
  fechaNacimiento: z.string().min(8).max(10), // YYYY-MM-DD o DD/MM/AAAA
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = checkRateLimit(`auth_solicitar_${ip}`, { windowMs: 60 * 1000, maxRequests: 5 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { exito: false, mensaje: "Demasiadas solicitudes de verificación. Por favor intente en un minuto." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    const resultado = await solicitarOtp(parsed);

    if (!resultado.exito) {
      return NextResponse.json(resultado, { status: 400 });
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { exito: false, mensaje: error.message || "Parámetros de solicitud inválidos" },
      { status: 400 }
    );
  }
}

