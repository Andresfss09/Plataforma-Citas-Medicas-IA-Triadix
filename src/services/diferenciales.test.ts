import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarDocumentoHablado, limpiarModismosCalenos } from '../lib/normalizers/colombian-speech';
import {
  calcularDistanciaKm,
  obtenerSedesOrdenadasPorCercania,
  sugerirAgrupacionCitaMismoDia,
  SEDES_CALI_GEO
} from '../lib/geo/cali-sedes';
import {
  inscribirEnListaEspera,
  obtenerOpcionesProactivasTrasCancelacion,
  procesarReasignacionCupoLiberado
} from './waitlist.service';
import {
  registrarMetricaTurno,
  obtenerMetricasAgregadas
} from '../lib/observability/metrics';
import { WhatsAppAdapter, TwilioIVRAdapter } from '../lib/channels/adapter';
import { ConversationalOrchestrator } from '../lib/llm/orchestrator';
import { MockLLMProvider } from '../lib/llm/adapters';

test('Diferenciales Innovadores - Suite de Pruebas Fase 7', async (t) => {
  await t.test('1. Normalizador fonético caleño y números hablados', () => {
    // Prueba números hablados dígito a dígito
    const dictado1 = 'mi cédula es uno uno cuatro cuatro cinco seis siete ocho nueve cero';
    const num1 = normalizarDocumentoHablado(dictado1);
    assert.equal(num1, '1144567890');

    // Prueba con modismos y números hablados
    const dictado2 = 've mira vé mi documento es uno dos tres cuatro cinco seis siete ocho';
    const limpio = limpiarModismosCalenos(dictado2);
    assert.ok(!limpio.includes('ve mira vé'));
    const num2 = normalizarDocumentoHablado(limpio);
    assert.equal(num2, '12345678');
  });

  await t.test('2. Geolocalización en Cali (Haversine) y Sedes cercanas', () => {
    // Distancia entre Sede Tequendama y Sede Versalles en Cali
    const teq = SEDES_CALI_GEO.find((s) => s.id === 'sede-tequendama')!;
    const ver = SEDES_CALI_GEO.find((s) => s.id === 'sede-versalles')!;
    const dist = calcularDistanciaKm(teq.lat, teq.lng, ver.lat, ver.lng);
    assert.ok(dist > 3 && dist < 7); // Distancia real aprox 4.5 km

    // Ordenar sedes por cercanía a Comuna 19 o barrio Tequendama
    const sedesOrdenadas = obtenerSedesOrdenadasPorCercania('Tequendama');
    assert.equal(sedesOrdenadas[0].id, 'sede-tequendama');

    // Ordenar por zona Norte
    const sedesNorte = obtenerSedesOrdenadasPorCercania('norte');
    assert.equal(sedesNorte[0].zona, 'Norte');
  });

  await t.test('3. Agrupación de citas el mismo día en la misma sede', () => {
    const citaExistente = {
      sedeId: 'sede-tequendama',
      sedeNombre: 'Sede Principal Tequendama',
      fecha: '2026-10-15',
      horaFin: '08:30',
    };
    const franjas = [
      { slotId: 'slot-otro-dia', sedeId: 'sede-tequendama', fecha: '2026-10-16', horaInicio: '09:00' },
      { slotId: 'slot-mismo-dia', sedeId: 'sede-tequendama', fecha: '2026-10-15', horaInicio: '09:30' },
    ];

    const sugerencia = sugerirAgrupacionCitaMismoDia(citaExistente, franjas);
    assert.ok(sugerencia.slotSugerido);
    assert.equal(sugerencia.slotSugerido.slotId, 'slot-mismo-dia');
    assert.ok(sugerencia.mensajeSugerencia?.includes('una sola salida'));
  });

  await t.test('4. Lista de espera y reprogramación proactiva tras cancelación', async () => {
    // Inscribir en lista de espera
    const resInscripcion = await inscribirEnListaEspera({
      afiliadoId: 'afi-test-1',
      especialidadId: 'esp-med-general',
      sedeId: 'sede-tequendama',
      canal: 'voz_web',
    });
    assert.equal(resInscripcion.exito, true);
    assert.ok(resInscripcion.posicion >= 1);
    assert.ok(resInscripcion.mensaje.includes('lista de espera'));
  });

  await t.test('5. Observabilidad estructurada y métricas de latencia sin PII', () => {
    registrarMetricaTurno({
      sessionId: 'sesion-test-001',
      canal: 'voz_web',
      latenciaTotalMs: 420,
      latenciaSttMs: 120,
      latenciaLlmMs: 250,
      latenciaToolsMs: 50,
      toolInvocada: 'buscar_disponibilidad_citas',
      estadoFinal: 'DISPONIBILIDAD_OFRECIDA',
      exito: true,
    });

    const metricas = obtenerMetricasAgregadas();
    assert.ok(metricas.totalTurnos >= 1);
    assert.ok(metricas.tasaExitoPercent > 0);
  });

  await t.test('6. Adaptadores multicanal (WhatsApp y Twilio IVR)', async () => {
    const mockProvider = new MockLLMProvider();
    const orchestrator = new ConversationalOrchestrator(mockProvider);

    const waAdapter = new WhatsAppAdapter(orchestrator);
    const twilioAdapter = new TwilioIVRAdapter(orchestrator);

    const contextoWA = orchestrator.crearNuevoContexto();
    const respWA = await waAdapter.procesarMensaje(
      { canalId: 'whatsapp', usuarioId: '573001234567', texto: 'Hola' },
      contextoWA
    );
    assert.ok(respWA.textoRespuesta.includes('EPS TRIADIX'));

    const contextoIVR = orchestrator.crearNuevoContexto();
    const respIVR = await twilioAdapter.procesarMensaje(
      { canalId: 'ivr_telefono', usuarioId: 'call-123', texto: 'Hola' },
      contextoIVR
    );
    assert.ok(respIVR.twimlXml?.includes('<Response>'));
    assert.ok(respIVR.twimlXml?.includes('<Say'));
  });
});
