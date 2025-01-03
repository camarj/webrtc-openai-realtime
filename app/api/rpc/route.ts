import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/realtime";
const DEFAULT_INSTRUCTIONS =
  "Eres servicial y tienes algunas herramientas instaladas puedes cambiar la apariencia de la wep app";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // Get the body from the incoming request
    const body = await req.text();

    // Build the OpenAI API request URL
    const url = `${OPENAI_API_URL}?model=gpt-4o-mini-realtime-preview-2024-12-17&instructions=${encodeURIComponent(
      DEFAULT_INSTRUCTIONS
    )}&voice=alloy`;

    // Set the headers for the request to OpenAI API
    const headers = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/sdp",
    };

    // Send the POST request to the OpenAI API
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    // Pass through the response from OpenAI
    const responseBody = await response.text();
    const contentType =
      response.headers.get("Content-Type") || "application/sdp";

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("Error connecting to OpenAI API:", error);
    return NextResponse.json(
      { error: "Failed to connect to OpenAI API" },
      { status: 500 }
    );
  }
}
