import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPS TRIADIX | Portal Oficial de Citas Médicas y Agendamiento por Voz",
  description: "Plataforma institucional de EPS TRIADIX para consulta y asignación de citas médicas ambulatorias en Santiago de Cali y Valle del Cauca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full bg-slate-100 antialiased">
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-teal-700 selection:text-white">
        
        {/* Barra superior de gobierno y regulación institucional - 100% sólida y nítida */}
        <div className="relative z-50 bg-[#0b1329] text-slate-100 text-xs py-2 px-4 border-b border-slate-800 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
              <span>República de Colombia • Sistema General de Seguridad Social en Salud (SGSSS)</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300 font-medium">
              <span>Línea Nacional: <strong className="text-white font-semibold">01 8000 910 200</strong></span>
              <span className="hidden md:inline text-slate-600">•</span>
              <span className="hidden md:inline">Cali: <strong className="text-white font-semibold">(602) 489-8000</strong></span>
            </div>
          </div>
        </div>

        {/* Encabezado Corporativo Oficial - Totalmente nítido sobre fondo blanco */}
        <header className="relative z-50 border-b border-slate-300 bg-white sticky top-0 shadow-sm" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            
            {/* Logo e Identidad Corporativa */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-teal-800 flex items-center justify-center text-white font-black text-xl shadow-sm tracking-tight" aria-hidden="true">
                TX
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl tracking-tight text-slate-950 leading-tight">
                    EPS TRIADIX
                  </span>
                  <span className="hidden sm:inline-block text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                    Cali • Valle
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-700 block">
                  Asistente Clínico Inteligente de Asignación de Citas
                </span>
              </div>
            </div>

            {/* Accesos rápidos de servicio al usuario */}
            <div className="flex items-center gap-3">
              <a
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition border border-slate-300"
              >
                <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Panel Administrativo</span>
              </a>

              <a
                href="tel:123"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition focus:ring-2 focus:ring-rose-500 shadow-xs"
                aria-label="Línea de Urgencias Médicas Vitales 123"
              >
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" aria-hidden="true" />
                <span>Urgencias Vitales: 123</span>
              </a>
            </div>
          </div>
        </header>

        {/* Contenido Principal con Fondo Familiar Cálido Institucional */}
        <div className="flex-1 relative flex flex-col">
          {/* Capa de imagen de fondo de familia con alta visibilidad y presencia */}
          <div 
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-75"
            style={{ backgroundImage: "url('/fondo-familia.jpg')" }}
            aria-hidden="true"
          />
          {/* Velo blanco equilibrado: deja ver claramente a la familia y resalta las tarjetas */}
          <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-100/40 via-white/50 to-slate-100/60 pointer-events-none backdrop-blur-[0.5px]" aria-hidden="true" />

          <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10" role="main">
            {children}
          </main>
        </div>

        {/* Pie de página institucional - 100% sólido y ultra legible */}
        <footer className="relative z-40 border-t border-slate-300 bg-white py-8 text-xs text-slate-700 shadow-md" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal-800 flex items-center justify-center text-white font-black text-xs shadow-xs">
                  TX
                </div>
                <span className="font-bold text-slate-900 text-sm">EPS TRIADIX S.A.S. • NIT: 901.845.120-4</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-700 font-semibold">
                <span>Vigilado Supersalud</span>
                <span>•</span>
                <span>Resolución 5596 (Triage)</span>
                <span>•</span>
                <span>Habeas Data Ley 1581</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 text-center sm:text-left leading-relaxed">
              Sede Administrativa Principal Cali: Calle 5 # 42-25, Barrio Tequendama, Comuna 19. Horario de atención: Lunes a Viernes 07:00 a. m. a 05:00 p. m. Conmutador asistencial: (602) 489-8000. Todas las citas generadas por este portal son oficiales y cuentan con código QR de verificación.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
