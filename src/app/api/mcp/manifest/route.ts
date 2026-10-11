import { NextResponse } from "next/server";
import { TOOLS_CATALOG } from "@/lib/tools/definitions";

export async function GET() {
  const toolsFormatted = TOOLS_CATALOG.map((t) => ({
    name: t.name,
    description: t.description,
  }));

  return NextResponse.json({
    protocol: "mcp-http",
    version: "1.0",
    service: "CitaVoz EPS TRIADIX Cali",
    totalTools: toolsFormatted.length,
    tools: toolsFormatted,
  });
}

