import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

let dbInstance: any = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  // Si se fuerza base embebida o no hay URL externa configurada
  if (env.USE_EMBEDDED_DB) {
    const dataDir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, "triadix_pglite");
    const client = new PGlite(dbPath);
    dbInstance = drizzlePglite(client, { schema });
    return dbInstance;
  }

  // Conexión estándar a PostgreSQL (Docker Compose o Producción)
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  dbInstance = drizzlePg(pool, { schema });
  return dbInstance;
}

export const db = getDb();

