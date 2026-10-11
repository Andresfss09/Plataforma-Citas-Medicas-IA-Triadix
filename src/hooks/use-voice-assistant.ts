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

  const contextoRef = useRef<any>({ etapa: "INICIO" });

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
      // Obtener información del afiliado autenticado si existe en cookies
      let afiliadoSesion = null;
      if (typeof document !== "undefined") {
        try {
          const match = document.cookie.match(/citavoz_paciente_info=([^;]+)/);
          if (match) {
            afiliadoSesion = JSON.parse(decodeURIComponent(match[1]));
          }
        } catch {}
      }

      // Invocación a la API conversacional inteligente
      const response = await fetch("/api/asistente/conversar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: texto,
          contexto: contextoRef.current,
          afiliadoSesion,
        }),
      });

      const data = await response.json();

      if (data.contexto) {
        contextoRef.current = data.contexto;
      }

      if (data.esEmergenciaVital && data.alertaEmergencia) {
        setAlertaEmergencia(data.alertaEmergencia);
      }

      if (data.comprobanteCodigo) {
        setComprobanteCodigo(data.comprobanteCodigo);
      }

      const respuestaAgente =
        data.respuestaVoz ||
        "Comprendo su solicitud. ¿Desea que busquemos una cita en Cali para esta especialidad?";

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
