# Registro de Decisiones de Arquitectura (ADR) y Gestión de Riesgos
## Proyecto: CitaVoz EPS (EPS TRIADIX - Cali, Colombia)

---

## 1. Decisiones de Arquitectura (ADR)

### ADR-001: Framework Base y Paradigma
- **Estado**: Aprobado
- **Contexto**: Se requiere una plataforma web moderna, rápida, accesible, compatible con capas gratuitas y con tipado estricto.
- **Decisión**: Utilizar **Next.js 15 (App Router)** con **TypeScript** estricto (`strict: true`) y **Tailwind CSS**.
- **Consecuencias**: Permite Server Components para consultar la base de datos sin exponer endpoints innecesarios, y Server Actions para mutaciones transaccionales y generación de comprobantes.

---

### ADR-002: Base de Datos Dual y Cero Fricción
- **Estado**: Aprobado
- **Contexto**: El stack base define PostgreSQL 16 con extensión `pgvector` y Docker Compose. Sin embargo, en entornos de desarrollo local donde el daemon de Docker no esté disponible o para pruebas automatizadas CI/CD ultrarrápidas, se requiere cero fricción sin costo de servidores cloud.
- **Decisión**:
  - Provisión de `docker-compose.yml` oficial con la imagen `pgvector/pgvector:pg16`.
  - Capa de abstracción Drizzle ORM que permite alternar transparentemente entre PostgreSQL estándar y `@electric-sql/pglite` (PostgreSQL compilado a WASM con pgvector integrado) almacenado localmente en `.data/`.
- **Consecuencias**: Portabilidad total y ejecución instantánea en cualquier entorno.

---

### ADR-003: Protección de Datos de Salud (Ley 1581 de 2012 / Decreto 1377 de 2013)
- **Estado**: Aprobado
- **Marco Normativo**: Ley 1581 de 2012, Decreto 1377 de 2013, Circular 002 de la Superintendencia de Industria y Comercio (SIC).
- **Decisión**:
  - La información de salud y filiación de los afiliados es clasificada como **DATO SENSIBLE**.
  - **Cifrado en Reposo**: Cifrado simétrico autenticado **AES-256-GCM** para todos los campos de información personal y motivos de consulta (`nombres`, `apellidos`, `documento`, `telefono`, `motivo_consulta`).
  - **Búsqueda Segura sin Exposición**: Generación de un hash criptográfico determinista **HMAC-SHA256** derivado con clave secreta para la indexación y búsqueda por cédula en BD, evitando tener el número en texto claro.
  - **Consentimiento Auditable**: Registro inviolable de la aceptación de Habeas Data antes de cualquier procesamiento con sello de tiempo, IP, canal y versión de política.
  - **Logs de Auditoría Seguros**: Trazabilidad completa de operaciones sin incluir datos clínicos ni PII en texto plano.

---

### ADR-004: Protocolo de Triage Médico y Derivación a Urgencias (Línea 123 Cali)
- **Estado**: Aprobado
- **Marco Normativo**: Resolución 5596 de 2015 del Ministerio de Salud (Clasificación de Triage en Colombia).
- **Decisión**:
  - CitaVoz **NO DIAGNOSTICA NI EMITE FÓRMULAS MÉDICAS**.
  - El sistema cuenta con un clasificador determinista previo al LLM que evalúa las expresiones del usuario en busca de signos de urgencia vital (dolor precordial/torácico, asfixia, sangrado profuso, pérdida de conciencia, sospecha de ACV, ideación suicida, trabajo de parto inminente).
  - Al detectarse una alerta, se **interrumpe inmediatamente el agendamiento** y se emite la recomendación prioritaria de comunicarse a la **Línea de Emergencias 123 de Cali** o acudir a urgencias de EPS TRIADIX.

---

### ADR-005: Formatos Regionales y Accesibilidad Inclusiva
- **Estado**: Aprobado
- **Decisión**:
  - Zona horaria del sistema: `America/Bogota` (UTC-5).
  - Formato de fecha: `DD/MM/AAAA`.
  - Formato horario: 12 horas con especificación `a. m.` / `p. m.` conforme a la norma de la Real Academia y el estándar colombiano.
  - Cumplimiento **WCAG 2.1 Nivel AA**: contraste superior a 4.5:1 (y 7:1 en textos grandes), objetivos táctiles mínimos de 48x48 px para adultos mayores, y compatibilidad total con lectores de pantalla.

---

## 2. Análisis Integral de Riesgos y Planes de Mitigación

### 2.1. Matriz de Clasificación de Riesgos (Probabilidad x Impacto)

```
        ▲ Impacto
        │
   ALTO │  [R-LEG-02] Prohibición Diagnóstico      [R-LEG-01] Fuga Datos Sensibles
        │  [R-TEC-01] Límite Cuota LLM Gratuito     [R-UX-01] Exclusión Adultos Mayores
        │
  MEDIO │  [R-TEC-02] Fragmentación WebMCP          [R-TEC-03] Latencia Speech Recognition
        │  [R-UX-02] Ruido y Modismos Caleños       [R-TEC-04] Colisión de Franjas
        │
   BAJO │  [R-UX-03] Fatiga por Voz Continuada      [R-LEG-03] Revocatoria Habeas Data
        └────────────────────────────────────────────────────────► Probabilidad
                   BAJA                     MEDIA                    ALTA
```

---

### 2.2. Riesgos Técnicos (TEC)

