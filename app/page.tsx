"use client"; // Indica que este archivo se ejecuta en el cliente (navegador)

import { Button } from "@/components/ui/button"; // Importa el componente Button desde la carpeta de componentes
import { useState, useRef } from "react"; // Importa hooks de React
import AudioVisualizer from "@/components/AudioVisualizer";

// Componente principal de la página WebRTC
export default function WebRTCPage() {
  // Estado para controlar si WebRTC está activo
  const [isWebRTCActive, setIsWebRTCActive] = useState(false);
  // Referencias para la conexión de peer y el canal de datos
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Funciones que se pueden ejecutar desde el canal de datos
  const fns = {
    // Cambia el color de fondo de la página
    changeBackgroundColor: ({ color }: { color: string }) => {
      console.log("Cambiando color de fondo a:", color);
      document.body.style.backgroundColor = color;
      return { success: true, color };
    },
    // Cambia el color del texto de la página
    changeTextColor: ({ color }: { color: string }) => {
      console.log("Cambiando color de texto a:", color);
      document.body.style.color = color;
      return { success: true, color };
    },
    // Obtiene el HTML de la página actual
    getPageHTML: () => {
      return {
        success: true,
        html: document.documentElement.outerHTML,
      };
    },
    // Cambia el estilo del botón (tamaño y color)
    changeButtonStyle: ({ size, color }: { size: string; color: string }) => {
      const button = document.querySelector("button");
      if (button) {
        if (size) button.style.fontSize = size;
        if (color) button.style.backgroundColor = color;
        return { success: true, size, color };
      }
      return { success: false, message: "Button element not found" };
    },
  };

  // Maneja la recepción de una pista de audio
  const handleTrack = (event: RTCTrackEvent) => {
    console.log("Recibiendo track de audio");
    const audioElement = document.createElement("audio");
    audioElement.srcObject = event.streams[0];
    audioElement.autoplay = true;
    audioElement.style.display = "none";
    document.body.appendChild(audioElement);

    // Guardar el stream para el visualizador
    setAudioStream(event.streams[0]);
  };

  // Crea un canal de datos para la comunicación
  const createDataChannel = () => {
    console.log("Intentando crear el canal de datos...");
    const dataChannel =
      peerConnectionRef.current?.createDataChannel("response");
    if (!dataChannel) {
      console.error("No se pudo crear el canal de datos.");
      return;
    }

    dataChannel.addEventListener("open", () => {
      console.log("Canal de datos abierto.");
      configureData();
    });

    dataChannel.addEventListener("message", async (event: MessageEvent) => {
      console.log("Mensaje recibido en el canal de datos:", event.data);
      const msg = JSON.parse(event.data);

      // Función auxiliar para ejecutar la función correspondiente
      const executeFunctionCall = async (
        name: string,
        args: string,
        callId: string
      ) => {
        const functionNameMap: { [key: string]: keyof typeof fns } = {
          cambiarColorDeFondo: "changeBackgroundColor",
          changeTextColor: "changeTextColor",
          getPageHTML: "getPageHTML",
          changeButtonStyle: "changeButtonStyle",
        };

        const mappedFunctionName = functionNameMap[name];
        const fn = fns[mappedFunctionName];

        if (fn) {
          try {
            const parsedArgs = JSON.parse(args);
            console.log(
              `Ejecutando función ${name} (${mappedFunctionName}) con argumentos:`,
              parsedArgs
            );
            const result = await fn(parsedArgs);
            console.log("Resultado de la función:", result);

            const response = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify(result),
              },
            };
            dataChannel.send(JSON.stringify(response));
          } catch (error) {
            console.error(`Error al ejecutar la función ${name}:`, error);
          }
        } else {
          console.error(`Función no encontrada: ${name}`);
        }
      };

      // Manejar diferentes tipos de mensajes
      if (msg.type === "response.function_call_arguments.done") {
        await executeFunctionCall(msg.name, msg.arguments, msg.call_id);
      } else if (
        msg.type === "response.output_item.done" &&
        msg.item?.type === "function_call"
      ) {
        await executeFunctionCall(
          msg.item.name,
          msg.item.arguments,
          msg.item.call_id
        );
      }
    });
    dataChannelRef.current = dataChannel;
    console.log("Canal de datos configurado correctamente.");
  };

  // Configura los datos de la sesión
  const configureData = () => {
    console.log("Configurando datos de la sesión...");
    const event = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        tools: [
          {
            type: "function",
            name: "cambiarColorDeFondo",
            description: "Cambiar el color de fondo de la página web",
            parameters: {
              type: "object",
              properties: {
                color: {
                  type: "string",
                  description: "Valor hexadecimal del color",
                },
              },
            },
          },
          {
            type: "function",
            name: "changeTextColor",
            description: "Cambiar el color del texto de la página web",
            parameters: {
              type: "object",
              properties: {
                color: {
                  type: "string",
                  description: "Hexadecimal value of the color",
                },
              },
            },
          },
          {
            type: "function",
            name: "getPageHTML",
            description: "Obtener el contenido HTML de la página actual",
          },
          {
            type: "function",
            name: "changeButtonStyle",
            description: "Cambiar el tamaño y el color del botón",
            parameters: {
              type: "object",
              properties: {
                size: {
                  type: "string",
                  description: "Tamaño de la fuente del botón (e.g., '16px')",
                },
                color: {
                  type: "string",
                  description: "Color de fondo del botón (e.g., '#ff0000')",
                },
              },
            },
          },
        ],
      },
    };
    console.log("Enviando configuración de sesión:", event);
    dataChannelRef.current?.send(JSON.stringify(event));
    console.log("Configuración de sesión enviada.");
  };

  // Inicia la conexión WebRTC
  const startWebRTC = () => {
    if (isWebRTCActive) return;
    console.log("Iniciando WebRTC...");

    const peerConnection = new RTCPeerConnection();
    // Guardamos la referencia inmediatamente
    peerConnectionRef.current = peerConnection;

    // Configuramos los handlers
    peerConnection.ontrack = handleTrack;

    // Creamos el canal de datos después de establecer la referencia
    createDataChannel();

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream
          .getTracks()
          .forEach((track) =>
            peerConnection.addTransceiver(track, { direction: "sendrecv" })
          );
        return peerConnection.createOffer();
      })
      .then((offer) => {
        return peerConnection.setLocalDescription(offer).then(() => offer);
      })
      .then((offer) => {
        return fetch(`/api/rpc`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });
      })
      .then((response) => response.text())
      .then((answer) => {
        return peerConnection.setRemoteDescription({
          sdp: answer,
          type: "answer",
        });
      })
      .then(() => {
        setIsWebRTCActive(true);
        console.log("WebRTC iniciado completamente.");
      })
      .catch((error) => {
        console.error("Error en el proceso de WebRTC:", error);
        stopWebRTC(); // Limpiamos en caso de error
      });
  };

  // Detiene la conexión WebRTC
  const stopWebRTC = () => {
    if (!isWebRTCActive) return;
    console.log("Deteniendo WebRTC...");
    const peerConnection = peerConnectionRef.current;
    if (peerConnection) {
      peerConnection
        .getReceivers()
        .forEach((receiver) => receiver.track.stop());
      peerConnection.close();
      console.log("Conexión de peer cerrada.");
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      console.log("Canal de datos cerrado.");
    }
    peerConnectionRef.current = null;
    dataChannelRef.current = null;
    setIsWebRTCActive(false);
    console.log("WebRTC detenido.");
  };

  // Alterna el estado de la conexión WebRTC
  const toggleWebRTC = () => {
    if (isWebRTCActive) {
      stopWebRTC();
    } else {
      startWebRTC();
    }
  };

  // Renderiza el botón para iniciar/detener WebRTC
  return (
    <div className='flex flex-col items-center min-h-screen p-8'>
      <div className='w-full max-w-2xl'>
        <h1 className='text-4xl font-bold text-center mb-4 text-gray-800'>
          WebRTC con OpenAI
        </h1>
        <h2 className='text-xl text-center mb-8 text-gray-600'>
          Llamado a funciones en tiempo real
        </h2>

        <div className='flex justify-center'>
          <Button
            variant='outline'
            className={`
              px-8 py-4 text-lg font-medium rounded-lg transition-all duration-200
              ${
                isWebRTCActive
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-500"
                  : "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
              }
            `}
            id='toggleWebRTCButton'
            onClick={toggleWebRTC}>
            {isWebRTCActive ? "Detener Conexión" : "Iniciar Conexión"}
          </Button>
        </div>

        {/* Visualizador de Audio */}
        <AudioVisualizer isActive={isWebRTCActive} audioStream={audioStream} />
      </div>
    </div>
  );
}
