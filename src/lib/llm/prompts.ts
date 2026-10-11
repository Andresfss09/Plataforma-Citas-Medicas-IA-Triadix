import fs from "fs";
import path from "path";

let cachedSystemPrompt: string | null = null;

export function getSystemPrompt(): string {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const promptPath = path.join(process.cwd(), "prompts", "citavoz-v1.txt");
  if (fs.existsSync(promptPath)) {
    cachedSystemPrompt = fs.readFileSync(promptPath, "utf-8");
  } else {
    cachedSystemPrompt = "Eres CitaVoz, el asistente de voz de EPS TRIADIX en Cali, Colombia. Trata siempre de usted con respeto, respuestas de máximo 2 frases breves, y nunca diagnostiques.";
  }

  return cachedSystemPrompt;
}

