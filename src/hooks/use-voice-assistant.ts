"use client";

import { useState, useEffect, useRef } from "react";
import { MensajeChat } from "@/components/voice/TranscriptPanel";

export function useVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [comprobanteCodigo, setComprobanteCodigo] = useState<string | undefined>();
  const [alertaEmergencia, setAlertaEmergencia] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Silenciar errores tipo [object Event] no-Error en dev overlay
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleGlobalError = (event: ErrorEvent) => {
      if (event && !(event.error instanceof Error)) {
        event.preventDefault();
      }
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event && !(event.reason instanceof Error)) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Inicializar Web Speech API al montar en el navegador
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-CO";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event: any) => {
          const transcript = event?.results?.[0]?.[0]?.transcript;
          if (transcript) {
            manejarEntradaUsuario(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          if (event && typeof event.preventDefault === "function") {
            try { event.preventDefault(); } catch {}
          }
          if (event && typeof event.stopPropagation === "function") {
            try { event.stopPropagation(); } catch {}
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const hablarTexto = (texto: string) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CO";
    utterance.rate = 0.95; // Ritmo cómodo para adultos mayores
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e: any) => {
      if (e && typeof e.preventDefault === "function") {
        try { e.preventDefault(); } catch {}
      }
      setIsSpeaking(false);
    };

    try {
      synthRef.current.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const toggleEscucha = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      if (synthRef.current) {
        try {
          synthRef.current.cancel();
        } catch {}
      }
      try {
        recognitionRef.current?.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  const manejarEntradaUsuario = async (texto: string) => {
    const horaActual = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    // Agregar mensaje del usuario a la lista visual
    setMensajes((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        remitente: "usuario",
        texto: texto,
        hora: horaActual,
      },
    ]);

    setIsProcessing(true);

    try {
      // Invocación a la API conversacional
      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "buscar_especialidad_por_motivo",
          params: { motivoConsulta: texto },
        }),
      });

      const data = await response.json();
      let respuestaAgente = "";

      if (data?.data?.esEmergenciaVital) {
        setAlertaEmergencia(data.data.alerta);
        respuestaAgente = "⚠️ Alerta médica detectada: Por favor comuníquese de inmediato a la Línea 123 en Cali o acuda al servicio de urgencias.";
      } else if (/\b\d{7,10}\b/.test(texto)) {
        respuestaAgente = "¡Qué gusto saludarle! He verificado su documento en EPS TRIADIX. ¿Para qué especialidad médica necesita su cita?";
      } else if (/s[ií]|confirmo|de acuerdo/i.test(texto)) {
        const radicadoFicticio = `CTX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
        setComprobanteCodigo(radicadoFicticio);
        respuestaAgente = `¡Listo! Su cita quedó agendada con éxito bajo el código ${radicadoFicticio}. Ya tiene su comprobante en PDF disponible en pantalla.`;
      } else {
        respuestaAgente = "Para su consulta en Cali tengo disponibilidad mañana a las 8:00 de la mañana en la Sede Versalles con el Dr. Carlos Caicedo. ¿Confirma esta cita?";
      }

      setMensajes((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-agent`,
          remitente: "asistente",
          texto: respuestaAgente,
          hora: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      hablarTexto(respuestaAgente);
    } catch {
      const rtaError = "Disculpe, ocurrió una pequeña interrupción en mi sistema. ¿Podría repetirme por favor?";
      setMensajes((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          remitente: "asistente",
          texto: rtaError,
          hora: horaActual,
        },
      ]);
      hablarTexto(rtaError);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isListening,
    isSpeaking,
    isProcessing,
    mensajes,
    comprobanteCodigo,
    alertaEmergencia,
    toggleEscucha,
    enviarTextoManual: manejarEntradaUsuario,
  };
}
