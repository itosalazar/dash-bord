import "server-only";
import { cookies } from "next/headers";
import type { ProviderError, ProviderResult } from "@/lib/types";
import { isRequestAuthorized, SESSION_COOKIE } from "./session";

/** Defence in depth: the proxy already guards /api, route handlers re-check. */
export async function requireSession(): Promise<Response | null> {
  const jar = await cookies();
  const ok = await isRequestAuthorized(jar.get(SESSION_COOKIE)?.value);
  return ok ? null : Response.json({ error: "unauthorized" }, { status: 401 });
}

const NO_STORE = { "Cache-Control": "private, no-store" };

export function providerJson<T>(result: ProviderResult<T>): Response {
  return Response.json(result, { headers: NO_STORE });
}

export function ok<T>(source: string, data: T): ProviderResult<T> {
  return { ok: true, source, data, fetchedAt: new Date().toISOString() };
}

export function fail(source: string, error: ProviderError): ProviderResult<never> {
  return { ok: false, source, error };
}

/** Small fetch wrapper with a hard timeout; never used at build time. */
export async function fetchWithTimeout(input: string | URL, init: RequestInit = {}, timeoutMs = 8000) {
  return fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
