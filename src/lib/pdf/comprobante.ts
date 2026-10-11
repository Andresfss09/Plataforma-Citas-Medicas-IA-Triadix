export interface ComprobanteCitaData {
  codigoCita: string;
  afiliadoNombre: string;
  afiliadoDocumento: string;
  afiliadoTipoDoc: string;
  afiliadoRegimen: string;
  afiliadoCategoria: string;
  especialidadNombre: string;
  medicoNombre: string;
  registroRethus: string;
  sedeNombre: string;
  sedeDireccion: string;
  sedeBarrio: string;
  sedeTelefono: string;
  fechaCita: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm:ss
  horaFin: string;
}

/**
 * Convierte fecha YYYY-MM-DD a formato colombiano DD/MM/AAAA
 */
export function formatearFechaColombiana(fechaIso: string): string {
  if (!fechaIso) return "";
  const partes = fechaIso.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaIso;
}

/**
 * Convierte hora militar 24h a formato colombiano 12h con a. m. / p. m.
 */
export function formatearHora12(horaStr: string): string {
  if (!horaStr) return "";
  const [hora, min] = horaStr.split(":");
  let h = parseInt(hora, 10);
  const periodo = h >= 12 ? "p. m." : "a. m.";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${min} ${periodo}`;
}

/**
 * Genera el documento HTML accesible e imprimible con diseño oficial de EPS TRIADIX
 */
export function generarHtmlComprobante(data: ComprobanteCitaData): string {
  const fechaCol = formatearFechaColombiana(data.fechaCita);
  const horaCol = formatearHora12(data.horaInicio);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Cita Médica - EPS TRIADIX</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 24px;
      background: #ffffff;
    }
    .header {
      border-bottom: 3px solid #1e40af;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      font-size: 26px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: -0.5px;
    }
    .brand span { color: #2563eb; }
    .badge {
      background: #eff6ff;
      color: #1e40af;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: bold;
      border: 1px solid #bfdbfe;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      background: #f8fafc;
    }
    .card-title {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 800;
      color: #64748b;
      margin-bottom: 8px;
    }
    .highlight {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      margin-bottom: 4px;
    }
    .detail {
      font-size: 14px;
      color: #334155;
    }
    .instructions {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
      padding: 16px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 24px;
    }
    .instructions h4 {
      margin: 0 0 8px 0;
      color: #92400e;
      font-size: 14px;
    }
    .instructions ul {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      color: #78350f;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">EPS TRIADIX <span>CitaVoz</span></div>
      <div style="font-size: 12px; color: #64748b; font-weight: bold;">Santiago de Cali, Colombia • NIT: 901.845.120-4</div>
    </div>
    <div class="badge">RADICADO: ${data.codigoCita}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Datos del Afiliado</div>
      <div class="highlight">${data.afiliadoNombre}</div>
      <div class="detail">${data.afiliadoTipoDoc}: ${data.afiliadoDocumento}</div>
      <div class="detail">Régimen: ${data.afiliadoRegimen} • Categoría: ${data.afiliadoCategoria}</div>
    </div>

    <div class="card">
      <div class="card-title">Detalle de la Cita Médica</div>
      <div class="highlight">${data.especialidadNombre}</div>
      <div class="detail" style="font-weight: bold; color: #047857;">Fecha: ${fechaCol} • Hora: ${horaCol}</div>
      <div class="detail">Profesional: ${data.medicoNombre} (${data.registroRethus})</div>
    </div>
  </div>

  <div class="card" style="margin-bottom: 24px;">
    <div class="card-title">Lugar de Atención en Cali</div>
    <div class="highlight">${data.sedeNombre}</div>
    <div class="detail">Dirección: ${data.sedeDireccion} • Barrio ${data.sedeBarrio}</div>
    <div class="detail">Línea de Atención en Cali: ${data.sedeTelefono}</div>
  </div>

  <div class="instructions">
    <h4>Recomendaciones Importantes de Preparación:</h4>
    <ul>
      <li>Presentarse con <strong>20 minutos de anticipación</strong> a la hora fijada.</li>
      <li>Presentar su documento de identidad original en la ventanilla de facturación.</li>
      <li>En caso de no poder asistir, cancele con al menos 2 horas de antelación para ceder el cupo.</li>
      <li>Si requiere exámenes de laboratorio clínico en ayunas, no consuma alimentos 8 horas antes.</li>
    </ul>
  </div>

  <div class="footer">
    Vigilado Superintendencia Nacional de Salud. Documento generado electrónicamente por el Asistente CitaVoz de EPS TRIADIX.
  </div>
</body>
</html>`;
}

