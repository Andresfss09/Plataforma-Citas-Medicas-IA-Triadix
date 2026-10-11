# Backlog del Producto y Criterios de Aceptación Cuantificables
## Proyecto: CitaVoz EPS (EPS TRIADIX - Cali, Colombia)

---

## 1. Metodología de Priorización: MoSCoW

El backlog está priorizado bajo la metodología **MoSCoW** (*Must have*, *Should have*, *Could have*, *Won't have*), alineado con el enfoque de **costo cero** y máxima usabilidad para afiliados en Cali.

```
┌────────────────────────────────────────────────────────┐
│                      BACKLOG MOSCOW                    │
├──────────────────────────┬─────────────────────────────┤
│ 1. MUST HAVE (M)         │ 2. SHOULD HAVE (S)          │
│ - Interfaz de voz es-CO  │ - Reprogramación/cancelación│
│ - Agendamiento Med. Gral │ - Matching semántico pgvect │
│ - Triage Línea 123 Cali  │ - Georreferenciación sedes  │
│ - Comprobante PDF        │ - Fallback Groq / Ollama    │
│ - Cifrado Ley 1581       │                             │
├──────────────────────────┼─────────────────────────────┤
│ 3. COULD HAVE (C)        │ 4. WON'T HAVE (W)           │
│ - Síntesis de preparación│ - Integración ADRES en vivo │
│ - Notificación SMS demo  │ - Pagos / Pasarelas copago  │
│ - Selección tono voz     │ - Prescripción de fármacos  │
└──────────────────────────┴─────────────────────────────┘
```

---

## 2. Historias de Usuario Priorizadas

### 2.1. MUST HAVE (Obligatorio para la Release Operativa)

#### US-M01: Interfaz de Voz Estilo Siri Accesible y Adaptada a Cali
- **Como**: Afiliado de EPS TRIADIX (especialmente adulto mayor).
- **Quiero**: Hablar directamente con la aplicación mediante un botón claro de micrófono y escuchar respuestas amables en español colombiano.
- **Para**: Agendar mi cita sin necesidad de navegar formularios complicados ni escribir en pantallas pequeñas.
- **Criterios de Aceptación Medibles**:
  1. El reconocimiento de voz opera en dialecto `es-CO` y tolera pausas de hasta 1.5 segundos entre números de cédula.
  2. La respuesta sintetizada utiliza modismos formales y respetuosos (trato de "usted") a velocidad moderada (130-140 palabras/minuto).
  3. El botón de activación mide al menos **64x64 px**, tiene contraste superior a **7:1** contra el fondo y emite respuesta auditiva y visual al activarse.
  4. La interfaz es 100% operable mediante teclado (tecla `Espacio` o `Enter` para activar/desactivar micrófono).
  5. Cumplimiento auditado de **WCAG 2.1 Nivel AA**.

#### US-M02: Agendamiento de Cita de Medicina General y Odontología
- **Como**: Afiliado activo de EPS TRIADIX.
- **Quiero**: Solicitar una cita de consulta externa en mi sede de preferencia en Cali (Tequendama, Versalles, Pasoancho o San Fernando).
- **Para**: Recibir atención médica oportuna en la fecha y hora que más me convenga.
- **Criterios de Aceptación Medibles**:
  1. El tiempo total de interacción desde el primer saludo hasta la confirmación de la cita es **menor a 60 segundos** en condiciones normales.
  2. La latencia de respuesta del agente entre que el usuario termina de hablar y la voz del agente responde es **menor a 3.0 segundos**.
  3. La franja horaria seleccionada se bloquea atómicamente evitando cualquier colisión o doble asignación concurrente.
  4. Los datos de fecha y hora se confirman explícitamente al usuario en formato `DD/MM/AAAA` y 12 horas (`a. m.` / `p. m.`, zona `America/Bogota`).

#### US-M03: Guardián de Triage Médico y Derivación a Urgencias (Línea 123)
- **Como**: Afiliado que experimenta una situación de salud crítica o acompañante.
- **Quiero**: Que el sistema reconozca inmediatamente si presento un síntoma de alarma vital.
- **Para**: No perder tiempo valioso agendando una cita programada y recibir auxilio hospitalario inmediato.
- **Criterios de Aceptación Medibles**:
  1. La tasa de interrupción y derivación ante expresiones de dolor torácico/sospecha de infarto, asfixia, hemorragia activa, pérdida de conciencia o ideación suicida es del **100%**.
  2. La interrupción del flujo ocurre en **menos de 500 milisegundos** sin esperar a que el LLM procese la solicitud.
  3. El sistema muestra y lee un mensaje de alerta prioritario con el número **123** y un botón interactivo de un toque para discar la llamada.

#### US-M04: Generación y Descarga Instantánea del Comprobante PDF
- **Como**: Afiliado que acaba de agendar su cita médica.
- **Quiero**: Obtener un comprobante en formato PDF claro y oficial de EPS TRIADIX.
- **Para**: Presentarlo como permiso laboral y verificar las recomendaciones de preparación para mi cita.
- **Criterios de Aceptación Medibles**:
  1. El PDF se genera y pone a disposición para descarga en **menos de 2.0 segundos** tras la confirmación de la cita.
  2. El documento incluye membrete oficial de EPS TRIADIX, código único de radicado (`CTX-2026-XXXX`), datos del paciente, sede, dirección, médico, fecha/hora colombiana y código QR de validación.
  3. El PDF es liviano (peso inferior a **250 KB**) para descarga rápida en redes móviles 3G/4G.

#### US-M05: Protección de Datos de Salud y Consentimiento de Habeas Data (Ley 1581)
- **Como**: Responsable de seguridad y oficial de protección de datos de EPS TRIADIX.
- **Quiero**: Que ningún dato personal ni clínico se almacene en texto plano y que se capture el consentimiento informado.
- **Para**: Cumplir rigurosamente con la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.
- **Criterios de Aceptación Medibles**:
  1. El **100% de los datos sensibles** de pacientes (`documento`, `nombres`, `apellidos`, `telefono`, `motivo_consulta`) se almacenan cifrados con **AES-256-GCM**.
  2. Las búsquedas por documento se realizan exclusivamente mediante un hash determinista **HMAC-SHA256**.
  3. Se registra el consentimiento informado previo en la tabla `consentimientos_habeas_data` con timestamp e IP antes de crear o consultar citas.
  4. Los logs de auditoría no contienen PII en texto plano.

---

### 2.2. SHOULD HAVE (Importante para la Experiencia Completa)

#### US-S01: Consulta, Reprogramación y Cancelación de Citas por Voz
- **Como**: Afiliado que no podrá asistir a su cita programada.
- **Quiero**: Consultar mis citas activas y reprogramarlas o cancelarlas simplemente hablando con el asistente.
- **Para**: Despejar mi agenda y liberar el cupo médico para otro paciente que lo necesite en Cali.
- **Criterios de Aceptación**:
  1. El sistema lista las citas activas del usuario ordenadas cronológicamente.
  2. La cancelación exige confirmación explícita previa por parte del usuario.
  3. La liberación de la franja horaria ocurre de manera inmediata en la base de datos, quedando disponible para otros usuarios en menos de 1 segundo.
  4. La regla de cancelación previa mínima de 2 horas se valida automáticamente.

#### US-S02: Búsqueda Semántica de Especialidades con pgvector
- **Como**: Afiliado que no conoce el nombre técnico de la especialidad médica que requiere.
- **Quiero**: Expresar mi molestia en lenguaje común (ej. *"me duele una muela"*, *"no veo bien las letras pequeñas"*).
- **Para**: Que el sistema me dirija a la especialidad correcta sin tecnicismos.
- **Criterios de Aceptación**:
  1. Precisión de asignación de especialidad superior al **90%** en un corpus de 50 descripciones coloquiales validadas.
  2. Búsqueda vectorial mediante distancia coseno en PostgreSQL con pgvector en menos de **100 milisegundos**.

#### US-S03: Capa de Tools Híbrida WebMCP + Fallback HTTP
- **Como**: Arquitecto de software.
- **Quiero**: Exponer las herramientas mediante `navigator.modelContext` cuando esté disponible y fallback HTTP cuando no.
- **Para**: Garantizar máxima compatibilidad entre navegadores sin duplicar lógica de negocio.
- **Criterios de Aceptación**:
  1. Detección automática en tiempo de ejecución de las capacidades del cliente.
  2. El 100% de las herramientas comparten exactamente la misma validación de esquemas Zod en cliente y servidor.

---

### 2.3. COULD HAVE (Deseable para Etapas Posteriores)

- **US-C01: Envío de Resumen y Comprobante vía Notificación Simulada (SMS / WhatsApp)**.
- **US-C02: Personalización de la Voz del Asistente** (selección de voz femenina/masculina con acento vallecaucano).
- **US-C03: Resumen Auditivo de Preparación Médica** (instrucciones verbales de ayuno de 8 horas para exámenes de laboratorio).

---

### 2.4. WON'T HAVE (Excluido Explícitamente de Esta Fase)

- **US-W01: Conexión en Vivo a Bases de Datos Gubernamentales (ADRES / MIPRES / SISPRO)**: Se utilizarán bases de datos sintéticas locales debidamente tipadas.
- **US-W02: Procesamiento de Pasarelas de Pago de Copagos en Línea**: La cuota moderadora se factura y cancela en taquilla física de la sede.
- **US-W03: Diagnóstico Clínico Automatizado o Prescripción de Medicamentos**: Prohibido estrictamente por lineamientos éticos, legales y de seguridad del proyecto.

---

## 3. Resumen Consolidado de Criterios de Aceptación Cuantificables

| Métrica | Objetivo Cuantificable | Mecanismo de Verificación |
| :--- | :--- | :--- |
| **Tiempo de Agendamiento Completo** | **< 60 segundos** | Cronometraje de sesión desde saludo inicial hasta comprobante emitido. |
| **Latencia de Respuesta del Agente** | **< 3.0 segundos** | Telemetría entre evento `onend` de reconocimiento y `speak()` de síntesis. |
| **Eficacia de Triage de Urgencias** | **100% de detección** | Batería de pruebas automatizadas con casos de urgencia vital (Resolución 5596). |
| **Tiempo de Generación de PDF** | **< 2.0 segundos** | Medición de generación del buffer PDF tras confirmación de cita. |
| **Conformidad de Accesibilidad** | **WCAG 2.1 Nivel AA (100%)** | Auditoría con herramientas automatizadas (Lighthouse / axe-core) y prueba con teclado. |
| **Protección de Datos Sensibles** | **0% datos en texto plano** | Inspección de la base de datos asegurando cifrado AES-256-GCM y HMAC en todos los registros de pacientes. |
| **Disponibilidad sin Costo** | **$0 USD en infraestructura** | Operación sobre capas gratuitas de Gemini/Groq, Docker open source y Next.js. |

