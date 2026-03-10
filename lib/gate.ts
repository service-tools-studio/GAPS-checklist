import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "gaps_gate";
const PAYLOAD = "v";

export function getGateSecret(): string | undefined {
  return process.env.GAPS_APP_PASSWORD;
}

export function isGateEnabled(): boolean {
  return Boolean(getGateSecret());
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createGateToken(): string {
  const secret = getGateSecret();
  if (!secret) return "";
  return sign(PAYLOAD, secret);
}

export function verifyGateToken(token: string | undefined): boolean {
  const secret = getGateSecret();
  if (!secret) return true; // gate disabled
  if (!token || typeof token !== "string") return false;
  const expected = createGateToken();
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function getGateCookieName(): string {
  return COOKIE_NAME;
}
