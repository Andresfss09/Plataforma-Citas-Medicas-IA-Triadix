# Arquitectura del Sistema: CitaVoz EPS
## EPS TRIADIX (Cali, Colombia)

---

## 1. Visión General de la Arquitectura
**CitaVoz EPS** es una plataforma de agendamiento conversacional por voz diseñada para **EPS TRIADIX**, orientada a usuarios de todas las edades en Cali, especialmente adultos mayores y personas en situación de discapacidad motriz o visual.

La arquitectura sigue los principios de desacoplamiento, costo cero (usando herramientas open-source y tiers gratuitos de LLM), tipado estricto extremo a extremo con TypeScript y Zod, y estricto apego a la normativa de datos sensibles de salud en Colombia (Ley 1581 de 2012 y Decreto 1377 de 2013).

---

## 2. Diagrama de Componentes del Sistema

```mermaid
flowchart TB
    subgraph ClientLayer["Capa Cliente (Frontend Next.js 15 / WCAG 2.1 AA)"]
        direction TB
        subgraph VoiceModule["Motor de Voz Accesible"]
            SR["Web Speech API:\nSpeechRecognition (es-CO)"]
            SS["Web Speech API:\nSpeechSynthesis (es-CO)"]
            MicUI["Controlador Visual Siri-Style\n(Feedback Háptico/Auditivo/Visual)"]
            A11yFallback["Fallback Accesible\n(Teclado + Pantalla de Texto)"]
        end

        subgraph WebMCPLayer["Capa WebMCP en el Navegador"]
            WebMCPDetector{"¿Soporta\nnavigator.modelContext?"}
            WebMCPBridge["WebMCP Bridge\n(Ejecución local en cliente)"]
        end

        TriageFilterClient["Filtro Rápido de Triage\n(Detección instantánea de alarma)"]
    end

    subgraph ServerLayer["Capa Servidor (Next.js App Router / Server Actions / API)"]
        direction TB
        AgentOrchestrator["Orquestador del Agente Conversacional\n(Gestión de Turnos, Contexto y Guardrails)"]
        
        subgraph LLMAbstraction["Abstracción LLMProvider"]
            LLMInterface["Interfaz Genérica LLMProvider"]
            GeminiAdapter["Adaptador Google Gemini\n(Free Tier - gemini-1.5-flash)"]
            GroqAdapter["Adaptador Groq / LLaMA-3\n(Fallback Ultra Rápido)"]
            OllamaAdapter["Adaptador Ollama Local\n(Offline / On-Premise)"]
        end

        subgraph ToolsLayer["Capa Unificada de Tools (Zod Contratos)"]
            ToolRegistry["Registry de Herramientas"]
            MCPHttpServer["Fallback Servidor MCP / HTTP API"]
        end

        subgraph CoreServices["Servicios de Negocio"]
            AvailService["Servicio de Disponibilidad\n(Cálculo de Franjas en Cali)"]
            AffilService["Servicio de Afiliación\n(Validación de Derechos y Copagos)"]
            BookingService["Servicio de Agendamiento\n(Bloqueo Atómico y Confirmación)"]
            PDFService["Servicio de Comprobantes PDF\n(Formato America/Bogota - 12h)"]
            AuditService["Servicio de Auditoría & Habeas Data\n(Logs Criptográficos Ley 1581)"]
        end
    end

    subgraph DataLayer["Capa de Persistencia (PostgreSQL 16 + pgvector)"]
        PostgresDB[("PostgreSQL 16 Relacional\n(Pacientes, Citas, Médicos, Sedes)")]
        PgVectorExt[("pgvector\n(Embeddings de Especialidades y Síntomas)")]
        DataEncryption["Capa de Cifrado AES-256-GCM\n(Protección de Datos Sensibles en Reposo)"]
    end

    subgraph ExternalServices["Servicios y Canales Externos"]
        Emergencias123["Línea de Emergencias 123 Cali\n(Protocolo de Urgencia Vital)"]
        GeminiAPI["Google Gemini API Cloud"]
    end

    %% Relaciones de flujo
    MicUI <--> SR
    MicUI <--> SS
    SR --> TriageFilterClient
    TriageFilterClient -- "Alarma Crítica Detectada" --> Emergencias123
    TriageFilterClient -- "Flujo Normal" --> WebMCPDetector
    
    WebMCPDetector -- "Sí" --> WebMCPBridge
    WebMCPDetector -- "No" --> MCPHttpServer
    WebMCPBridge <--> AgentOrchestrator
    MCPHttpServer <--> AgentOrchestrator

    AgentOrchestrator <--> LLMInterface
    LLMInterface --> GeminiAdapter
    LLMInterface --> GroqAdapter
    LLMInterface --> OllamaAdapter
    GeminiAdapter <--> GeminiAPI

    AgentOrchestrator <--> ToolRegistry
    ToolRegistry --> AvailService
    ToolRegistry --> AffilService
    ToolRegistry --> BookingService
    ToolRegistry --> PDFService
    ToolRegistry --> AuditService

    AvailService <--> PostgresDB
    AffilService <--> PostgresDB
    BookingService <--> PostgresDB
    AuditService <--> PostgresDB
    PostgresDB <--> DataEncryption
    PostgresDB <--> PgVectorExt
    BookingService --> PDFService
    PDFService -. "Entrega de Comprobante" .-> ClientLayer
```

