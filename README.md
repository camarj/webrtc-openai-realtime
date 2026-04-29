# openai-realtime-webrtc-starter

> Starter kit Next.js + WebRTC + OpenAI Realtime API. Construye apps de voz con IA que pueden ver y modificar tu UI en tiempo real.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ¿Qué hace?

Esta app establece una conexión WebRTC directa con la [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) y expone herramientas que la IA puede ejecutar en tu navegador mediante function calling.

Habla con la IA. Ella puede:
- 🎨 Cambiar el color de fondo de la página
- ✏️ Cambiar el color del texto
- 📄 Leer el HTML completo de la página
- 🔘 Modificar el estilo de los botones

Todo en tiempo real, por voz.

## Arquitectura

```
┌──────────────┐      WebRTC (SDP)       ┌─────────────────────┐
│   Navegador  │ ◄──────────────────────►│  OpenAI Realtime API│
│   (Cliente)  │    + data channel       │   (GPT-4o Realtime) │
└──────┬───────┘                         └─────────────────────┘
       │
       │ Function calls
       ▼
┌─────────────────────────┐
│ changeBackgroundColor() │
│ changeTextColor()       │
│ getPageHTML()           │
│ changeButtonStyle()     │
└─────────────────────────┘
```

## Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Comunicación:** WebRTC (RTCPeerConnection + RTCDataChannel)
- **IA:** OpenAI Realtime API (`gpt-4o-mini-realtime-preview`)
- **Audio:** Web Audio API + visualizador personalizado

## Instalación

```bash
# 1. Clonar
git clone https://github.com/camarj/webrtc-openai-realtime.git
cd webrtc-openai-realtime

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu OPENAI_API_KEY

# 4. Correr
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

```bash
OPENAI_API_KEY=sk-proj-...
```

## Cómo funciona

### 1. Inicio de sesión (backend)

El backend (`/api/session`) solicita un **ephemeral token** a OpenAI. Este token es de corta duración y se usa solo para el handshake WebRTC — tu API key nunca llega al navegador.

### 2. Handshake WebRTC (frontend)

```typescript
const pc = new RTCPeerConnection();
const dc = pc.createDataChannel("response");

// 1. Obtener micrófono
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
stream.getTracks().forEach(track => pc.addTransceiver(track, { direction: "sendrecv" }));

// 2. Crear offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// 3. Enviar SDP al backend, recibir answer
const answer = await fetch("/api/rpc", { method: "POST", body: offer.sdp });
await pc.setRemoteDescription({ sdp: answer, type: "answer" });
```

### 3. Function Calling

El canal de datos (`RTCDataChannel`) recibe instrucciones de la IA y ejecuta funciones en el DOM:

```typescript
// Ejemplo: la IA pide cambiar el fondo a azul
const fns = {
  changeBackgroundColor: ({ color }: { color: string }) => {
    document.body.style.backgroundColor = color;
    return { success: true, color };
  }
};
```

### 4. Audio bidireccional

- Tu voz → micrófono → WebRTC → OpenAI
- Respuesta de IA → WebRTC → altavoz (automático)

## Extender

Agregar una nueva herramienta es trivial:

1. Regístrala en el `session.update` (tools array)
2. Agrega la función en el objeto `fns`
3. Mapea el nombre en `functionNameMap`

La IA automáticamente descubre que puede usarla.

## Recursos

- [OpenAI Realtime API docs](https://platform.openai.com/docs/guides/realtime)
- [WebRTC MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

## License

MIT © [Raúl Camacho](https://github.com/camarj)
