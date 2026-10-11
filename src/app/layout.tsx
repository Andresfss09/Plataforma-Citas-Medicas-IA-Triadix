import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CitaVoz EPS | EPS TRIADIX Cali",
  description: "Asistente web de agendamiento de citas médicas por voz para EPS TRIADIX en Cali, Colombia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center text-white font-black text-2xl shadow-md tracking-wider" aria-hidden="true">
                TX
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-blue-900 block leading-tight">
                  EPS TRIADIX
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  CitaVoz • Cali, Valle del Cauca
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="tel:123"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors focus:ring-2 focus:ring-red-500"
                aria-label="Línea de Emergencias Vitales 123"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
                Urgencias Vitales: 123
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500" role="contentinfo">
          <p className="max-w-4xl mx-auto px-4">
            EPS TRIADIX S.A.S. • Nit: 901.845.120-4 • Vigilado Supersalud. Cumplimiento estricto de la Ley 1581 de 2012 (Habeas Data) y Decreto 1377 de 2013. Sede Principal Cali: Calle 5 # 42-25, Tequendama.
          </p>
        </footer>
      </body>
    </html>
  );
}