---

## 3. Descripción Detallada de Componentes

### 3.1. Frontend de Voz Accesible
- **Speech Recognition (`es-CO`)**:
  - Utiliza `webkitSpeechRecognition` / `SpeechRecognition` nativo con dialecto configurado en `es-CO` y fallback a `es-419`.
  - Sistema de reconocimiento continuo con umbral de silencio para detección de fin de turno del usuario.
- **Speech Synthesis (`es-CO`)**:
  - Síntesis de voz con tono cordial, calmado y pronunciación colombiana.
  - Pausas estratégicas para facilitar la comprensión de adultos mayores.
- **Interfaz "Siri-Style" & Accesibilidad (WCAG 2.1 AA)**:
  - Onda visual reactiva al volumen de entrada y salida.
  - Botón táctil grande (mínimo 64x64 px) con alto contraste (> 7:1 contra el fondo).
  - Anuncios dinámicos mediante regiones `aria-live="polite"` y `aria-live="assertive"`.
  - Fallback inmediato a teclado y entrada de texto para personas con dificultades del habla o entornos ruidosos.

### 3.2. Orquestador del Agente Conversacional
- Administra el historial de turnos, el estado del agendamiento y el contexto del afiliado autenticado.
- **Defensa en Profundidad contra Prompt Injection**:
  - El LLM **nunca interactúa de manera directa con la base de datos**.
  - El LLM solo puede proponer la llamada a herramientas estrictamente tipadas y validadas mediante esquemas Zod.
  - Si el usuario intenta inyectar instrucciones para modificar precios, obtener datos de otros pacientes o consultar tablas internas, el orquestador descarta la instrucción y mantiene el objetivo de agendamiento.

### 3.3. Proveedor LLM (`LLMProvider`)
Capa de abstracción con interfaz unificada:
```typescript
export interface LLMProvider {
  generateResponse(
    messages: ConversationMessage[],
    availableTools: ToolDefinition[]
  ): Promise<LLMResponse>;
}
```
- **GeminiAdapter**: Implementación principal usando la capa gratuita de Google Gemini (`gemini-1.5-flash`), con soporte nativo de function calling.
- **GroqAdapter**: Implementación para fallback de ultra baja latencia con modelos como `llama-3.3-70b-versatile`.
- **OllamaAdapter**: Soporte para entornos locales u on-premise desconectados de internet.

### 3.4. Capa de Tools: WebMCP (`navigator.modelContext`) y Fallback HTTP
- **WebMCP**: Si el navegador del usuario implementa el estándar experimental `navigator.modelContext`, las herramientas del agente se exponen directamente al contexto del navegador, permitiendo invocaciones con latencia mínima en el cliente.
- **Servidor MCP / HTTP API Fallback**: Si el navegador no soporta `navigator.modelContext`, se utiliza exactamente el mismo catálogo de herramientas ejecutado desde el servidor Next.js a través de Server Actions o API endpoints REST/JSON-RPC.
- **Catálogo de Tools Compartido**:
  1. `verificar_identidad_afiliado(tipoDoc, numeroDoc)`
  2. `consultar_sedes_cali(zona?, comuna?)`
  3. `consultar_disponibilidad(especialidadId, sedeId?, fechaInicio?, fechaFin?)`
  4. `agendar_cita(afiliadoId, slotId, motivoConsulta)`
  5. `consultar_citas_activas(afiliadoId)`
  6. `reprogramar_cita(citaId, nuevoSlotId)`
  7. `cancelar_cita(citaId, motivo)`
  8. `generar_comprobante_pdf(citaId)`
  9. `activar_protocolo_urgencia(motivoAlarma)`

### 3.5. Servicio de Disponibilidad & Agendamiento
- Gestiona las franjas horarias médicas respetando la zona horaria `America/Bogota` (UTC-5).
- Soporta bloqueo atómico en base de datos para evitar colisiones cuando dos afiliados intentan seleccionar la misma franja horaria simultáneamente.

### 3.6. Servicio de Comprobantes PDF
- Genera un archivo PDF liviano y accesible que incluye:
  - Membrete oficial de **EPS TRIADIX**.
  - Código único de cita (ej. `CTX-2026-7841`).
  - Datos del paciente (nombre, tipo y número de documento).
  - Fecha en formato colombiano `DD/MM/AAAA` y hora en formato 12 horas con `a. m.` / `p. m.`.
  - Nombre del profesional de la salud y registro médico (RETHUS).
  - Dirección completa de la sede en Cali y recomendaciones de preparación médica (ayuno, llegar 20 minutos antes, documento original).
  - Código QR de validación rápida en la entrada de la sede.

