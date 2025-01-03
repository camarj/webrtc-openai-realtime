import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_SESSION_URL = "https://api.openai.com/v1/realtime/sessions";
const OPENAI_API_URL = "https://api.openai.com/v1/realtime";
const MODEL_ID = "gpt-4o-mini-realtime-preview-2024-12-17";
const VOICE = "alloy";
const DEFAULT_INSTRUCTIONS =
  "Eres servicial y tienes algunas herramientas instaladas";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable not set.");
  throw new Error("OPENAI_API_KEY environment variable not set.");
}

export async function POST(req: NextRequest) {
  try {
    // Step 1: Retrieve the client's SDP from the request body
    const clientSDP = await req.text();
    if (!clientSDP) {
      return NextResponse.json(
        { error: "No SDP provided in the request body." },
        { status: 400 }
      );
    }

    console.log("Received SDP from client.");

    // Step 2: Generate ephemeral API token
    const tokenHeaders = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    };
    const tokenPayload = {
      model: MODEL_ID,
      voice: VOICE,
    };

    console.log("Requesting ephemeral token from OpenAI.");

    const tokenResponse = await fetch(OPENAI_SESSION_URL, {
      method: "POST",
      headers: tokenHeaders,
      body: JSON.stringify(tokenPayload),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        `Failed to obtain ephemeral token, status code: ${tokenResponse.status}, response: ${errorText}`
      );
      return NextResponse.json(
        { error: "Failed to obtain ephemeral token." },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const ephemeralToken = tokenData?.client_secret?.value;

    if (!ephemeralToken) {
      console.error("Ephemeral token is empty or not found in the response.");
      return NextResponse.json(
        { error: "Ephemeral token is empty or not found." },
        { status: 500 }
      );
    }

    console.info("Ephemeral token obtained successfully.");

    // Step 3: Perform SDP exchange with OpenAI's Realtime API using the ephemeral token
    const sdpHeaders = {
      Authorization: `Bearer ${ephemeralToken}`,
      "Content-Type": "application/sdp",
    };
    const sdpParams = new URLSearchParams({
      model: MODEL_ID,
      instructions: DEFAULT_INSTRUCTIONS,
      voice: VOICE,
    });

    const sdpUrl = `${OPENAI_API_URL}?${sdpParams.toString()}`;

    console.info(`Sending SDP to OpenAI Realtime API at ${sdpUrl}`);

    const sdpResponse = await fetch(sdpUrl, {
      method: "POST",
      headers: sdpHeaders,
      body: clientSDP,
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      console.error(
        `OpenAI API SDP exchange error, status code: ${sdpResponse.status}, response: ${errorText}`
      );
      return NextResponse.json(
        { error: "OpenAI API SDP exchange error." },
        { status: 500 }
      );
    }

    console.info("SDP exchange with OpenAI completed successfully.");

    // Step 4: Return OpenAI's SDP response to the client with the correct content type
    const sdpResponseBody = await sdpResponse.text();
    const contentType =
      sdpResponse.headers.get("Content-Type") || "application/sdp";

    return new NextResponse(sdpResponseBody, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error(
      "An error occurred during the RTC connection process:",
      error
    );
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
