import test from "node:test";
import assert from "node:assert/strict";
import { solicitarOtp, verificarOtp, getAuthenticatedAfiliado } from "../lib/auth";
import { checkRateLimit } from "../lib/rate-limit";
import { executeTool } from "../lib/tools/executor";
import { webMCP } from "../lib/webmcp/client";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

test("Suite de Backend y Herramientas del Agente (Fase 3)", async (t) => {
  const db = getDb();

  await t.test("1. Rate Limiting: debe bloquear tras exceder el límite permitido", () => {
    const testIp = `test-ip-${Date.now()}`;
    // Límite de 3 peticiones
    assert.equal(checkRateLimit(testIp, { maxRequests: 3 }).allowed, true);
    assert.equal(checkRateLimit(testIp, { maxRequests: 3 }).allowed, true);
    assert.equal(checkRateLimit(testIp, { maxRequests: 3 }).allowed, true);
    // Cuarta petición debe ser rechazada
    const blocked = checkRateLimit(testIp, { maxRequests: 3 });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
  });

  await t.test("2. Autenticación Ligera: Flujo de OTP y emisión de sesión", async () => {
    // Tomar afiliado existente (afi-1)
    const [afiliado] = await db
      .select()
      .from(schema.afiliados)
      .where(eq(schema.afiliados.id, "afi-1"));

    assert.ok(afiliado, "Afiliado afi-1 debe existir");

    // Solicitar OTP con fecha correcta
    const resSolicitud = await solicitarOtp({
      tipoDocumento: afiliado.tipoDocumento,
      numeroDocumento: "1100007919", // Cédula de afi-1 según seed
      fechaNacimiento: afiliado.fechaNacimiento,
    });

    assert.equal(resSolicitud.exito, true);
    assert.ok(resSolicitud.challengeId);
    assert.ok(resSolicitud.codigoOtpDebug);

    // Intentar verificar con código erróneo
    const resFallo = await verificarOtp({
      challengeId: resSolicitud.challengeId!,
      codigoOtp: "000000",
    });
    assert.equal(resFallo.exito, false);

    // Verificar con código correcto
    const resExito = await verificarOtp({
      challengeId: resSolicitud.challengeId!,
      codigoOtp: resSolicitud.codigoOtpDebug!,
    });

    assert.equal(resExito.exito, true);
    assert.ok(resExito.sessionToken);

    // Validar token de sesión en memoria
    const afiliadoSesion = getAuthenticatedAfiliado(resExito.sessionToken);
    assert.ok(afiliadoSesion);
    assert.equal(afiliadoSesion?.id, "afi-1");
  });

  await t.test("3. Tool verificar_afiliado: Identificación y estado de cobertura", async () => {
    const resultado = await executeTool("verificar_afiliado", {
      tipoDocumento: "CC",
      numeroDocumento: "1100007919",
    });

    assert.equal(resultado.exito, true);
    assert.equal(resultado.data.encontrado, true);
    assert.equal(resultado.data.activoParaAgendar, true);
  });

  await t.test("4. Tool buscar_especialidad_por_motivo: Detección de síntoma", async () => {
    const resultado = await executeTool("buscar_especialidad_por_motivo", {
      motivoConsulta: "Tengo un dolor muy fuerte de muela y encías",
    });

    assert.equal(resultado.exito, true);
    assert.equal(resultado.data.esEmergenciaVital, false);
    assert.ok(resultado.data.especialidadesRecomendadas.length > 0);
    assert.equal(resultado.data.especialidadesRecomendadas[0].nombre, "Odontología General");
  });

  await t.test("5. Tool reportar_urgencia: Protocolo prioritario 123", async () => {
    const resultado = await executeTool("reportar_urgencia", {
      sintomaCritico: "Siento una opresión en el pecho y me falta el aire",
    });

    assert.equal(resultado.exito, true);
    assert.equal(resultado.data.protocoloEmergenciaActivado, true);
    assert.equal(resultado.data.lineaDirecta, "123");
  });

  await t.test("6. Tool agendar_cita con validación de regla de negocio (remisión requerida)", async () => {
    // Afiliado afi-2 intentando agendar Cardiología (que requiere remisión y afi-2 no tiene)
    const [slotCardio] = await db
      .select()
      .from(schema.agendas)
      .where(eq(schema.agendas.especialidadId, "esp-cardio"))
      .limit(1);

    assert.ok(slotCardio);

    const resultadoBloqueo = await executeTool("agendar_cita", {
      afiliadoId: "afi-2",
      slotId: slotCardio.id,
      motivoConsulta: "Chequeo de corazón",
    });

    // Debe ser rechazado por falta de orden médica/autorización
    assert.equal(resultadoBloqueo.exito, false);
    assert.match(resultadoBloqueo.error || "", /requiere una autorización médica previa/);
  });

  await t.test("7. WebMCP Client: Detección de soporte y fallback HTTP unificado", async () => {
    const registro = await webMCP.registerAllTools();
    assert.ok(registro.registeredCount >= 10);

    // Invocación a través del cliente WebMCP
    const res = await webMCP.callTool("consultar_disponibilidad", {
      especialidadId: "esp-med-gen",
      sedeId: "sede-tequendama",
    });

    assert.equal(res.exito, true);
    assert.ok(res.data.franjas.length > 0);
  });

  await t.test("8. Auditoría: Traza registrada para cada ejecución", async () => {
    const logs = await db
      .select()
      .from(schema.auditoria)
      .where(eq(schema.auditoria.entidad, "tools"))
      .limit(5);

    assert.ok(logs.length > 0, "Debe haber registros de auditoría generados por las herramientas");
    assert.ok(logs[0].accion.startsWith("TOOL_EXECUTION_"));
  });
});

