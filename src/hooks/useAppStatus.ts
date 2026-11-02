"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppStatus } from "@/lib/types";

/** Server capabilities (active providers, OAuth connections). Null until known. */
export function useAppStatus() {
  const [status, setStatus] = useState<AppStatus | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) setStatus((await res.json()) as AppStatus);
    } catch {
      // offline — keep whatever we had
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<AppStatus>) : null))
      .then((body) => {
        if (!cancelled && body) setStatus(body);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, reload };
}
