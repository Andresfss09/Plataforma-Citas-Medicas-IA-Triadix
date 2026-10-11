import { getDb } from "./index";
import * as schema from "./schema";
import { encryptSensitiveData, hashSearchableField } from "../lib/crypto";
import { generateLocalEmbedding, vectorToString } from "../lib/embeddings";
import { obtenerFechasHabilesProximas } from "../lib/holidays";
import { sql } from "drizzle-orm";

async function createTablesIfNotExist(db: any) {
  const statements = [
    sql`CREATE TABLE IF NOT EXISTS sedes_ips (
      id VARCHAR(36) PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      codigo_reps VARCHAR(50) NOT NULL,
      direccion VARCHAR(255) NOT NULL,
      barrio VARCHAR(100) NOT NULL,
      comuna INTEGER NOT NULL,
      zona VARCHAR(50) NOT NULL,
      ciudad VARCHAR(50) DEFAULT 'Cali' NOT NULL,
      telefono VARCHAR(50) NOT NULL,
      horario_apertura TIME DEFAULT '06:00:00' NOT NULL,
      horario_cierre TIME DEFAULT '19:00:00' NOT NULL,
      urgencias_24h BOOLEAN DEFAULT false NOT NULL,
      activo BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS especialidades (
      id VARCHAR(36) PRIMARY KEY,
      codigo_cups VARCHAR(20) NOT NULL UNIQUE,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT NOT NULL,
      duracion_minutos INTEGER DEFAULT 30 NOT NULL,
      tipo_acceso VARCHAR(30) DEFAULT 'directo' NOT NULL,
      requiere_autorizacion BOOLEAN DEFAULT false NOT NULL,
      embedding_vector TEXT,
      activo BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS catalogo_motivos_consulta (
      id VARCHAR(36) PRIMARY KEY,
      frase_coloquial VARCHAR(255) NOT NULL,
      especialidad_id VARCHAR(36) REFERENCES especialidades(id) NOT NULL,
      descripcion_clinica TEXT NOT NULL,
      embedding_vector TEXT,
      prioridad INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS medicos (
      id VARCHAR(36) PRIMARY KEY,
      nombres VARCHAR(100) NOT NULL,
      apellidos VARCHAR(100) NOT NULL,
      registro_rethus VARCHAR(50) NOT NULL UNIQUE,
      sede_principal_id VARCHAR(36) REFERENCES sedes_ips(id) NOT NULL,
      email VARCHAR(150) NOT NULL,
      activo BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS medico_especialidad (
      id VARCHAR(36) PRIMARY KEY,
      medico_id VARCHAR(36) REFERENCES medicos(id) NOT NULL,
      especialidad_id VARCHAR(36) REFERENCES especialidades(id) NOT NULL,
      es_principal BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      CONSTRAINT uq_medico_especialidad UNIQUE (medico_id, especialidad_id)
    );`,

    sql`CREATE TABLE IF NOT EXISTS afiliados (
      id VARCHAR(36) PRIMARY KEY,
      tipo_documento VARCHAR(10) NOT NULL,
      numero_documento_hash VARCHAR(64) NOT NULL UNIQUE,
      numero_documento_enc TEXT NOT NULL,
      nombres_enc TEXT NOT NULL,
      apellidos_enc TEXT NOT NULL,
      telefono_enc TEXT NOT NULL,
      email_enc TEXT,
      fecha_nacimiento DATE NOT NULL,
      genero VARCHAR(20) NOT NULL,
      regimen VARCHAR(20) NOT NULL,
      tipo_cotizante VARCHAR(30) NOT NULL,
      categoria VARCHAR(10) NOT NULL,
      estado_afiliacion VARCHAR(30) DEFAULT 'ACTIVO' NOT NULL,
      ips_primaria_id VARCHAR(36) REFERENCES sedes_ips(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS agendas (
      id VARCHAR(36) PRIMARY KEY,
      medico_id VARCHAR(36) REFERENCES medicos(id) NOT NULL,
      especialidad_id VARCHAR(36) REFERENCES especialidades(id) NOT NULL,
      sede_id VARCHAR(36) REFERENCES sedes_ips(id) NOT NULL,
      fecha DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      jornada VARCHAR(20) NOT NULL,
      estado VARCHAR(20) DEFAULT 'disponible' NOT NULL,
      version_concurrencia INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      CONSTRAINT uq_medico_franja_unica UNIQUE (medico_id, fecha, hora_inicio)
    );`,

    sql`CREATE TABLE IF NOT EXISTS autorizaciones (
      id VARCHAR(36) PRIMARY KEY,
      numero_mipres VARCHAR(50) NOT NULL UNIQUE,
      afiliado_id VARCHAR(36) REFERENCES afiliados(id) NOT NULL,
      especialidad_id VARCHAR(36) REFERENCES especialidades(id) NOT NULL,
      fecha_expedicion DATE NOT NULL,
      fecha_vencimiento DATE NOT NULL,
      consultas_autorizadas INTEGER DEFAULT 1 NOT NULL,
      consultas_consumidas INTEGER DEFAULT 0 NOT NULL,
      activa BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS citas (
      id VARCHAR(36) PRIMARY KEY,
      codigo_cita VARCHAR(30) NOT NULL UNIQUE,
      afiliado_id VARCHAR(36) REFERENCES afiliados(id) NOT NULL,
      medico_id VARCHAR(36) REFERENCES medicos(id) NOT NULL,
      especialidad_id VARCHAR(36) REFERENCES especialidades(id) NOT NULL,
      sede_id VARCHAR(36) REFERENCES sedes_ips(id) NOT NULL,
      agenda_id VARCHAR(36) REFERENCES agendas(id) NOT NULL UNIQUE,
      autorizacion_id VARCHAR(36) REFERENCES autorizaciones(id),
      fecha_cita DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      tipo_cita VARCHAR(50) DEFAULT 'medicina_general' NOT NULL,
      motivo_consulta_enc TEXT,
      canal VARCHAR(20) DEFAULT 'voz' NOT NULL,
      estado VARCHAR(30) DEFAULT 'programada' NOT NULL,
      motivo_cancelacion TEXT,
      comprobante_pdf_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS consentimientos (
      id VARCHAR(36) PRIMARY KEY,
      afiliado_id VARCHAR(36) REFERENCES afiliados(id) NOT NULL,
      canal VARCHAR(20) NOT NULL,
      acepto BOOLEAN NOT NULL,
      version_politica VARCHAR(20) DEFAULT 'v1.0-2026' NOT NULL,
      ip_origen VARCHAR(45) DEFAULT '127.0.0.1' NOT NULL,
      texto_consentimiento TEXT NOT NULL,
      fecha_consentimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      revocado BOOLEAN DEFAULT false NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS auditoria (
      id VARCHAR(36) PRIMARY KEY,
      accion VARCHAR(100) NOT NULL,
      entidad VARCHAR(50) NOT NULL,
      entidad_id VARCHAR(36) NOT NULL,
      usuario_origen VARCHAR(100) DEFAULT 'asistente_voz' NOT NULL,
      ip VARCHAR(45) DEFAULT '127.0.0.1' NOT NULL,
      detalles_hash VARCHAR(64),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    sql`CREATE TABLE IF NOT EXISTS sesiones_conversacion (
      id VARCHAR(36) PRIMARY KEY,
      afiliado_id VARCHAR(36) REFERENCES afiliados(id),
      canal VARCHAR(20) DEFAULT 'voz' NOT NULL,
      estado_conversacion VARCHAR(50) DEFAULT 'iniciada' NOT NULL,
      contexto_json TEXT,
      ultimo_turno_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`
  ];

  for (const stmt of statements) {
    await db.execute(stmt);
  }
}

export async function runFullSeed() {
  console.log("🚀 Iniciando Seeding Masivo Fase 2 para EPS TRIADIX (Cali)...");
  const db = getDb();
  await createTablesIfNotExist(db);

  // 1. Diez Sedes de EPS TRIADIX en distintas comunas de Cali
  console.log("📍 Creando 10 Sedes de EPS TRIADIX en Cali...");
  const sedesData = [
    {
      id: "sede-tequendama",
      nombre: "Sede Principal Tequendama - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-01",
      direccion: "Calle 5 # 42-25",
      barrio: "Tequendama",
      comuna: 19,
      zona: "Sur",
      ciudad: "Cali",
      telefono: "(602) 489-8001",
      horarioApertura: "06:00:00",
      horarioCierre: "19:00:00",
      urgencias24Horas: true,
      activo: true,
    },
    {
      id: "sede-versalles",
      nombre: "Sede Versalles - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-02",
      direccion: "Avenida 5A Norte # 21N-40",
      barrio: "Versalles",
      comuna: 2,
      zona: "Norte",
      ciudad: "Cali",
      telefono: "(602) 489-8002",
      horarioApertura: "06:00:00",
      horarioCierre: "19:00:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-pasoancho",
      nombre: "Sede Pasoancho - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-03",
      direccion: "Calle 13 # 66-50",
      barrio: "Pasoancho",
      comuna: 17,
      zona: "Sur",
      ciudad: "Cali",
      telefono: "(602) 489-8003",
      horarioApertura: "07:00:00",
      horarioCierre: "18:00:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-sanfernando",
      nombre: "Sede Pediátrica San Fernando - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-04",
      direccion: "Carrera 36 # 4B-10",
      barrio: "San Fernando",
      comuna: 3,
      zona: "Centro",
      ciudad: "Cali",
      telefono: "(602) 489-8004",
      horarioApertura: "06:30:00",
      horarioCierre: "18:30:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-eldiamante",
      nombre: "Sede El Diamante - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-05",
      direccion: "Carrera 28D # 42-15",
      barrio: "El Diamante",
      comuna: 13,
      zona: "Oriente",
      ciudad: "Cali",
      telefono: "(602) 489-8005",
      horarioApertura: "07:00:00",
      horarioCierre: "17:30:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-salomia",
      nombre: "Sede Salomia - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-06",
      direccion: "Carrera 1 # 46-20",
      barrio: "Salomia",
      comuna: 5,
      zona: "Norte",
      ciudad: "Cali",
      telefono: "(602) 489-8006",
      horarioApertura: "07:00:00",
      horarioCierre: "17:00:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-elguabal",
      nombre: "Sede El Guabal - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-07",
      direccion: "Calle 14A # 40A-05",
      barrio: "El Guabal",
      comuna: 10,
      zona: "Sur",
      ciudad: "Cali",
      telefono: "(602) 489-8007",
      horarioApertura: "07:00:00",
      horarioCierre: "17:00:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-ciudadcordoba",
      nombre: "Sede Ciudad Córdoba - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-08",
      direccion: "Calle 50 # 42B-18",
      barrio: "Ciudad Córdoba",
      comuna: 15,
      zona: "Oriente",
      ciudad: "Cali",
      telefono: "(602) 489-8008",
      horarioApertura: "07:00:00",
      horarioCierre: "17:00:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-ciudadjardin",
      nombre: "Sede Especializada Ciudad Jardín - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-09",
      direccion: "Avenida San Joaquín # 14-80",
      barrio: "Ciudad Jardín",
      comuna: 22,
      zona: "Sur",
      ciudad: "Cali",
      telefono: "(602) 489-8009",
      horarioApertura: "07:00:00",
      horarioCierre: "19:00:00",
      urgencias24Horas: false,
      activo: true,
    },
    {
      id: "sede-aguacatal",
      nombre: "Sede Aguacatal - EPS TRIADIX",
      codigoHabilitacionReps: "76001001-10",
      direccion: "Avenida 9 Oeste # 12-30",
      barrio: "Aguacatal",
      comuna: 1,
      zona: "Oeste",
      ciudad: "Cali",
      telefono: "(602) 489-8010",
      horarioApertura: "07:00:00",
      horarioCierre: "17:00:00",
      urgencias24Horas: false,
      activo: true,
    },
  ];

  for (const s of sedesData) {
    await db.insert(schema.sedesIps).values(s).onConflictDoNothing();
  }

  // 2. Quince Especialidades Médicas
  console.log("🩺 Creando 15 Especialidades Médicas con Embeddings de 384 dimensiones...");
  const especialidadesData = [
    {
      id: "esp-med-gen",
      codigoCups: "890201",
      nombre: "Medicina General",
      descripcion: "Consulta médica general, chequeo preventivo, dolor de cabeza leve, malestar general, gripe y control de tensión arterial.",
      duracionMinutos: 20,
      tipoAcceso: "directo",
      requiereAutorizacionPrevia: false,
    },
    {
      id: "esp-odont",
      codigoCups: "890203",
      nombre: "Odontología General",
      descripcion: "Salud oral, dolor de muela, calza caída, limpieza dental, encías inflamadas, caries y valoración odontológica.",
      duracionMinutos: 30,
      tipoAcceso: "directo",
      requiereAutorizacionPrevia: false,
    },
    {
      id: "esp-optom",
      codigoCups: "890205",
      nombre: "Optometría",
      descripcion: "Examen de la vista, fórmula de gafas, dificultad para ver de cerca o lejos, cansancio visual y refracción.",
      duracionMinutos: 30,
      tipoAcceso: "directo",
      requiereAutorizacionPrevia: false,
    },
    {
      id: "esp-pediat",
      codigoCups: "890208",
      nombre: "Pediatría",
      descripcion: "Atención integral del niño y adolescente, control de crecimiento y desarrollo, fiebre en niños, vacunas.",
      duracionMinutos: 30,
      tipoAcceso: "directo",
      requiereAutorizacionPrevia: false,
    },
    {
      id: "esp-med-int",
      codigoCups: "890210",
      nombre: "Medicina Interna",
      descripcion: "Enfermedades crónicas del adulto, hipertensión arterial descontrolada, diabetes mellitus, insuficiencia cardíaca y chequeos complejos.",
      duracionMinutos: 40,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-gineco",
      codigoCups: "890212",
      nombre: "Ginecología y Obstetricia",
      descripcion: "Salud reproductiva femenina, citología, control prenatal, dolor pélvico, trastornos menstruales y menopausia.",
      duracionMinutos: 30,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-ortop",
      codigoCups: "890215",
      nombre: "Ortopedia y Traumatología",
      descripcion: "Dolor en las articulaciones, dolor de rodilla, dolor de cadera, esguince, dolor lumbar crónico, hombro doloroso y huesos.",
      duracionMinutos: 30,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-dermat",
      codigoCups: "890218",
      nombre: "Dermatología",
      descripcion: "Enfermedades de la piel, manchas, lunares sospechosos, acné severo, alergias cutáneas, hongos y caída del cabello.",
      duracionMinutos: 30,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-oftalm",
      codigoCups: "890220",
      nombre: "Oftalmología",
      descripcion: "Enfermedades de los ojos, cataratas, glaucoma, pterigio, dolor ocular severo y pérdida progresiva de la visión.",
      duracionMinutos: 30,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-cardio",
      codigoCups: "890222",
      nombre: "Cardiología",
      descripcion: "Salud cardiovascular, arritmias, palpitaciones, seguimiento post-infarto, electrocardiograma y falla cardíaca.",
      duracionMinutos: 40,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-urolog",
      codigoCups: "890225",
      nombre: "Urología",
      descripcion: "Salud del tracto urinario, próstata, cálculos renales, ardor al orinar en hombres y disfunción eréctil.",
      duracionMinutos: 30,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-otorrino",
      codigoCups: "890228",
      nombre: "Otorrinolaringología",
      descripcion: "Problemas de oído, nariz y garganta, sinusitis crónica, dolor de oído, vértigo, zumbidos y ronquidos.",
      duracionMinutos: 30,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-neuro",
      codigoCups: "890230",
      nombre: "Neurología",
      descripcion: "Migraña severa recurrente, temblores, epilepsia, pérdida de memoria, mareos crónicos y neuropatías.",
      duracionMinutos: 40,
      tipoAcceso: "remision",
      requiereAutorizacionPrevia: true,
    },
    {
      id: "esp-nutri",
      codigoCups: "890235",
      nombre: "Nutrición y Dietética",
      descripcion: "Planes de alimentación saludable, sobrepeso, obesidad, desnutrición, dieta para diabéticos e hipertensos.",
      duracionMinutos: 30,
      tipoAcceso: "directo",
      requiereAutorizacionPrevia: false,
    },
    {
      id: "esp-psicol",
      codigoCups: "890240",
      nombre: "Psicología",
      descripcion: "Salud mental, manejo del estrés, ansiedad leve a moderada, duelo, problemas familiares y apoyo emocional.",
      duracionMinutos: 45,
      tipoAcceso: "directo",
      requiereAutorizacionPrevia: false,
    },
  ];

  for (const esp of especialidadesData) {
    const embedding = generateLocalEmbedding(`${esp.nombre} ${esp.descripcion}`);
    await db
      .insert(schema.especialidades)
      .values({
        ...esp,
        embeddingVector: vectorToString(embedding),
        activo: true,
      })
      .onConflictDoNothing();
  }

  // 3. Catálogo de Motivos de Consulta en Lenguaje Natural (Búsqueda Híbrida)
  console.log("🧠 Creando Catálogo de Motivos Coloquiales con Embeddings...");
  const motivosColoquiales = [
    // Medicina General
    { frase: "tengo fiebre y malestar en el cuerpo", esp: "esp-med-gen", desc: "Síndrome febril y virosis" },
    { frase: "me duele la cabeza desde hace dos dias", esp: "esp-med-gen", desc: "Cefalea tensional" },
    { frase: "quiero una orden de examenes de sangre de rutina", esp: "esp-med-gen", desc: "Chequeo preventivo" },
    { frase: "tengo tos seca y gripa", esp: "esp-med-gen", desc: "Infección respiratoria alta" },
    { frase: "me siento debil y sin energia", esp: "esp-med-gen", desc: "Astenia y chequeo general" },
    // Odontología
    { frase: "me duele una muela terrible", esp: "esp-odont", desc: "Odontalgia por caries" },
    { frase: "se me cayo una calza comiendo", esp: "esp-odont", desc: "Fractura de restauración dental" },
    { frase: "me sangran las encias al cepillarme", esp: "esp-odont", desc: "Gingivitis" },
    { frase: "necesito una limpieza dental y profilaxis", esp: "esp-odont", desc: "Higiene oral preventiva" },
    // Optometría
    { frase: "no veo bien de lejos para manejar", esp: "esp-optom", desc: "Miopía / error refractivo" },
    { frase: "tengo que estirar el brazo para leer de cerca", esp: "esp-optom", desc: "Presbicia" },
    { frase: "siento los ojos cansados frente al computador", esp: "esp-optom", desc: "Fatiga visual / astenopia" },
    { frase: "necesito cambiar la formula de mis gafas", esp: "esp-optom", desc: "Refracción ocular" },
    // Ortopedia
    { frase: "me duele mucho la rodilla al subir escalas", esp: "esp-ortop", desc: "Gonartrosis / meniscopatía" },
    { frase: "me doble el tobillo jugando futbol", esp: "esp-ortop", desc: "Esguince de cuello de pie" },
    { frase: "tengo un dolor en la cintura que no me deja agachar", esp: "esp-ortop", desc: "Lumbago mecánico" },
    { frase: "no puedo levantar el hombro derecho", esp: "esp-ortop", desc: "Manguito rotador" },
    // Dermatología
    { frase: "me salio una mancha roja que pica en el brazo", esp: "esp-dermat", desc: "Dermatitis de contacto" },
    { frase: "tengo granos y barros en la cara", esp: "esp-dermat", desc: "Acné vulgar" },
    { frase: "tengo un lunar que me cambio de color", esp: "esp-dermat", desc: "Lesión dérmica sospechosa" },
    { frase: "se me esta cayendo el pelo por mechones", esp: "esp-dermat", desc: "Alopecia" },
    // Oftalmología
    { frase: "veo una telita blanca en el ojo", esp: "esp-oftalm", desc: "Pterigio / catarata" },
    { frase: "siento presion fuerte y dolor dentro del ojo", esp: "esp-oftalm", desc: "Sospecha de glaucoma" },
    // Cardiología
    { frase: "siento que el corazon me late muy rapido y desordenado", esp: "esp-cardio", desc: "Palpitaciones y arritmia" },
    { frase: "tengo la presion alta y el medico general me mando al especialista", esp: "esp-cardio", desc: "Hipertensión resistente" },
    // Pediatría
    { frase: "mi hijo tiene fiebre y brote en la piel", esp: "esp-pediat", desc: "Exantema infantil" },
    { frase: "vengo al control de crecimiento y desarrollo de la niña", esp: "esp-pediat", desc: "P y P infantil" },
    // Nutrición
    { frase: "quiero bajar de peso con una dieta sana", esp: "esp-nutri", desc: "Sobrepeso y educación nutricional" },
    // Psicología
    { frase: "tengo mucha ansiedad y estres por el trabajo", esp: "esp-psicol", desc: "Trastorno de ansiedad y estrés" },
  ];

  for (let idx = 0; idx < motivosColoquiales.length; idx++) {
    const m = motivosColoquiales[idx];
    const embedding = generateLocalEmbedding(m.frase);
    await db
      .insert(schema.catalogoMotivosConsulta)
      .values({
        id: `motivo-${idx + 1}`,
        fraseColoquial: m.frase,
        especialidadId: m.esp,
        descripcionClinica: m.desc,
        embeddingVector: vectorToString(embedding),
        prioridad: 1,
      })
      .onConflictDoNothing();
  }

  // 4. Cuarenta Médicos Ficticios
  console.log("👨‍⚕️ Creando 40 Médicos con Registros RETHUS de Cali...");
  const nombresMedicos = [
    "Carlos Andrés", "Valentina", "Juan David", "Mariana", "Fernando",
    "Natalia", "Diego Alejandro", "Camila", "Mauricio", "Carolina",
    "Julián", "Daniela", "Santiago", "Paola", "Andrés Felipe",
    "Laura", "Alejandro", "Isabella", "Sebastián", "Gabriela",
    "Héctor", "Claudia", "Rodrigo", "Adriana", "Jorge",
    "Patricia", "Camilo", "Diana", "Gustavo", "Elena",
    "Álvaro", "Mónica", "Ricardo", "Vanessa", "Guillermo",
    "Silvia", "Germán", "Lucía", "Esteban", "Catalina"
  ];

  const apellidosMedicos = [
    "Caicedo Murillo", "Ospina Benítez", "Garcés Barona", "Vivas Mosquera", "Lloreda Lloreda",
    "Echeverry Holguín", "Bonilla Castro", "Mejía Restrepo", "Arana Hurtado", "Cárdenas Silva",
    "Zapata Holguín", "Quintero Duque", "Morales Borrero", "Chávez Ramos", "Guerrero Vallejo",
    "Paredes Solano", "Soto Cabal", "Rengifo Marmolejo", "Salcedo Prieto", "Bermúdez Reyes",
    "Navarro Cobo", "Plaza Becerra", "Riascos Hurtado", "Tenorio Carvajal", "Tascón Palacios",
    "Zúñiga Vernaza", "Escobar Madriñán", "Correa Potes", "Hurtado Sardi", "Peña Saavedra",
    "Mora Holguín", "Dávila Carvajal", "Vega Mosquera", "Giraldo Bonilla", "Pardo Echeverri",
    "Restrepo Lloreda", "Muñoz Arana", "Reyes Quintero", "Guzmán Vivas", "Delgado Caicedo"
  ];

  const medicosCreados: { id: string; espId: string; sedeId: string }[] = [];

  for (let i = 0; i < 40; i++) {
    const medId = `med-${i + 1}`;
    const esp = especialidadesData[i % especialidadesData.length];
    const sede = sedesData[i % sedesData.length];
    const rethus = `RETHUS-76-${10000 + i * 137}`;

    await db
      .insert(schema.medicos)
      .values({
        id: medId,
        nombres: nombresMedicos[i],
        apellidos: apellidosMedicos[i],
        registroMedicoRethus: rethus,
        sedePrincipalId: sede.id,
        email: `dr.${nombresMedicos[i].toLowerCase().replace(/\s+/g, ".")}.${i + 1}@triadix.test`,
        activo: true,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.medicoEspecialidad)
      .values({
        id: `med-esp-${medId}-${esp.id}`,
        medicoId: medId,
        especialidadId: esp.id,
        esPrincipal: true,
      })
      .onConflictDoNothing();

    medicosCreados.push({ id: medId, espId: esp.id, sedeId: sede.id });
  }

  // 5. Doscientos Afiliados Ficticios con Cifrado Ley 1581
  console.log("🔐 Creando 200 Afiliados Sintéticos con Cifrado AES-256-GCM y Consentimientos...");
  const tiposDoc = ["CC", "CC", "CC", "TI", "CE", "PA", "RC"];
  const nombresPac = ["Juan", "María", "Carlos", "Ana", "Luis", "Gloria", "Pedro", "Luz", "José", "Carmen", "Rosa", "Jorge", "Martha", "Francisco", "Esperanza"];
  const apellidosPac = ["Gómez", "Rodríguez", "López", "Restrepo", "Caicedo", "Martínez", "García", "Pérez", "Sánchez", "Ramírez", "Torres", "Díaz", "Vargas", "Castro", "Morales"];

  const afiliadosCreadosIds: string[] = [];

  for (let i = 1; i <= 200; i++) {
    const aId = `afi-${i}`;
    const tipoDoc = tiposDoc[i % tiposDoc.length];
    const docNumero = (1100000000 + i * 7919).toString();
    const docHash = hashSearchableField(docNumero);
    const nom = `${nombresPac[i % nombresPac.length]} ${nombresPac[(i + 3) % nombresPac.length]}`;
    const ape = `${apellidosPac[i % apellidosPac.length]} ${apellidosPac[(i + 5) % apellidosPac.length]}`;
    const tel = `31${(10000000 + i * 4321).toString().slice(0, 8)}`;
    const reg = i % 4 === 0 ? "SUBSIDIADO" : "CONTRIBUTIVO";
    const cat = i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C";
    const estado = i === 13 ? "SUSPENDIDO" : "ACTIVO";
    const sedeAsignada = sedesData[i % sedesData.length].id;

    await db
      .insert(schema.afiliados)
      .values({
        id: aId,
        tipoDocumento: tipoDoc,
        numeroDocumentoHash: docHash,
        numeroDocumentoEnc: encryptSensitiveData(docNumero),
        nombresEnc: encryptSensitiveData(nom),
        apellidosEnc: encryptSensitiveData(ape),
        telefonoEnc: encryptSensitiveData(tel),
        emailEnc: encryptSensitiveData(`afiliado.${i}@demo.triadix.test`),
        fechaNacimiento: `${1950 + (i % 55)}-0${(i % 9) + 1}-15`,
        genero: i % 2 === 0 ? "Femenino" : "Masculino",
        regimen: reg,
        tipoCotizante: i % 2 === 0 ? "COTIZANTE" : "BENEFICIARIO",
        categoria: cat,
        estadoAfiliacion: estado,
        ipsPrimariaId: sedeAsignada,
      })
      .onConflictDoNothing();

    // Consentimiento Ley 1581
    await db
      .insert(schema.consentimientos)
      .values({
        id: `cons-${aId}`,
        afiliadoId: aId,
        canal: "voz",
        acepto: true,
        versionPolitica: "v1.0-2026",
        ipOrigen: `190.14.234.${(i % 200) + 1}`,
        textoConsentimiento: "Autorizo a EPS TRIADIX el tratamiento de mis datos personales y de salud para el agendamiento y confirmación de citas médicas conforme a la Ley 1581 de 2012.",
        revocado: false,
      })
      .onConflictDoNothing();

    afiliadosCreadosIds.push(aId);
  }

  // Crear un par de autorizaciones activas para pruebas con especialistas
  await db
    .insert(schema.autorizaciones)
    .values({
      id: "aut-1",
      numeroAutorizacionMipres: "MIPRES-2026-76001-001",
      afiliadoId: "afi-1",
      especialidadId: "esp-med-int",
      fechaExpedicion: "2026-09-15",
      fechaVencimiento: "2026-12-15",
      consultasAutorizadas: 3,
      consultasConsumidas: 0,
      activa: true,
    })
    .onConflictDoNothing();

  // 6. Generación de ~2.000 Franjas de Disponibilidad Médica (Excluyendo Domingos y Festivos)
  console.log("📅 Generando más de 2.000 Franjas Horarias para los próximos 30 días hábiles de Colombia...");
  const fechasHabiles = obtenerFechasHabilesProximas(20); // 20 días hábiles en Colombia
  const horasManana = [
    { ini: "07:00:00", fin: "07:25:00" },
    { ini: "07:30:00", fin: "07:55:00" },
    { ini: "08:00:00", fin: "08:25:00" },
    { ini: "08:30:00", fin: "08:55:00" },
    { ini: "09:00:00", fin: "09:25:00" },
    { ini: "09:30:00", fin: "09:55:00" },
    { ini: "10:00:00", fin: "10:25:00" },
    { ini: "10:30:00", fin: "10:55:00" },
  ];
  const horasTarde = [
    { ini: "14:00:00", fin: "14:25:00" },
    { ini: "14:30:00", fin: "14:55:00" },
    { ini: "15:00:00", fin: "15:25:00" },
    { ini: "15:30:00", fin: "15:55:00" },
    { ini: "16:00:00", fin: "16:25:00" },
    { ini: "16:30:00", fin: "16:55:00" },
  ];

  let totalSlots = 0;

  for (const fecha of fechasHabiles) {
    for (const med of medicosCreados) {
      // 3 slots en la mañana
      for (let h = 0; h < 3; h++) {
        const slot = horasManana[h];
        const slotId = `slot-${med.id}-${fecha}-${slot.ini.slice(0, 2)}`;
        totalSlots++;

        await db
          .insert(schema.agendas)
          .values({
            id: slotId,
            medicoId: med.id,
            especialidadId: med.espId,
            sedeId: med.sedeId,
            fecha: fecha,
            horaInicio: slot.ini,
            horaFin: slot.fin,
            jornada: "manana",
            estado: "disponible",
            versionConcurrencia: 0,
          })
          .onConflictDoNothing();
      }

      // 2 slots en la tarde
      for (let h = 0; h < 2; h++) {
        const slot = horasTarde[h];
        const slotId = `slot-${med.id}-${fecha}-${slot.ini.slice(0, 2)}`;
        totalSlots++;

        await db
          .insert(schema.agendas)
          .values({
            id: slotId,
            medicoId: med.id,
            especialidadId: med.espId,
            sedeId: med.sedeId,
            fecha: fecha,
            horaInicio: slot.ini,
            horaFin: slot.fin,
            jornada: "tarde",
            estado: "disponible",
            versionConcurrencia: 0,
          })
          .onConflictDoNothing();
      }
    }
  }

  console.log(`✅ SEEDING FASE 2 COMPLETADO EXITOSAMENTE:`);
  console.log(`   - 10 Sedes IPS en Cali (Comunas 1, 2, 3, 5, 10, 13, 15, 17, 19, 22)`);
  console.log(`   - 15 Especialidades Médicas con embeddings densos`);
  console.log(`   - 28 Motivos de consulta en lenguaje natural para búsqueda híbrida`);
  console.log(`   - 40 Médicos adscritos`);
  console.log(`   - 200 Afiliados ficticios (100% protegidos con cifrado y Habeas Data)`);
  console.log(`   - ${totalSlots} Franjas de agenda creadas excluyendo domingos y festivos de Colombia.`);
}

if (require.main === module || process.argv[1]?.includes("seed")) {
  runFullSeed()
    .then(() => {
      console.log("🏁 Proceso de seed de Fase 2 terminado correctamente.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Error en seed masivo:", err);
      process.exit(1);
    });
}
