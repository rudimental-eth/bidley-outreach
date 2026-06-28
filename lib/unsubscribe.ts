import { createHmac } from "node:crypto";

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function makeToken(email: string, secret: string): string {
  const payload = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyToken(
  token: string,
  secret: string,
): { valid: boolean; email?: string } {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return { valid: false };
  if (sign(payload, secret) !== sig) return { valid: false };
  return { valid: true, email: Buffer.from(payload, "base64url").toString("utf8") };
}
