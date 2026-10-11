import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
        404
      </div>
      <h2 className="text-xl font-bold text-slate-900">Página no encontrada</h2>
      <p className="text-xs text-slate-500 max-w-sm">
        El recurso que busca no está disponible en la plataforma de EPS TRIADIX.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition"
      >
        Volver a la Página Principal
      </Link>
    </div>
  );
}

