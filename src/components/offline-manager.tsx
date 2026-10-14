"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";

const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function OfflineManager({
  showStatus = true,
}: {
  showStatus?: boolean;
}) {
  const activeMatch = useGameStore(
    (state) => state.current?.game.status === "playing",
  );
  const hydrated = useGameStore((state) => state.hydrated);
  const readOnly = useGameStore((state) => state.readOnly);
  const [status, setStatus] = useState(
    process.env.NODE_ENV === "production"
      ? "Preparing offline files..."
      : "Offline support is available in the production export.",
  );
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [applying, setApplying] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const requested = useRef(false);
  const repairCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    if (!("serviceWorker" in navigator)) {
      let disposed = false;
      queueMicrotask(() => {
        if (!disposed)
          setStatus("Offline support is unavailable in this browser.");
      });
      return () => {
        disposed = true;
      };
    }
    let disposed = false;
    const cleanups: (() => void)[] = [];
    const check = () => {
      const worker = navigator.serviceWorker.controller;
      if (!worker) return;
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => {
        channel.port1.close();
        if (!disposed)
          setStatus(
            "Offline files could not be verified. Reconnect and reopen the app.",
          );
      }, 10000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        if (!disposed) setIncomplete(!event.data.ready);
        if (!disposed)
          setStatus(
            event.data.ready
              ? "Ready offline"
              : "Offline files are incomplete. Reconnect and reopen the app.",
          );
      };
      worker.postMessage({ type: "OFFLINE_STATUS" }, [channel.port2]);
      cleanups.push(() => {
        clearTimeout(timer);
        channel.port1.close();
      });
    };
    const changed = () => {
      if (requested.current) window.location.reload();
      else check();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    void navigator.serviceWorker
      .register(`${base}/sw.js`, { scope: `${base}/`, updateViaCache: "none" })
      .then((registration) => {
        if (disposed) return;
        // No controller means a first install, which is not an update.
        setWaiting(navigator.serviceWorker.controller ? registration.waiting : null);
        check();
        const track = () => {
          const worker = registration.installing;
          if (!worker) return;
          const stateChanged = () => {
            if (disposed) return;
            if (worker.state === "installed") {
              setWaiting(
                navigator.serviceWorker.controller ? registration.waiting : null,
              );
              check();
            }
            if (worker.state === "redundant")
              setStatus(
                "Offline download failed. Reconnect and reopen the app.",
              );
          };
          worker.addEventListener("statechange", stateChanged);
          cleanups.push(() =>
            worker.removeEventListener("statechange", stateChanged),
          );
        };
        track();
        registration.addEventListener("updatefound", track);
        cleanups.push(() =>
          registration.removeEventListener("updatefound", track),
        );
      })
      .catch(() => {
        if (!disposed)
          setStatus("Offline setup failed. Reconnect and reopen the app.");
      });
    return () => {
      disposed = true;
      repairCleanup.current?.();
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  if (!showStatus) return null;
  return (
    <div className="local-note" data-testid="offline-manager">
      <span role="status">
        {status}
        {waiting ? ". Update available." : ""}
      </span>
      {waiting && (
        <button
          type="button"
          disabled={!hydrated || readOnly || activeMatch || applying}
          onClick={() => {
            if (
              !useGameStore.getState().hydrated ||
              useGameStore.getState().readOnly ||
              useGameStore.getState().current?.game.status === "playing"
            )
              return;
            requested.current = true;
            setApplying(true);
            waiting.postMessage({ type: "APPLY_UPDATE" });
          }}
        >
          Update
        </button>
      )}
      {waiting && activeMatch && <span>Finish your match to update.</span>}
      {waiting && readOnly && <span>Update from the active tab.</span>}
      {incomplete && (
        <button
          type="button"
          disabled={repairing}
          onClick={() => {
            const worker = navigator.serviceWorker.controller;
            if (!worker) return;
            setRepairing(true);
            const channel = new MessageChannel();
            const finish = (ready: boolean) => {
              repairCleanup.current?.();
              setRepairing(false);
              setIncomplete(!ready);
              setStatus(
                ready
                  ? "Ready offline"
                  : "Offline download failed. Reconnect, then download offline files again.",
              );
            };
            const timer = setTimeout(() => finish(false), 60000);
            repairCleanup.current = () => {
              clearTimeout(timer);
              channel.port1.close();
            };
            channel.port1.onmessage = (event) => {
              clearTimeout(timer);
              finish(!!event.data.ready);
            };
            worker.postMessage({ type: "REPAIR_OFFLINE" }, [channel.port2]);
          }}
        >
          {repairing ? "Downloading..." : "Download offline files"}
        </button>
      )}
    </div>
  );
}