### 3.7. PostgreSQL 16 con pgvector
- **Persistencia Relacional**: Almacenamiento íntegro de sedes, médicos, pacientes, citas, consentimientos y logs.
- **Extensión pgvector**: Permite búsqueda de similitud de cosenos sobre vectores de especialidades médicas a partir del motivo expresado por el usuario en lenguaje coloquial (ej. *"me duele una muela"* -> `ODONT`, *"no veo bien de lejos"* -> `OPTOM`).
- **Cifrado en Reposo**: Cifrado simétrico autenticado AES-256-GCM para datos sensibles de salud de los pacientes.

---

## 4. Diagrama de Secuencia: Flujo Completo de Agendamiento por Voz

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Afiliado (Cali)
    participant VoiceUI as Frontend / Web Speech API
    participant Triage as Triage Guard
    participant Agent as Orquestador CitaVoz
    participant LLM as LLMProvider (Gemini)
    participant Tools as Capa de Tools (WebMCP / HTTP)
    participant DB as PostgreSQL + pgvector
    participant PDF as Generador PDF

    Usuario->>VoiceUI: "Hola, necesito una cita de medicina general en Versalles"
    VoiceUI->>VoiceUI: SpeechRecognition (es-CO) transcribe audio
    VoiceUI->>Triage: Evaluar texto transcrito
    Triage-->>VoiceUI: Sin banderas rojas de urgencia vital
    VoiceUI->>Agent: Mensaje de usuario + Contexto de sesión
    Agent->>LLM: Prompt del sistema + Historial + Tools Zod
    LLM-->>Agent: Invocación de Tool: consultar_disponibilidad(MED_GEN, sede-versalles)
    Agent->>Tools: Ejecutar consultar_disponibilidad(...)
    Tools->>DB: Query disponibilidad_medica en sede Versalles
    DB-->>Tools: 3 franjas encontradas (ej. mañana 8:00 a. m., 10:30 a. m.)
    Tools-->>Agent: Resultados de disponibilidad
    Agent->>LLM: Inyectar resultados de la herramienta
    LLM-->>Agent: Respuesta: "Tengo disponible mañana a las 8:00 de la mañana con el Dr. Carlos Caicedo..."
    Agent->>VoiceUI: Texto de respuesta
    VoiceUI->>VoiceUI: SpeechSynthesis (es-CO) reproduce voz
    VoiceUI-->>Usuario: Audio cordial y claro

    Usuario->>VoiceUI: "Listo, a las 8 de la mañana me sirve perfecto"
    VoiceUI->>Agent: Confirmación de usuario
    Agent->>LLM: Procesar confirmación
    LLM-->>Agent: Invocación de Tool: agendar_cita(...)
    Agent->>Tools: agendar_cita(pacienteId, slotId, "Control general")
    Tools->>DB: Transacción: Actualizar slot a 'reservada' + Insertar cita
    DB-->>Tools: Cita creada (Código: CTX-2026-9014)
    Tools->>PDF: Generar PDF con comprobante de cita
    PDF-->>Tools: URL / Buffer del PDF generado
    Tools-->>Agent: Cita confirmada + Comprobante listo
    Agent->>VoiceUI: "Su cita quedó confirmada para mañana a las 8:00 a. m. Su comprobante está listo para descargar."
    VoiceUI-->>Usuario: Lectura por voz y botón accesible de descarga en pantalla
```

---

## 5. Estrategia de Redundancia y Continuidad Operativa (Costo Cero)

| Componente | Opción Primaria | Opción Secundaria / Fallback | Mecanismo de Activación |
| :--- | :--- | :--- | :--- |
| **Entrada de Usuario** | Web Speech Recognition (`es-CO`) | Formulario accesible por teclado y texto | Fallo de permisos, ruido excesivo o navegador incompatible. |
| **Salida de Audio** | Web Speech Synthesis (`es-CO`) | Mensajes de texto en pantalla (`aria-live`) | Ausencia de sintetizador de voz o preferencia del usuario. |
| **Herramientas del Agente** | WebMCP (`navigator.modelContext`) | Endpoints API / Server Actions HTTP | Ausencia de soporte de WebMCP en el navegador cliente. |
| **Modelo LLM** | Google Gemini 1.5 Flash (Free Tier) | Groq (Llama-3.3-70B) / Ollama | Cuota superada (HTTP 429) o latencia mayor a 4 segundos. |
| **Base de Datos** | PostgreSQL 16 + pgvector (Docker) | PGlite local (WASM + pgvector) | Entorno de desarrollo local sin contenedor activo. |
