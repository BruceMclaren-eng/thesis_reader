import { useEffect, useRef } from "react";
import { api } from "../api/client.js";

const REPORT_INTERVAL_MS = 20_000;

export function useReadingSession(paperId) {
  const accumulatedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (!paperId) return undefined;

    lastTickRef.current = Date.now();
    accumulatedRef.current = 0;

    function tick() {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      if (document.visibilityState === "visible") {
        accumulatedRef.current += delta;
      }
    }

    function flush(useBeacon = false) {
      tick();
      const seconds = Math.round(accumulatedRef.current);
      accumulatedRef.current = 0;
      if (seconds <= 0) return;
      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ seconds })], { type: "application/json" });
        navigator.sendBeacon(`/api/papers/${paperId}/session`, blob);
      } else {
        api.reportSession(paperId, seconds).catch(() => {});
      }
    }

    const intervalId = setInterval(flush, REPORT_INTERVAL_MS);

    function handleVisibilityChange() {
      tick();
      if (document.visibilityState === "hidden") flush(true);
    }
    function handlePageHide() {
      flush(true);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      flush(true);
    };
  }, [paperId]);
}
