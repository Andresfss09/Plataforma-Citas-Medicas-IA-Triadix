import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMedicalTriage } from "./triage";

test("Triage de Emergencias Vitales (Línea 123 Cali)", async (t) => {
  await t.test("debe detectar sospecha de infarto o dolor torácico severo y activar alarma", () => {
    const input = "Doctora, tengo un dolor fuerte en el pecho y me baja por el brazo izquierdo";
    const result = evaluateMedicalTriage(input);

    assert.equal(result.isEmergency, true);
    assert.equal(result.severity, "CRITICA");
    assert.equal(result.emergencyNumber, "123");
    assert.match(result.protocolMessage, /123/);
  });

  await t.test("debe detectar dificultad respiratoria aguda / asfixia", () => {
    const input = "No puedo respirar bien, me falta el aire y siento ahogo";
    const result = evaluateMedicalTriage(input);

    assert.equal(result.isEmergency, true);
    assert.equal(result.severity, "CRITICA");
  });

  await t.test("debe detectar sangrado abundante o hemorragia", () => {
    const input = "Mi papá se cortó y tiene un sangrado abundante que no para";
    const result = evaluateMedicalTriage(input);

    assert.equal(result.isEmergency, true);
    assert.equal(result.severity, "CRITICA");
  });

  await t.test("debe detectar ideación suicida y priorizar línea de emergencia", () => {
    const input = "Me siento desesperado, me quiero morir y no tengo salida";
    const result = evaluateMedicalTriage(input);

    assert.equal(result.isEmergency, true);
    assert.equal(result.severity, "CRITICA");
  });

  await t.test("NO debe catalogar como emergencia solicitudes ordinarias de consulta", () => {
    const inputs = [
      "Quiero una cita de medicina general para revisión de la tensión",
      "Necesito una cita de odontología para hacerme una limpieza dental",
      "Tengo cita para optometría porque necesito cambiar las gafas",
      "Buenas tardes, quisiera saber qué médicos atienden en la sede Versalles",
    ];

    for (const input of inputs) {
      const result = evaluateMedicalTriage(input);
      assert.equal(result.isEmergency, false, `Falló para entrada ordinaria: ${input}`);
      assert.equal(result.severity, "NINGUNA");
    }
  });
});

