# Guía de Despliegue en Capa Gratuita ($0 USD)
## CitaVoz EPS — Plataforma de Agendamiento por Voz para EPS TRIADIX (Cali)

Esta guía detalla el procedimiento para publicar y operar el sistema en producción sin incurrir en costos de infraestructura ($0 USD mensuales), utilizando plataformas modernas con generosos planes gratuitos.

---

## 1. Arquitectura de Despliegue Recomendada

```mermaid
flowchart LR
    User[Afiliado / Teléfono] -->|Voz / HTTPS| Vercel[Vercel Serverless / Edge]
    Vercel -->|SQL + pgvector| Neon[Neon Serverless Postgres / Supabase]
    Vercel -->|LLM Gratis| Gemini[Google AI Studio - Gemini 1.5 Flash]
    Vercel -->|TTS Web Speech API| Browser[Navegador del Usuario ($0)]
```

---

## 2. Opción A: Base de Datos en Neon (Recomendado) o Supabase

### Paso 1: Crear proyecto PostgreSQL con `pgvector`
1. Regístrese gratuitamente en [Neon.tech](https://neon.tech) o [Supabase.com](https://supabase.com).
2. Cree un proyecto titulado `citavoz-eps-cali`.
3. En la consola SQL de Neon/Supabase, active la extensión vectorial:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copie la cadena de conexión (`DATABASE_URL`):
   ```
   postgresql://usuario:contrasena@ep-ejemplo.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Paso 2: Ejecutar el Seeding de Datos en Producción
Desde su terminal local, apunte temporalmente a la base de producción y ejecute:
```powershell
$env:DATABASE_URL="postgresql://usuario:contrasena@ep-ejemplo.us-east-2.aws.neon.tech/neondb?sslmode=require"
npx tsx -e "import('./src/db/seed.js').then(m => m.runFullSeed())"
```

---

## 3. Opción B: Frontend y API en Vercel (Recomendado) o Render

### Paso 1: Conectar con GitHub
1. Inicie sesión en [Vercel.com](https://vercel.com) e importe el repositorio de GitHub.
2. Framework Preset: **Next.js**.
3. Build Command: `npm run build`.
4. Output Directory: `.next`.

### Paso 2: Configurar Variables de Entorno en Vercel
En la sección **Settings ➔ Environment Variables**, configure:

| Variable | Valor / Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión Postgres con SSL | `postgresql://...@neon.tech/neondb?sslmode=require` |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `APP_URL` | Dominio público de su app en Vercel | `https://citavoz-eps.vercel.app` |
| `LLM_PROVIDER` | Proveedor LLM (Capa gratuita) | `gemini` |
| `GEMINI_API_KEY` | Llave gratuita de Google AI Studio | `AIzaSy...` |
| `ENCRYPTION_SECRET_KEY` | Clave de 32 caracteres para AES-256 | `c47b9e1284d720a4f5b9c08173461280` |
| `HMAC_SECRET_KEY` | Clave de 32 caracteres para búsqueda | `a83b9c719e248b17359f104273819204` |
| `MAX_TURNS_PER_SESSION` | Límite de seguridad de turnos | `15` |
| `SESSION_TIMEOUT_MINUTES` | Tiempo de expiración de sesión | `20` |

---

## 4. Plan de Respaldo y Recuperación (Backups $0 USD)

1. **Backups Automáticos Neon/Supabase**:
   - Neon realiza copias de seguridad continuas Point-In-Time Restore (PITR) de 7 días en la capa gratuita.
2. **Respaldo Manual con `pg_dump`**:
   Ejecute semanalmente un volcado lógico cifrado:
   ```powershell
   pg_dump "$env:DATABASE_URL" --format=custom --file="backup_citavoz_$(Get-Date -Format 'yyyyMMdd').dump"
   ```
3. **Restauración ante Desastres**:
   ```powershell
   pg_restore --clean --if-exists --no-owner --dbname="$env:DATABASE_URL" "backup_citavoz_20261011.dump"
   ```

---

## 5. Verificación Post-Despliegue

1. Acceda a `https://citavoz-eps.vercel.app`.
2. Presione el botón de voz y diga: *"Hola, necesito una cita de medicina general en la sede Tequendama"*.
3. Verifique la emisión del PDF en `/api/citas/[codigo]/pdf` y la lectura del código QR.
4. Ingrese a `/admin` para constatar los gráficos gerenciales de ocupación.