| ID | Riesgo Técnico | Prob. | Imp. | Nivel | Estrategia y Plan de Mitigación |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **R-TEC-01** | **Agotamiento de cuota gratuita del LLM (Rate Limit 429 en Gemini Free)** | Media | Alto | **ALTO** | **Mitigación**: Implementación del patrón `LLMProvider` con conmutación en caliente (*circuit breaker*): si Gemini retorna error 429 o tarda más de 3.5 segundos, el orquestador conmuta automáticamente al proveedor secundario gratuito (Groq con LLaMA-3.3 o Ollama local). Además, se implementa caché de intenciones comunes para respuestas estáticas (sedes, requisitos). |
| **R-TEC-02** | **Fragmentación de soporte de WebMCP (`navigator.modelContext`) en navegadores** | Alta | Medio | **MEDIO** | **Mitigación**: La arquitectura adopta el enfoque *dual-tooling*: los esquemas Zod de las herramientas son universales. El cliente detecta la presencia de `navigator.modelContext`; si no existe (la gran mayoría de navegadores actuales), conmuta de forma completamente transparente al endpoint MCP/HTTP del servidor Next.js. El usuario final no percibe diferencia. |
| **R-TEC-03** | **Latencia y desconexión en Web Speech API en redes móviles lentas** | Media | Medio | **MEDIO** | **Mitigación**: Uso de buffers locales pequeños y retroalimentación auditiva/visual instantánea mientras se procesa la voz ("Escuchando...", "Consultando agendas..."). Si la latencia de red supera 4 segundos, se despliegan automáticamente opciones visuales de un solo toque en pantalla. |
| **R-TEC-04** | **Colisión concurrente en la reserva de la misma franja médica (Race Condition)** | Baja | Medio | **MEDIO** | **Mitigación**: Transacciones con aislamiento serializable en PostgreSQL y actualización atómica del estado del slot (`UPDATE disponibilidad_medica SET estado = 'reservada' WHERE id = $1 AND estado = 'disponible' RETURNING id`). Si otra transacción se adelantó, el sistema detecta cero filas afectadas y sugiere la franja contigua. |

---

### 2.3. Riesgos Legales y Normativos en Salud (LEG)

| ID | Riesgo Legal / Normativo | Prob. | Imp. | Nivel | Estrategia y Plan de Mitigación |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **R-LEG-01** | **Fuga o exposición de datos sensibles de pacientes (Ley 1581 / Decreto 1377)** | Baja | Crítico | **CRÍTICO** | **Mitigación**: 1. Cifrado simétrico AES-256-GCM para todo almacenamiento persistente. 2. Búsqueda por HMAC-SHA256 sin texto claro. 3. Los logs del sistema nunca escriben información clínica ni nombres completos. 4. Consentimiento informado capturado explícitamente en el primer turno de voz o interfaz con registro de IP y timestamp. |
| **R-LEG-02** | **Riesgo de ejercicio ilegal de la medicina / Diagnóstico erróneo por IA** | Media | Crítico | **CRÍTICO** | **Mitigación**: 1. Guardrail estricto en el prompt del sistema y en la capa de triage: CitaVoz tiene terminantemente prohibido formular, recetar o dar diagnósticos. 2. Clasificador determinista de urgencias previo al LLM: cualquier síntoma de alarma interrumpe el flujo y deriva a la **Línea 123 Cali**. 3. Descargo de responsabilidad médico obligatorio y visible en la interfaz y en el pie del comprobante PDF. |
| **R-LEG-03** | **Ataque de Prompt Injection para alterar citas o extraer datos ajenos** | Media | Alto | **ALTO** | **Mitigación**: El LLM **no tiene acceso directo a SQL ni a la base de datos**. Todas las interacciones se realizan exclusivamente a través de Tools estrictamente validadas con Zod. La identidad del afiliado se fija en la sesión autenticada; el LLM no puede modificar el `pacienteId` que ejecuta la herramienta. |

---

### 2.4. Riesgos de Experiencia de Usuario y Accesibilidad (UX)

| ID | Riesgo de UX / Accesibilidad | Prob. | Imp. | Nivel | Estrategia y Plan de Mitigación |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **R-UX-01** | **Barrera de uso y desconfianza en adultos mayores (analfabetismo digital)** | Alta | Alto | **ALTO** | **Mitigación**: 1. Interfaz limpia y despejada con botón gigante de voz (estilo Siri) de fácil identificación. 2. Tono formal, paciente y cálido (trato de "usted" y modismos respetuosos de Cali). 3. Mensajes hablados claros con volumen adecuado y opción de repetir ("¿Podría repetir?"). 4. Conformidad rigurosa con WCAG 2.1 Nivel AA. |
| **R-UX-02** | **Dificultad de reconocimiento ante ruido ambiente o acento vallecaucano rápido** | Alta | Medio | **MEDIO** | **Mitigación**: Modelo fonético configurado en `es-CO`. Algoritmo de tolerancia fonética y similitud Levenshtein para números de cédula dictados con pausas (*"once... cuarenta y cuatro... doce..."*). Fallback suave a teclado de alto contraste al segundo intento no exitoso. |
| **R-UX-03** | **Fatiga auditiva por respuestas del asistente excesivamente extensas** | Media | Bajo | **MEDIO** | **Mitigación**: Regla de síntesis concisa: las intervenciones del asistente se limitan a un máximo de 2 a 3 oraciones cortas por turno. Se evita la sobrecarga informativa y se solicita confirmación puntual a cada paso. |
