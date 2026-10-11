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

  const [textoEnVivo, setTextoEnVivo] = useState<string>("");
  const silenceTimerRef = useRef<any>(null);
  const ultimoTranscriptRef = useRef<string>("");

  const iniciarReconocimientoFresco = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msgNoSoporte =
        "Tu navegador actual no tiene activado el reconocimiento de voz por Web Speech. En Google Chrome o Microsoft Edge funciona de manera nativa. También puedes usar los accesos rápidos de voz o la caja de texto inferior.";
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
      recognition.continuous = true; // Escucha continua para que no se cierre si el usuario toma una pausa
      recognition.interimResults = true; // Ver lo que dice en tiempo real
      recognition.maxAlternatives = 1;

      ultimoTranscriptRef.current = "";
      setTextoEnVivo("");

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let textoAcumulado = "";
        for (let i = 0; i < event.results.length; i++) {
          textoAcumulado += event.results[i][0].transcript + " ";
        }
        textoAcumulado = textoAcumulado.trim();

        if (textoAcumulado) {
          ultimoTranscriptRef.current = textoAcumulado;
          setTextoEnVivo(textoAcumulado);

          // Si el usuario termina una frase y hace una pausa de 1.4 segundos, enviar automáticamente
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (ultimoTranscriptRef.current.trim().length > 0) {
              const textoFinal = ultimoTranscriptRef.current.trim();
              ultimoTranscriptRef.current = "";
              setTextoEnVivo("");
              try {
                recognition.stop();
              } catch {}
              setIsListening(false);
              manejarEntradaUsuario(textoFinal);
            }
          }, 1400);
        }
      };

      recognition.onerror = (event: any) => {
        const errorName = event?.error || "desconocido";
        console.warn("Reconocimiento de voz onerror:", errorName);

        // Si es no-speech, NO detener la escucha, permitir que el usuario empiece a hablar
        if (errorName === "no-speech") {
          return;
        }

        setIsListening(false);
        setTextoEnVivo("");

        if (errorName === "not-allowed" || errorName === "service-not-allowed") {
          const msgPermiso =
            "Acceso al micrófono no permitido. Por favor haz clic en el ícono del candado 🔒 en la barra de direcciones de tu navegador y activa 'Permitir micrófono'. En Brave, habilita además 'Servicios de voz' en Configuración de extensiones o utiliza Google Chrome / Edge.";
          setMensajes((prev) => [
            ...prev,
            {
              id: `msg-perm-${Date.now()}`,
              remitente: "asistente",
              texto: msgPermiso,
              hora: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        } else if (errorName === "network") {
          const msgNetwork =
            "El servicio de voz del navegador no pudo conectarse. Si estás usando Brave Browser, este bloquea el servicio de voz por defecto; puedes usar Google Chrome, Microsoft Edge o las frases rápidas de consulta.";
          setMensajes((prev) => [
            ...prev,
            {
              id: `msg-net-${Date.now()}`,
              remitente: "asistente",
              texto: msgNetwork,
              hora: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      };

      recognition.onend = () => {
        // Si había texto acumulado al terminar, procesarlo
        if (ultimoTranscriptRef.current.trim().length > 0) {
          const textoFinal = ultimoTranscriptRef.current.trim();
          ultimoTranscriptRef.current = "";
          setTextoEnVivo("");
          setIsListening(false);
          manejarEntradaUsuario(textoFinal);
        } else {
          setIsListening(false);
          setTextoEnVivo("");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error al iniciar reconocimiento:", err);
      setIsListening(false);
      setTextoEnVivo("");
    }
  };

  const toggleEscucha = async () => {
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);

      if (ultimoTranscriptRef.current.trim().length > 0) {
        const textoFinal = ultimoTranscriptRef.current.trim();
        ultimoTranscriptRef.current = "";
        setTextoEnVivo("");
        manejarEntradaUsuario(textoFinal);
      }
      return;
    }

    // Cancelar cualquier audio en reproducción
    if (typeof window !== "undefined") {
      try {
        (window.speechSynthesis || synthRef.current)?.cancel();
      } catch {}
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
    textoEnVivo,
    mensajes,
    comprobanteCodigo,
    alertaEmergencia,
    toggleEscucha,
    enviarTextoManual: manejarEntradaUsuario,
  };
}
