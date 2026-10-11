import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ exito: true, mensaje: "Sesión cerrada correctamente" });
  response.cookies.delete("citavoz_paciente_session");
  response.cookies.delete("citavoz_paciente_info");
  return response;
}

