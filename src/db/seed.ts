import { getDb } from "./index";
import * as schema from "./schema";
import { encryptSensitiveData, hashSearchableField } from "../lib/crypto";
import { sql } from "drizzle-orm";

async function createTablesIfNotExist(db: any) {
  const tableStatements = [
    sql`CREATE TABLE IF NOT EXISTS sedes (
      id VARCHAR(36) PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      direccion VARCHAR(255) NOT NULL,
      barrio VARCHAR(100) NOT NULL,
      ciudad VARCHAR(50) DEFAULT 'Cali' NOT NULL,
      telefono VARCHAR(50) NOT NULL,
      horario_apertura TIME DEFAULT '06:00:00' NOT NULL,
      horario_cierre TIME DEFAULT '19:00:00' NOT NULL,
      activo BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    sql`CREATE TABLE IF NOT EXISTS especialidades (
      id VARCHAR(36) PRIMARY KEY,
      codigo VARCHAR(20) NOT NULL UNIQUE,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT NOT NULL,
      duracion_minutos INTEGER DEFAULT 30 NOT NULL,
      requiere_remision BOOLEAN DEFAULT false NOT NULL,
      activo BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    sql`CREATE TABLE IF NOT EXISTS medicos (
      id VARCHAR(36) PRIMARY KEY,
      nombres VARCHAR(100) NOT NULL,
      apellidos VARCHAR(100) NOT NULL,
      registro_medico VARCHAR(50) NOT NULL UNIQUE,
      especialidad_id VARCHAR(36) REFERENCES especialidades(id) NOT NULL,
      sede_id VARCHAR(36) REFERENCES sedes(id) NOT NULL,
      email VARCHAR(150) NOT NULL,
      activo BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    sql`CREATE TABLE IF NOT EXISTS pacientes (
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    sql`CREATE TABLE IF NOT EXISTS consentimientos_habeas_data (
      id VARCHAR(36) PRIMARY KEY,
      paciente_id VARCHAR(36) REFERENCES pacientes(id) NOT NULL,
      canal VARCHAR(20) NOT NULL,
      acepto BOOLEAN NOT NULL,
      version_politica VARCHAR(20) DEFAULT 'v1.0-2026' NOT NULL,
      ip_origen VARCHAR(45) DEFAULT '127.0.0.1' NOT NULL,
      texto_consentimiento TEXT NOT NULL,
      fecha_consentimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      revocado BOOLEAN DEFAULT false NOT NULL
    );`,
    sql`CREATE TABLE IF NOT EXISTS disponibilidad_medica (
      id VARCHAR(36) PRIMARY KEY,
      medico_id VARCHAR(36) REFERENCES medicos(id) NOT NULL,
      sede_id VARCHAR(36) REFERENCES sedes(id) NOT NULL,
      fecha DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      estado VARCHAR(20) DEFAULT 'disponible' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    sql`CREATE TABLE IF NOT EXISTS citas (
      id VARCHAR(36) PRIMARY KEY,
      codigo_cita VARCHAR(30) NOT NULL UNIQUE,
      paciente_id VARCHAR(36) REFERENCES pacientes(id) NOT NULL,
      medico_id VARCHAR(36) REFERENCES medicos(id) NOT NULL,
      sede_id VARCHAR(36) REFERENCES sedes(id) NOT NULL,
      disponibilidad_id VARCHAR(36) REFERENCES disponibilidad_medica(id) NOT NULL,
      fecha_cita DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      motivo_consulta_enc TEXT,
      canal VARCHAR(20) DEFAULT 'voz' NOT NULL,
      estado VARCHAR(20) DEFAULT 'agendada' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    sql`CREATE TABLE IF NOT EXISTS logs_auditoria (
      id VARCHAR(36) PRIMARY KEY,
      accion VARCHAR(100) NOT NULL,
      entidad VARCHAR(50) NOT NULL,
      entidad_id VARCHAR(36) NOT NULL,
      usuario_origen VARCHAR(100) DEFAULT 'asistente_voz' NOT NULL,
      ip VARCHAR(45) DEFAULT '127.0.0.1' NOT NULL,
      detalles_hash VARCHAR(64),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`
  ];

  for (const statement of tableStatements) {
    await db.execute(statement);
  }
}

export async function runSeed() {
  console.log("🌱 Iniciando siembra de datos sintéticos para EPS TRIADIX (Cali)...");
  const db = getDb();
  await createTablesIfNotExist(db);

  // 1. Sedes en Cali
  console.log("📍 Creando sedes en Cali...");
  const sedesData = [
    {
      id: "sede-tequendama",
      nombre: "Sede Tequendama - EPS TRIADIX",
      direccion: "Calle 5 # 42-25",
      barrio: "Tequendama",
      ciudad: "Cali",
      telefono: "(602) 489-8001",
      horarioApertura: "06:00:00",
      horarioCierre: "19:00:00",
      activo: true,
    },
    {
      id: "sede-versalles",
      nombre: "Sede Versalles - EPS TRIADIX",
      direccion: "Avenida 5A Norte # 21N-40",
      barrio: "Versalles",
      ciudad: "Cali",
      telefono: "(602) 489-8002",
      horarioApertura: "06:00:00",
      horarioCierre: "19:00:00",
      activo: true,
    },
    {
      id: "sede-pasoancho",
      nombre: "Sede Pasoancho - EPS TRIADIX",
      direccion: "Calle 13 # 66-50",
      barrio: "Pasoancho",
      ciudad: "Cali",
      telefono: "(602) 489-8003",
      horarioApertura: "07:00:00",
      horarioCierre: "18:00:00",
      activo: true,
    },
    {
      id: "sede-sanfernando",
      nombre: "Sede San Fernando - EPS TRIADIX",
      direccion: "Carrera 36 # 4B-10",
      barrio: "San Fernando",
      ciudad: "Cali",
      telefono: "(602) 489-8004",
      horarioApertura: "06:30:00",
      horarioCierre: "18:30:00",
      activo: true,
    },
  ];

  for (const s of sedesData) {
    await db
      .insert(schema.sedes)
      .values(s)
      .onConflictDoNothing({ target: schema.sedes.id });
  }

  // 2. Especialidades
  console.log("🩺 Creando especialidades médicas...");
  const especialidadesData = [
    {
      id: "esp-med-gen",
      codigo: "MED_GEN",
      nombre: "Medicina General",
      descripcion: "Consulta médica de atención primaria para diagnóstico general y chequeo preventivo.",
      duracionMinutos: 20,
      requiereRemision: false,
      activo: true,
    },
    {
      id: "esp-odont",
      codigo: "ODONT",
      nombre: "Odontología General",
      descripcion: "Salud e higiene oral, profilaxis, resinas y valoración dental preventiva.",
      duracionMinutos: 30,
      requiereRemision: false,
      activo: true,
    },
    {
      id: "esp-optom",
      codigo: "OPTOM",
      nombre: "Optometría",
      descripcion: "Examen de agudeza visual, prescripción de lentes y refracción.",
      duracionMinutos: 30,
      requiereRemision: false,
      activo: true,
    },
    {
      id: "esp-pediat",
      codigo: "PEDIAT",
      nombre: "Pediatría",
      descripcion: "Atención integral del niño sano y control de crecimiento y desarrollo infantil.",
      duracionMinutos: 30,
      requiereRemision: false,
      activo: true,
    },
    {
      id: "esp-med-int",
      codigo: "MED_INT",
      nombre: "Medicina Interna",
      descripcion: "Atención a patologías complejas y crónicas en adultos mayores (hipertensión, diabetes).",
      duracionMinutos: 40,
      requiereRemision: true,
      activo: true,
    },
  ];

  for (const esp of especialidadesData) {
    await db
      .insert(schema.especialidades)
      .values(esp)
      .onConflictDoNothing({ target: schema.especialidades.id });
  }

  // 3. Médicos adscritos
  console.log("👨‍⚕️ Creando profesionales de la salud...");
  const medicosData = [
    {
      id: "med-1",
      nombres: "Valentina",
      apellidos: "Ospina Benítez",
      registroMedico: "RM-76-10452",
      especialidadId: "esp-med-gen",
      sedeId: "sede-tequendama",
      email: "valentina.ospina@triadix.test",
      activo: true,
    },
    {
      id: "med-2",
      nombres: "Carlos Andrés",
      apellidos: "Caicedo Murillo",
      registroMedico: "RM-76-20891",
      especialidadId: "esp-med-gen",
      sedeId: "sede-versalles",
      email: "carlos.caicedo@triadix.test",
      activo: true,
    },
    {
      id: "med-3",
      nombres: "Natalia",
      apellidos: "Echeverry Holguín",
      registroMedico: "RM-76-30412",
      especialidadId: "esp-odont",
      sedeId: "sede-pasoancho",
      email: "natalia.echeverry@triadix.test",
      activo: true,
    },
    {
      id: "med-4",
      nombres: "Juan David",
      apellidos: "Garcés Barona",
      registroMedico: "RM-76-40789",
      especialidadId: "esp-optom",
      sedeId: "sede-tequendama",
      email: "juandavid.garces@triadix.test",
      activo: true,
    },
    {
      id: "med-5",
      nombres: "Mariana",
      apellidos: "Vivas Mosquera",
      registroMedico: "RM-76-50123",
      especialidadId: "esp-pediat",
      sedeId: "sede-sanfernando",
      email: "mariana.vivas@triadix.test",
      activo: true,
    },
    {
      id: "med-6",
      nombres: "Fernando",
      apellidos: "Lloreda Lloreda",
      registroMedico: "RM-76-60987",
      especialidadId: "esp-med-int",
      sedeId: "sede-versalles",
      email: "fernando.lloreda@triadix.test",
      activo: true,
    },
  ];

  for (const m of medicosData) {
    await db
      .insert(schema.medicos)
      .values(m)
      .onConflictDoNothing({ target: schema.medicos.id });
  }

  // 4. Pacientes de prueba (cifrados con AES-256-GCM + hash indexable)
  console.log("🔐 Creando pacientes sintéticos con cifrado de Habeas Data...");
  const pacientesSeed = [
    {
      id: "pac-1",
      tipoDocumento: "CC",
      cedulaPlano: "1144123456",
      nombres: "Carlos Alberto",
      apellidos: "Gómez Restrepo",
      telefono: "3155551234",
      email: "carlos.gomez.demo@triadix.test",
      fechaNacimiento: "1960-04-15",
      genero: "Masculino",
    },
    {
      id: "pac-2",
      tipoDocumento: "CC",
      cedulaPlano: "66789123",
      nombres: "María Elena",
      apellidos: "Restrepo de Gómez",
      telefono: "3165555678",
      email: "maria.restrepo.demo@triadix.test",
      fechaNacimiento: "1965-08-22",
      genero: "Femenino",
    },
    {
      id: "pac-3",
      tipoDocumento: "CC",
      cedulaPlano: "1130987654",
      nombres: "Andrés Felipe",
      apellidos: "Caicedo Morales",
      telefono: "3175559012",
      email: "andres.caicedo.demo@triadix.test",
      fechaNacimiento: "1988-11-03",
      genero: "Masculino",
    },
  ];

  for (const p of pacientesSeed) {
    const docHash = hashSearchableField(p.cedulaPlano);
    await db
      .insert(schema.pacientes)
      .values({
        id: p.id,
        tipoDocumento: p.tipoDocumento,
        numeroDocumentoHash: docHash,
        numeroDocumentoEnc: encryptSensitiveData(p.cedulaPlano),
        nombresEnc: encryptSensitiveData(p.nombres),
        apellidosEnc: encryptSensitiveData(p.apellidos),
        telefonoEnc: encryptSensitiveData(p.telefono),
        emailEnc: encryptSensitiveData(p.email),
        fechaNacimiento: p.fechaNacimiento,
        genero: p.genero,
      })
      .onConflictDoNothing({ target: schema.pacientes.id });

    // Registrar consentimiento de Habeas Data previo
    await db
      .insert(schema.consentimientosHabeasData)
      .values({
        id: `cons-${p.id}`,
        pacienteId: p.id,
        canal: "voz",
        acepto: true,
        versionPolitica: "v1.0-2026",
        ipOrigen: "190.14.234.12", // IP ficticia de Cali (Claro / Emcali)
        textoConsentimiento:
          "Autorizo a EPS TRIADIX el tratamiento de mis datos personales y de salud para el agendamiento y confirmación de citas médicas conforme a la Ley 1581 de 2012.",
        revocado: false,
      })
      .onConflictDoNothing({ target: schema.consentimientosHabeasData.id });
  }

  // 5. Franjas horarias de disponibilidad médica para los próximos días
  console.log("📅 Creando agenda de disponibilidad para EPS TRIADIX...");
  const horas = [
    { inicio: "07:00:00", fin: "07:30:00" },
    { inicio: "08:00:00", fin: "08:30:00" },
    { inicio: "09:00:00", fin: "09:30:00" },
    { inicio: "10:30:00", fin: "11:00:00" },
    { inicio: "14:00:00", fin: "14:30:00" },
    { inicio: "15:30:00", fin: "16:00:00" },
    { inicio: "16:30:00", fin: "17:00:00" },
  ];

  // Generar fechas para los próximos 7 días hábiles
  const hoy = new Date();
  let slotCount = 0;

  for (let i = 1; i <= 7; i++) {
    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() + i);
    const fechaIso = dia.toISOString().split("T")[0];

    // Para cada médico
    for (const med of medicosData) {
      for (let hIdx = 0; hIdx < horas.length; hIdx++) {
        const slot = horas[hIdx];
        const slotId = `slot-${med.id}-${fechaIso}-${hIdx}`;
        slotCount++;

        await db
          .insert(schema.disponibilidadMedica)
          .values({
            id: slotId,
            medicoId: med.id,
            sedeId: med.sedeId,
            fecha: fechaIso,
            horaInicio: slot.inicio,
            horaFin: slot.fin,
            estado: "disponible",
          })
          .onConflictDoNothing({ target: schema.disponibilidadMedica.id });
      }
    }
  }

  // 6. Log de auditoría del seed
  await db.insert(schema.logsAuditoria).values({
    id: `log-seed-${Date.now()}`,
    accion: "SEED_DATABASE_INITIALIZATION",
    entidad: "SISTEMA",
    entidadId: "triadix-core",
    usuarioOrigen: "sistema_migracion",
    ip: "127.0.0.1",
    detallesHash: hashSearchableField("Inicialización de datos sintéticos Cali"),
  });

  console.log(`✅ Siembra completada con éxito:`);
  console.log(`   - 4 sedes de EPS TRIADIX en Cali`);
  console.log(`   - 5 especialidades médicas`);
  console.log(`   - 6 médicos adscritos`);
  console.log(`   - 3 pacientes ficticios con cifrado Ley 1581`);
  console.log(`   - ${slotCount} franjas de disponibilidad médica creadas.`);
}

if (require.main === module || process.argv[1]?.includes("seed")) {
  runSeed()
    .then(() => {
      console.log("🏁 Proceso de seed terminado correctamente.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Error en seed:", err);
      process.exit(1);
    });
}

