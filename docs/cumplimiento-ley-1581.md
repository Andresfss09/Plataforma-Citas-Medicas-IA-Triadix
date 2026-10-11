# Checklist y Declaración de Cumplimiento: Ley 1581 de 2012 y Decreto 1377 de 2013
## Plataforma de Voz Inteligente "CitaVoz EPS" — EPS TRIADIX (Cali, Colombia)

Este documento certifica el cumplimiento normativo en materia de Protección de Datos Personales y Tratamiento de Información Sensible en Salud para el asistente conversacional **CitaVoz EPS**.

---

## 1. Principios Rectores Implementados

| Principio Legal (Art. 4 Ley 1581) | Mecanismo Técnico Implementado en CitaVoz EPS | Estado |
|---|---|---|
| **Principio de Legalidad** | Registro de bases de datos conforme a la RNBD (Registro Nacional de Bases de Datos) de la Superintendencia de Industria y Comercio (SIC). | **CUMPLIDO** |
| **Principio de Finalidad** | La captura de síntomas, motivo y cédula tiene como propósito único y legítimo el agendamiento y notificación de citas médicas ambulatorias. | **CUMPLIDO** |
| **Principio de Libertad (Consentimiento)** | Validación de consentimiento informado auditable (`schema.consentimientos`) previo a procesar la reserva. Aprobación expresa en diálogo de voz. | **CUMPLIDO** |
| **Principio de Veracidad o Calidad** | Integración contra el catálogo oficial de afiliados; verificación con hash HMAC SHA-256 no reversible para evitar homónimos y desactualización. | **CUMPLIDO** |
| **Principio de Transparencia** | Derecho del titular a conocer sus citas programadas (`consultar_mis_citas`) y estado de afiliación sin barreras. | **CUMPLIDO** |
| **Principio de Acceso y Circulación Restringida** | Cifrado en reposo con **AES-256-GCM** para nombres, apellidos, teléfono y correos. Solo desencriptado en memoria durante la sesión activa. | **CUMPLIDO** |
| **Principio de Seguridad** | - Cabeceras HTTP estrictas (`Strict-Transport-Security`, `CSP`, `X-Content-Type-Options`, `X-Frame-Options`).<br>- Rate limiting por IP/token en memoria (Token Bucket).<br>- Bloqueo multitenant que impide a un usuario consultar o alterar citas de terceros. | **CUMPLIDO** |
| **Principio de Confidencialidad** | Cero PII (Personally Identifiable Information) en registros de logs (`metrics.ts` y auditoría estructurada). Enmascaramiento de cédula en comprobantes (`11****3456`). | **CUMPLIDO** |

---

## 2. Tratamiento de Datos Sensibles (Salud) — Art. 5 y 6

1. **Datos de Salud Protegidos**:
   - Los motivos de consulta y síntomas dictados por el usuario no se comparten con proveedores externos LLM sin anonimización.
   - En el prompt enviado a los LLM solo viaja el texto normalizado de la conversación dentro del turno actual, sin enviar nombres completos, números de teléfono ni direcciones de residencia.
2. **Excepción por Urgencia Médica Vital**:
   - Conforme al Art. 10 literal c) de la Ley 1581 (urgencia médica o sanitaria), ante la detección de banderas rojas (dolor torácico agudo, asfixia, ACV), el sistema suspende de inmediato la recolección ordinaria de datos y canaliza al afiliado hacia la **Línea de Emergencias 123** de Cali.

---

## 3. Derechos del Titular (Habeas Data)

El afiliado titular o su acompañante autorizado cuenta con los siguientes canales para ejercer sus derechos de Habeas Data:

- **Consulta**: El usuario puede preguntar por voz o interfaz web sus citas vigentes y verificar la autenticidad de su comprobante en `/api/citas/verificar/[codigo]`.
- **Actualización y Rectificación**: Mediante los canales presenciales en las 10 sedes IPS de EPS TRIADIX en Cali.
- **Supresión y Revocatoria (Derecho al Olvido)**:
  - Las sesiones conversacionales efímeras se purgan periódicamente.
  - La tabla de auditoría retiene únicamente trazas disociadas (UUID criptográficos, timestamps y códigos de error), sin almacenar texto de conversaciones con PII una vez concluida la interacción.

---

## 4. Procedimiento ante Incidentes de Seguridad (Brechas de Datos)

En cumplimiento de la Circular Externa 002 de la SIC:
1. **Detección y Aislamiento**: Las alertas de seguridad generadas por el sistema (`SLA ALERT`, token bucket exhaustion, inyecciones de parámetros) emiten eventos de telemetría inmediatos.
2. **Notificación a la Autoridad**: Toda sospecha fundada de fuga de datos personales o vulneración a la integridad de la base de datos será reportada a la Delegatura de Protección de Datos Personales de la SIC dentro de los 15 días hábiles siguientes.
3. **Comunicación al Titular**: Notificación directa por correo certificado o mensaje seguro al afiliado afectado si existiese riesgo para sus derechos fundamentales.

---

**Firma de Conformidad Técnica y Legal:**  
*Oficial de Privacidad y Cumplimiento de Datos — EPS TRIADIX*  
*Santiago de Cali, Colombia — Octubre 2026*

