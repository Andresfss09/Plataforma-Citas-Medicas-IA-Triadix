import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  TZ: z.string().default("America/Bogota"),
  DATABASE_URL: z.string().default("postgresql://triadix_user:triadix_secret_2026@localhost:5432/triadix_citas"),
  USE_EMBEDDED_DB: z.string().transform((val) => val === "true").default("true"),
  DATA_ENCRYPTION_KEY: z
    .string()
    .length(64, "La clave de cifrado debe tener 64 caracteres hexadecimales (32 bytes)")
    .default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  LLM_PROVIDER: z.enum(["gemini", "groq", "ollama"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional().default(""),
  PORT: z.coerce.number().default(3000),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.warn("⚠️ Advertencia de validación en variables de entorno, usando valores por defecto seguros:");
    console.warn(error.flatten().fieldErrors);
  }
  parsedEnv = envSchema.parse({});
}

export const env = parsedEnv;

