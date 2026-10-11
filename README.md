# CitaVoz EPS — Asistente de Voz Inteligente para EPS TRIADIX
### Santiago de Cali, Colombia | Costo Cero en Infraestructura ($0 USD)

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-blue?style=flat-square&logo=postgresql)
![WCAG](https://img.shields.io/badge/WCAG-2.1_AA-green?style=flat-square)
![Ley 1581](https://img.shields.io/badge/Habeas_Data-Ley_1581-emerald?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-Passing_100%25-brightgreen?style=flat-square)

**CitaVoz EPS** es una plataforma conversacional de voz web accesible diseñada para la gestión integral de citas médicas ambulatorias en EPS TRIADIX (Cali, Colombia). Desarrollada con arquitectura de cero costo de servidores permanentes, combina reconocimiento de voz adaptado al lenguaje caleño, búsqueda semántica híbrida con `pgvector`, prevención matemática de sobrecupos, salvaguardas clínicas de urgencias hacia la **Línea 123** y entrega de comprobantes oficiales con código QR criptográfico y archivo `.ics`.

---

## 🚀 Guía de Inicio Rápido (En Menos de 10 Minutos)

### 1. Requisitos Previos
- Node.js 20 o superior instalado.
- Git.

### 2. Instalación y Dependencias
```bash
# Clonar el repositorio
git clone https://github.com/tu-organizacion/citavoz-eps.git
cd citavoz-eps

# Instalar dependencias
npm install
```

### 3. Configuración de Entorno
Cree un archivo `.env` en la raíz (puede duplicar `.env.example`):
```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Proveedor LLM (gemini, groq, ollama o mock)
LLM_PROVIDER=mock
GEMINI_API_KEY=

# Claves criptográficas para AES-256 y HMAC (Ley 1581)
ENCRYPTION_SECRET_KEY=01234567890123456789012345678901
HMAC_SECRET_KEY=01234567890123456789012345678901
```

### 4. Poblado de Datos (Seed de Cali)
El proyecto incluye un motor dual que funciona automáticamente con Docker PostgreSQL o con el motor vectorial local integrado (`@electric-sql/pglite`):
```bash
npx tsx src/db/seed.ts
```
*Carga automáticamente 10 sedes IPS en Cali, 15 especialidades, 40 médicos y más de 4.000 franjas de atención.*

### 5. Iniciar la Aplicación
```bash
npm run dev
```
Abra su navegador en [http://localhost:3000](http://localhost:3000) y presione el botón de voz para interactuar.

---

## 🧪 Ejecución de Pruebas Automatizadas

```bash
# 1. Pruebas de Servicios y Concurrencia Extrema (Zero Overbooking)
npx tsx --test src/services/citas.test.ts

# 2. Pruebas de Herramientas Agénticas y Auditoría
npx tsx --test src/services/tools.test.ts

# 3. Banco de Evaluación Conversacional (40 Casos - Éxito, Latencia y Prompt Injection)
npx tsx src/evaluation/evaluator.ts

# 4. Pruebas de Comprobante PDF, Código QR y Calendario .ics
npx tsx --test src/services/comprobante.test.ts

# 5. Pruebas de Diferenciales Innovadores (Jerga Caleña, Haversine y Multicanal)
npx tsx --test src/services/diferenciales.test.ts

# 6. Pruebas de Seguridad OWASP y Habeas Data
npx tsx --test src/services/seguridad.test.ts

# 7. Pruebas de Carga y Rendimiento Concurrente
npx tsx scripts/load-test.ts
```

---

## 🏛️ Estructura del Proyecto

```
PLATAFORMA CITAS MEDICAS/
├── docs/                        # Documentación técnica y legal completa
│   ├── arquitectura.md          # Diagramas de componentes Mermaid y flujos
│   ├── dominio.md               # Modelo de entidades, sedes de Cali y reglas
│   ├── flujos-conversacionales.md# Casos de uso y casos borde
│   ├── decisiones.md            # ADR-001 a ADR-005
│   ├── cumplimiento-ley-1581.md # Certificación de Habeas Data para la SIC
│   ├── despliegue-gratuito.md   # Manual de despliegue a $0 USD (Vercel + Neon)
│   ├── manual-usuario.md        # Manual para afiliados y adultos mayores
│   ├── manual-administrador.md  # Manual del panel gerencial de sedes
│   ├── guion-demo-3min.md       # Libreto de demostración de 3 minutos
│   └── informe-final.md         # Informe de entrega, deuda técnica y roadmap
├── src/
│   ├── app/                     # App Router de Next.js (Página principal y /admin)
│   ├── components/voice/        # Widget de voz accesible, botón Siri y transcripción
│   ├── db/                      # Esquemas Drizzle, adaptadores duales y seeders
│   ├── lib/                     # Motores criptográficos, LLM, geolocalización y tools
│   └── services/                # Lógica de negocio de citas, lista de espera y tests
├── scripts/                     # Scripts de pruebas de carga y benchmarking
└── .github/workflows/           # Pipeline de CI/CD para GitHub Actions
```

---

## 📄 Licencia y Derechos
Desarrollado para **EPS TRIADIX** en Santiago de Cali, Colombia. Distribuido bajo licencia MIT. Cumple con la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 sobre Protección de Datos Personales.

