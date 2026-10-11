# Manual del Administrador: Panel Gerencial EPS TRIADIX
## Operación, Telemetría y Gestión de Agendas en Cali

El panel administrativo (`/admin`) proporciona visibilidad en tiempo real sobre la capacidad instalada, demanda por especialidad, tiempos de respuesta y reasignación de cupos liberados.

---

## 1. Acceso al Panel Administrativo

- **Ruta de acceso**: `https://citavoz-eps.vercel.app/admin` (o `http://localhost:3000/admin` en local).
- **Control de seguridad**: Protegido por sesión institucional de auditoría. Todos los accesos quedan registrados en la tabla `auditoria` con IP y marca de tiempo.

---

## 2. Indicadores Clave de Rendimiento (KPIs)

En la cabecera del panel se visualizan cuatro métricas estratégicas:

1. **Ocupación Global de Agendas**:
   - Porcentaje de franjas reservadas sobre el total de cupos habilitados para el mes en curso.
2. **Tasa de Inasistencia / No-Show Proyectada**:
   - Indicador mitigado gracias a los recordatorios multicanal a 24 horas y 2 horas antes de la cita.
3. **Tiempo Promedio de Agendamiento por Voz**:
   - Meta operativa: $\le 65\text{ segundos}$ por interacción completa de agendamiento.
4. **Cupos Reasignados por Lista de Espera**:
   - Total de citas canceladas que fueron reasignadas automáticamente a afiliados en lista de espera sin intervención humana.

---

## 3. Ocupación por Sede IPS en Santiago de Cali

La tabla interactiva desglosa las 10 sedes IPS de EPS TRIADIX:

| Sede IPS | Comuna | Zona | Cupos Totales | Reservados | Ocupación % |
|---|---|---|---|---|---|
| Sede Principal Tequendama | Comuna 19 | Sur | 850 | 790 | 92.9% |
| Sede Versalles | Comuna 2 | Norte | 600 | 510 | 85.0% |
| Sede Pasoancho | Comuna 17 | Sur | 520 | 440 | 84.6% |
| Sede Pediátrica San Fernando | Comuna 3 | Centro | 400 | 350 | 87.5% |
| Sede El Diamante | Comuna 13 | Oriente | 380 | 290 | 76.3% |
| Sede Salomia | Comuna 5 | Norte | 350 | 280 | 80.0% |
| Sede El Guabal | Comuna 10 | Sur | 320 | 260 | 81.2% |
| Sede Ciudad Córdoba | Comuna 15 | Oriente | 300 | 230 | 76.7% |
| Sede Ciudad Jardín | Comuna 22 | Sur | 280 | 250 | 89.3% |
| Sede Aguacatal | Comuna 1 | Oeste | 200 | 140 | 70.0% |

---

## 4. Gestión de la Lista de Espera Automática

Cuando un afiliado cancela una cita:
1. El slot se marca inmediatamente como disponible.
2. El servicio `waitlist.service.ts` busca al primer afiliado en cola para esa especialidad y sede.
3. El sistema asigna la reserva y genera la notificación multicanal respectiva.
4. Si la sede no tiene cola, la franja queda visible para cualquier afiliado en el catálogo público.

---

## 5. Telemetría y SLA sin PII

- **Objetivo SLA de Latencia**: $\le 3000\text{ ms}$ en la respuesta percibida del agente.
- **Desglose de tiempos**:
  - `STT`: $\approx 150 - 300\text{ ms}$ (Web Speech API).
  - `LLM`: $\approx 250 - 600\text{ ms}$ (Gemini 1.5 Flash / Groq).
  - `Tools (SQL/pgvector)`: $\approx 15 - 50\text{ ms}$.
  - `TTS`: $\approx 100 - 200\text{ ms}$.
- Los registros se guardan completamente anonimizados cumpliendo con la **Ley 1581 de 2012**.

