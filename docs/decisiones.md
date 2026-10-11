# Registro de Decisiones de Arquitectura (ADR)
## Proyecto: CitaVoz EPS (EPS TRIADIX - Cali, Colombia)

---

### ADR-001: Framework Base y Paradigma
- **Estado**: Aprobado
- **Contexto**: Se requiere una aplicación web moderna, accesible, de alto rendimiento y costo cero.
- **Decisión**: Utilizar **Next.js 15 (App Router)** con **TypeScript** estricto y **Tailwind CSS**.
- **Consecuencias**: Permite Server Components para consultas directas a base de datos sin exponer endpoints innecesarios al público, además de endpoints seguros de API y streaming para IA.

---

### ADR-002: Base de Datos Dual (Docker Compose PostgreSQL + pgvector & PGlite)
- **Estado**: Aprobado
- **Contexto**: El stack base solicita Docker Compose con PostgreSQL 16 y extensión pgvector, pero en entornos locales donde Docker no esté disponible o durante pruebas rápidas se requiere desarrollo sin fricción y costo cero.
- **Decisión**: 
  - Configurar `docker-compose.yml` con la imagen oficial `pgvector/pgvector:pg16`.
  - Integrar un adaptador en Drizzle ORM que permite alternar transparentemente entre PostgreSQL estándar y `@electric-sql/pglite` (PostgreSQL compilado a WASM con soporte vectorial y almacenamiento local en `.data/`).
- **Consecuencias**: Máxima portabilidad. Funciona de inmediato en cualquier máquina de desarrollo y se despliega sin cambios a contenedores Docker.

---

### ADR-003: Cumplimiento de Habeas Data y Seguridad en Salud (Colombia)
- **Estado**: Aprobado
- **Marco Normativo**: **Ley Estatutaria 1581 de 2012**, **Decreto 1377 de 2013**, **Ley 1438 de 2011**.
- **Decisión**:
  - Los datos de salud y datos personales son considerados **datos sensibles**.
  - No se almacenan documentos de identidad ni nombres en texto plano.
  - Se implementó cifrado simétrico autenticado **AES-256-GCM** para todos los campos de información personal (`nombres`, `apellidos`, `documento`, `telefono`, `email`).
  - Para posibilitar la búsqueda eficiente de pacientes por número de documento sin descifrar masivamente la base de datos, se utiliza un índice determinista **HMAC-SHA256** derivado con clave criptográfica.
  - La tabla `consentimientos_habeas_data` guarda de forma inviolable la traza del consentimiento informado previo al tratamiento de datos (canal, timestamp, versión de la política e IP de origen).
  - La tabla `logs_auditoria` registra eventos sin persistir datos clínicos en claro.

---

### ADR-004: Protocolo de Triage Médico y Derivación a Urgencias (Línea 123 Cali)
- **Estado**: Aprobado
- **Marco Normativo**: **Resolución 5596 de 2015** (Sistema de Selección y Clasificación de Pacientes en Urgencias - Triage en Colombia).
- **Decisión**:
  - El asistente CitaVoz **NO diagnostica ni formula medicamentos**.
  - Si el usuario menciona síntomas de Triage I o II (dolor precordial/torácico opresivo, sospecha de infarto, asfixia o disnea aguda, sangrado masivo, inconsciencia/convulsiones, signos de ACV, ideación suicida o parto inminente), el flujo de agendamiento se **bloquea inmediatamente**.
  - El sistema activa una respuesta prioritaria instruyendo comunicarse con la **Línea de Emergencias 123 de Cali** o trasladarse de urgencia a las clínicas de urgencias de EPS TRIADIX (Sede Tequendama / HUV).

---

### ADR-005: Localización, Accesibilidad y Formatos Regionales
- **Estado**: Aprobado
- **Decisión**:
  - **Zona Horaria**: `America/Bogota` (UTC-5).
  - **Formato de Fecha**: `DD/MM/AAAA`.
  - **Formato de Hora**: 12 horas con indicador `a. m.` / `p. m.` conforme a la norma ortográfica colombiana.
  - **Accesibilidad**: Diseñado para cumplir **WCAG 2.1 Nivel AA**, con alto contraste de color para adultos mayores, objetivos táctiles de al menos 44x44px y compatibilidad total con lectores de pantalla.
