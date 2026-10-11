import { NextResponse } from "next/server";
import openApiDoc from "@/../docs/openapi.json";

export async function GET() {
  return NextResponse.json(openApiDoc);
}

