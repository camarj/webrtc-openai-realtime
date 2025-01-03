"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  audioStream?: MediaStream | null;
}

const AudioVisualizer = ({ isActive, audioStream }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crear o reutilizar el contexto de audio
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;

    // Crear o reutilizar el analizador
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    const analyser = analyserRef.current;

    // Función para conectar un stream al analizador
    const connectStream = async (stream: MediaStream) => {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
    };

    // Conectar el micrófono y el stream de la IA
    Promise.all([
      navigator.mediaDevices.getUserMedia({ audio: true }),
      audioStream
        ? Promise.resolve(audioStream)
        : Promise.reject("No AI stream"),
    ])
      .then(([micStream, aiStream]) => {
        // Conectar ambos streams
        connectStream(micStream);
        connectStream(aiStream);
      })
      .catch((err) => {
        // Si falla alguno, intentar conectar solo el que esté disponible
        console.log("Error connecting to audio:", err);
        if (audioStream) {
          connectStream(audioStream);
        } else {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => connectStream(stream))
            .catch((err) => console.error("Error accessing audio:", err));
        }
      });

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgb(249, 250, 251)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Gradiente más vibrante
        const hue = barHeight / 2 + 200;
        const saturation = 70 + barHeight / 4;
        const lightness = 40 + barHeight / 4;
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        // Dibujar barras simétricas con efecto de onda
        const y = canvas.height / 2;
        const height = barHeight * 1.2; // Aumentar un poco la altura

        // Barra superior
        ctx.beginPath();
        ctx.roundRect(x, y - height, barWidth, height, [2]);
        ctx.fill();

        // Barra inferior (espejo)
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, [2]);
        ctx.fill();

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioStream]);

  return (
    <div className='w-full max-w-2xl mt-8'>
      <canvas
        ref={canvasRef}
        className='w-full h-32 rounded-lg shadow-lg bg-gray-50'
        width={800}
        height={128}
      />
    </div>
  );
};

export default AudioVisualizer;
