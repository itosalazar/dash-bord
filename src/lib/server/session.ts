import { jwtVerify, SignJWT } from "jose";

/**
 * Session token helpers. Kept free of `server-only` + Node built-ins so the
 * proxy can import them too. Reads env directly for the same reason.
 */

export const SESSION_COOKIE = "dashbord_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days — it's a desk device

function secretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export type AuthMode =
  | { kind: "enabled" }
  | { kind: "open" } // development without a passphrase
  | { kind: "misconfigured"; reason: string }; // production without auth env — fail closed

export function authMode(): AuthMode {
  const passphrase = process.env.DASHBORD_PASSPHRASE?.trim();
  const hasSecret = secretKey() !== null;
  if (passphrase && hasSecret) return { kind: "enabled" };
  if (process.env.NODE_ENV !== "production" && !passphrase) return { kind: "open" };
  return {
    kind: "misconfigured",
    reason: !passphrase
      ? "DASHBORD_PASSPHRASE is not set."
      : "AUTH_SECRET is missing or shorter than 32 characters.",
  };
}

export async function createSessionToken(): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("AUTH_SECRET is not configured");
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setIssuer("dash-bord")
    .sign(key);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const key = secretKey();
  if (!key || !token) return false;
  try {
    const { payload } = await jwtVerify(token, key, { issuer: "dash-bord", algorithms: ["HS256"] });
    return payload.sub === "owner";
  } catch {
    return false;
  }
}

/** Reads the session cookie from a request and checks it against the auth mode. */
export async function isRequestAuthorized(cookieValue: string | undefined): Promise<boolean> {
  const mode = authMode();
  if (mode.kind === "open") return true;
  if (mode.kind === "misconfigured") return false;
  return verifySessionToken(cookieValue);
}
