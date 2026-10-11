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

  // Referencias para control de audio y reconocimiento
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Silenciar errores tipo [object Event] no-Error en dev overlay
  useEffect(() => {
    if (typeof window === "undefined") return;

    synthRef.current = window.speechSynthesis;

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

  const hablarTexto = (texto: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis || synthRef.current;
    if (!synth) return;

    try {
      synth.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CO";
    utterance.rate = 0.98;
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
      synth.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const iniciarReconocimientoFresco = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msgNoSoporte =
        "Tu navegador no cuenta con la API Web Speech activa. Puedes escribir tu consulta en el campo de texto o usar Chrome/Edge con permisos de micrófono.";
      setMensajes((prev) => [
        ...prev,
        {
          id: `msg-nosupport-${Date.now()}`,
          remitente: "asistente",
          texto: msgNoSoporte,
          hora: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      hablarTexto(msgNoSoporte);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "es-CO";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim().length > 0) {
          manejarEntradaUsuario(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        const errorName = event?.error || "desconocido";
        console.warn("Reconocimiento de voz onerror:", errorName);

        if (errorName === "not-allowed" || errorName === "service-not-allowed") {
          const msgPermiso =
            "Para hablar por micrófono, habilita el permiso de micrófono en el candado 🔒 de tu navegador (en Brave, asegúrate de permitir 'Servicios de voz' en Configuración). También puedes usar la caja de texto.";
          setMensajes((prev) => [
            ...prev,
            {
              id: `msg-perm-${Date.now()}`,
              remitente: "asistente",
              texto: msgPermiso,
              hora: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error al iniciar reconocimiento:", err);
      setIsListening(false);
    }
  };

  const toggleEscucha = async () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    // Cancelar cualquier audio en reproducción
    if (typeof window !== "undefined") {
      try {
        (window.speechSynthesis || synthRef.current)?.cancel();
      } catch {}
    }

    // Solicitar permiso explícito al micrófono vía getUserMedia
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        // Detener los tracks temporales para que SpeechRecognition acceda limpiamente al audio
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn("Acceso a micrófono no permitido:", err);
        const msgErrorMic =
          "No se pudo acceder al micrófono. Por favor permite el acceso al micrófono en el ícono del candado 🔒 de tu navegador.";
        setMensajes((prev) => [
          ...prev,
          {
            id: `msg-mic-err-${Date.now()}`,
            remitente: "asistente",
            texto: msgErrorMic,
            hora: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }
    }

    iniciarReconocimientoFresco();
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
