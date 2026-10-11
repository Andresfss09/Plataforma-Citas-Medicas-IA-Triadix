import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAuthenticatedAfiliado, COOKIE_SESSION_NAME } from "@/lib/auth";
import { executeTool } from "@/lib/tools/executor";
import { z } from "zod";

const executeBodySchema = z.object({
  tool: z.string().min(1),
  params: z.unknown(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = checkRateLimit(`tool_exec_${ip}`, { windowMs: 60 * 1000, maxRequests: 60 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { exito: false, error: "Límite de peticiones de herramientas excedido. Por favor espere." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();
    const { tool, params } = executeBodySchema.parse(rawBody);

    // Obtener sesión si existe
    const token = req.cookies.get(COOKIE_SESSION_NAME)?.value;
    const afiliadoSesion = getAuthenticatedAfiliado(token);

    const resultado = await executeTool(tool, params, {
      ip,
      sessionAfiliadoId: afiliadoSesion?.id,
    });

    const status = resultado.exito ? 200 : 400;
    return NextResponse.json(resultado, { status });
  } catch (error: any) {
    return NextResponse.json(
      {
        tool: "unknown",
        exito: false,
        error: error.message || "Solicitud de ejecución de herramienta malformada",
        auditId: "error-request",
      },
      { status: 400 }
    );
  }
}

