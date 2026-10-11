export interface TriageResult {
  isEmergency: boolean;
  severity: "CRITICA" | "ALTA" | "NINGUNA";
  detectedKeywords: string[];
  protocolMessage: string;
  emergencyNumber: string;
  callCenterCali: string;
  recommendedAction: string;
}

/**
 * Patrones y términos clave de alerta médica máxima (Triage I y II según Resolución 5596 de Colombia).
 */
const EMERGENCY_PATTERNS: { regex: RegExp; label: string; severity: "CRITICA" | "ALTA" }[] = [
  {
    regex: /(dolor (fuerte|opresivo|intenso|agudo) en el pecho|opresi[oó]n en el pecho|siento que me va a dar un infarto|infarto|paro cardiaco)/i,
    label: "Sospecha de evento coronario / dolor torácico agudo",
    severity: "CRITICA",
  },
  {
    regex: /(no puedo respirar|dificultad (para|al) respirar|me falta el aire|asfixia|ahogo severo|siento que me ahogo)/i,
    label: "Dificultad respiratoria severa / asfixia",
    severity: "CRITICA",
  },
  {
    regex: /(sangrado abundante|hemorragia|est[aá] botando mucha sangre|sangre que no para|vomitando sangre|sangre por la boca)/i,
    label: "Hemorragia activa o sangrado abundante",
    severity: "CRITICA",
  },
  {
    regex: /(perdi[oó] el conocimiento|desmayo|inconsciente|no responde|convulsi[oó]n|convulsionando|desvanecimiento)/i,
    label: "Alteración del estado de conciencia o convulsiones",
    severity: "CRITICA",
  },
  {
    regex: /(par[aá]lisis|cara torcida|no puede hablar|no mueve un brazo|no siente la mitad del cuerpo|derrame cerebral|accidente cerebrovascular|acv)/i,
    label: "Sospecha de ataque cerebrovascular (ACV)",
    severity: "CRITICA",
  },
  {
    regex: /(me quiero morir|quitarme la vida|suicidio|ideaci[oó]n suicida|no quiero vivir m[aá]s|hacerme da[ñn]o)/i,
    label: "Riesgo vital en salud mental / ideación suicida",
    severity: "CRITICA",
  },
  {
    regex: /(fuertes dolores de parto|se me rompi[oó] la fuente|coronando|parto inminente)/i,
    label: "Trabajo de parto inminente",
    severity: "CRITICA",
  },
  {
    regex: /(quemadura grave|quemadura con qu[ií]micos|accidente de tr[aá]nsito grave|fractura expuesta)/i,
    label: "Trauma mayor o quemadura de alto grado",
    severity: "ALTA",
  },
];

/**
 * Evalúa el texto ingresado o dicho por el paciente para determinar si presenta criterios
 * de urgencia vital médica inmediata. Si se detecta, se interrumpe el agendamiento ordinario.
 */
export function evaluateMedicalTriage(input: string): TriageResult {
  if (!input || typeof input !== "string") {
    return {
      isEmergency: false,
      severity: "NINGUNA",
      detectedKeywords: [],
      protocolMessage: "",
      emergencyNumber: "123",
      callCenterCali: "(602) 489-8000",
      recommendedAction: "Continuar con agendamiento de cita ordinaria",
    };
  }

  const normalized = input.trim();
  const matchedLabels: string[] = [];
  let highestSeverity: "CRITICA" | "ALTA" | "NINGUNA" = "NINGUNA";

  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.regex.test(normalized)) {
      matchedLabels.push(pattern.label);
      if (pattern.severity === "CRITICA") {
        highestSeverity = "CRITICA";
      } else if (highestSeverity !== "CRITICA") {
        highestSeverity = "ALTA";
      }
    }
  }

  if (matchedLabels.length > 0) {
    return {
      isEmergency: true,
      severity: highestSeverity,
      detectedKeywords: matchedLabels,
      protocolMessage:
        "⚠️ ALERTA MÉDICA: Por favor escúcheme con atención. Los síntomas que describe indican una posible urgencia médica vital que NO puede esperar a una cita programada. Por su seguridad, comuníquese de inmediato a la Línea de Emergencias 123 en Cali o acuda al servicio de urgencias más cercano (EPS TRIADIX Clínica Tequendama / Hospital Universitario del Valle).",
      emergencyNumber: "123",
      callCenterCali: "(602) 489-8000",
      recommendedAction: "Llamar al 123 o dirigirse inmediatamente a urgencias hospitalarias en Cali.",
    };
  }

  return {
    isEmergency: false,
    severity: "NINGUNA",
    detectedKeywords: [],
    protocolMessage: "",
    emergencyNumber: "123",
    callCenterCali: "(602) 489-8000",
    recommendedAction: "Continuar con agendamiento de cita ordinaria",
  };
}

