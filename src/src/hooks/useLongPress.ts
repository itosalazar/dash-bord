"use client";

import { useCallback, useEffect, useRef } from "react";

/** Long-press on touch, pen or mouse. Cancels if the finger drifts. */
export function useLongPress(onLongPress: () => void, delayMs = 650) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    origin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      origin.current = { x: event.clientX, y: event.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        origin.current = null;
        onLongPress();
      }, delayMs);
    },
    onPointerMove: (event: React.PointerEvent) => {
      const start = origin.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  };
}
