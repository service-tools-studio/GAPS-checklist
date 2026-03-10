import { NextResponse, type NextRequest } from "next/server";

const GATE_COOKIE = "gaps_gate";
const PAYLOAD = "v";

async function verifyGateTokenEdge(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(PAYLOAD)
    );
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return token.length === hex.length && token === hex;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow gate check and submit
  if (pathname === "/api/gate") {
    return NextResponse.next();
  }

  const secret = process.env.GAPS_APP_PASSWORD;
  if (!secret) {
    return NextResponse.next();
  }

  // Protect other API routes
  if (pathname.startsWith("/api/")) {
    const token = request.cookies.get(GATE_COOKIE)?.value;
    return verifyGateTokenEdge(token, secret).then((ok) =>
      ok ? NextResponse.next() : NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  return NextResponse.next();
}
