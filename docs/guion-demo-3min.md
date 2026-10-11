# Guion de Demostración Ejecutiva (3 Minutos)
## CitaVoz EPS — Asistente de Voz Inteligente para EPS TRIADIX (Cali)

Este libreto está cronometrado para presentar las capacidades técnicas, de negocio y accesibilidad de la plataforma ante directivos médicos o evaluadores técnicos en exactamente **180 segundos**.

---

### Minuto 0:00 - 0:30 | Introducción y Accesibilidad
- **Presentador**:  
  *"Buenos días. Les presento **CitaVoz EPS**, el primer asistente conversacional de voz de costo cero en infraestructura ($0 USD) diseñado a la medida del sistema de salud colombiano para EPS TRIADIX en Cali.*  
  *El 42% de nuestros adultos mayores tienen dificultades navegando formularios complejos. Con CitaVoz, agendar una cita médica es tan simple como hablar."*
- **Acción**:  
  Abrir la pantalla principal y presionar el botón de voz central.

---

### Minuto 0:30 - 1:15 | Agendamiento Natural y Fonética Caleña
- **Usuario (Voz)**:  
  *"Hola, vé mira vé, tengo un dolor bajito en la cintura y necesito una cita médica en la sede Tequendama. Mi cédula es uno uno cuatro cuatro uno dos tres cuatro cinco seis."*
- **Asistente (Respuesta en <1.5s)**:  
  *"Con gusto. Para su molestia en la cintura lo orientaré con Medicina General en la sede Principal Tequendama. Tengo disponibilidad este jueves 16 a las 9:30 a. m. con el Dr. Carlos Andrés Caicedo. ¿Confirma esta cita?"*
- **Presentador destaca al público**:  
  *"Noten tres cosas clave: primero, comprendió la jerga caleña ('vé mira vé') y tradujo el dictado hablado de la cédula número por número. Segundo, realizó una búsqueda semántica híbrida con pgvector. Tercero, por regla de seguridad, NUNCA reserva sin confirmación explícita."*

---

### Minuto 1:15 - 1:45 | Comprobante Oficial, QR y Calendario
- **Usuario (Voz)**:  
  *"Sí, confirmo la cita."*
- **Asistente**:  
  *"Cita confirmada con éxito con el código CTX-2026-8492. ¿Desea que le muestre el comprobante o se lo envíe por correo?"*
- **Acción**:  
  El comprobante se renderiza en pantalla. El presentador hace clic en **"Descargar PDF Oficial"**.
- **Presentador**:  
  *"Aquí tenemos el PDF generado en servidor con pdf-lib: documento enmascarado por Ley 1581, código QR criptográfico para control de ingreso a la IPS y archivo .ics descargable para Google Calendar y iPhone con alarmas programadas a 24 y 2 horas."*

---

### Minuto 1:45 - 2:20 | Triage de Urgencias y Banderas Rojas
- **Presentador**:  
  *"Veamos ahora la seguridad clínica. ¿Qué ocurre si un paciente confunde una cita ordinaria con una urgencia vital?"*
- **Usuario (Voz)**:  
  *"Doctorcita, siento un dolor opresivo muy fuerte en el pecho que se me va al brazo izquierdo y me falta el aire."*
- **Asistente (Corte inmediato)**:  
  *"⚠️ ALERTA MÉDICA: Por favor escúcheme con atención. Los síntomas que describe indican una posible urgencia vital que NO puede esperar. Comuníquese de inmediato a la Línea 123 en Cali o acuda al servicio de urgencias de la Clínica Tequendama."*
- **Presentador**:  
  *"El sistema no diagnostica, suspende el agendamiento y prioriza salvar vidas canalizando a la Línea 123."*

---

### Minuto 2:20 - 3:00 | Panel Administrativo y Conclusión
- **Acción**:  
  Navegar a `/admin`.
- **Presentador**:  
  *"Finalmente, este es el panel gerencial de la EPS: monitoreo en vivo de las 10 sedes de Cali, ocupación, lista de espera automática de cupos liberados y telemetría de latencias por etapa sin almacenar datos sensibles.*  
  *CitaVoz EPS está listo para producción, probado con 50 hilos concurrentes sin doble reserva, y con costo de servidor de cero pesos. Muchas gracias."*

