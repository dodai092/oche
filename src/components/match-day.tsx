"use client";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";
import { scoreAnnouncement } from "@/lib/announcements";
export function useMatchDay() {
  const { current, settings, readOnly, updateSettings } = useGameStore();
  const [speech, setSpeech] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("");
  const [speechStatus, setSpeechStatus] = useState("");
  const [capabilities] = useState(() => ({
    wake: typeof navigator !== "undefined" && "wakeLock" in navigator,
    speech: typeof window !== "undefined" && "speechSynthesis" in window,
  }));
  const previous = useRef({
    id: current?.id,
    events: current?.game.events.length ?? 0,
  });
  const playing = current?.game.status === "playing" && !readOnly;
  useEffect(() => {
    if (!settings.keepAwake || !playing || !capabilities.wake) return;
    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | undefined;
    async function acquire() {
      if (
        disposed ||
        pending ||
        (lock && !lock.released) ||
        document.visibilityState !== "visible"
      )
        return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed) {
          await next.release();
          return;
        }
        lock = next;
        setWakeStatus("Screen awake while this match is visible.");
        next.addEventListener("release", () => {
          if (!disposed)
            setWakeStatus(
              "Screen wake lock released. Return to the match or toggle to retry.",
            );
        });
      } catch {
        if (!disposed)
          setWakeStatus(
            "Screen wake lock was declined. Your device may still sleep.",
          );
      } finally {
        pending = false;
      }
    }
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [settings.keepAwake, playing, capabilities.wake]);
  useEffect(() => {
    const before = previous.current;
    previous.current = {
      id: current?.id,
      events: current?.game.events.length ?? 0,
    };
    if (!capabilities.speech) return;
    if (
      !speech ||
      readOnly ||
      document.visibilityState !== "visible" ||
      before.id !== current?.id ||
      (current?.game.events.length ?? 0) < before.events
    ) {
      window.speechSynthesis.cancel();
      return;
    }
    if ((current?.game.events.length ?? 0) === before.events) return;
    const message = current && scoreAnnouncement(current.game);
    if (!message) return;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-GB";
    utterance.onerror = () =>
      setSpeechStatus(
        "Speech was interrupted or unavailable. Scores remain visible.",
      );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [current, speech, readOnly, capabilities.speech]);
  useEffect(() => {
    if (!capabilities.speech) return;
    const stop = () => {
      if (document.visibilityState !== "visible")
        window.speechSynthesis.cancel();
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      document.removeEventListener("visibilitychange", stop);
      window.speechSynthesis.cancel();
    };
  }, [capabilities.speech]);
  return (
    <section
      className="panel match-day-controls"
      aria-label="Match-day controls"
    >
      <h2>Match-day controls</h2>
      <label className="setting-toggle">
        <span>
          <strong>Keep screen awake</strong>
          <small>
            {!capabilities.wake
              ? "Unavailable in this browser."
              : !settings.keepAwake
                ? "Keep the screen on during visible matches."
                : !playing
                  ? "Starts when a match is active in this tab."
                  : wakeStatus || "Requesting screen access..."}
          </small>
        </span>
        <input
          type="checkbox"
          checked={settings.keepAwake}
          disabled={!capabilities.wake || readOnly}
          onChange={(e) => updateSettings({ keepAwake: e.target.checked })}
        />
      </label>
      <label className="setting-toggle">
        <span>
          <strong>Spoken scores</strong>
          <small>
            {!capabilities.speech
              ? "Unavailable in this browser."
              : speechStatus ||
                "Announce completed visits and the next player. Off each time you open a match."}
          </small>
        </span>
        <input
          type="checkbox"
          checked={speech}
          disabled={!capabilities.speech || readOnly}
          onChange={(e) => {
            setSpeech(e.target.checked);
            setSpeechStatus("");
            if (e.target.checked) {
              const u = new SpeechSynthesisUtterance(
                "Score announcements enabled.",
              );
              u.lang = "en-GB";
              u.onerror = () =>
                setSpeechStatus(
                  "Speech could not start. Check your device audio settings.",
                );
              window.speechSynthesis.speak(u);
            } else window.speechSynthesis.cancel();
          }}
        />
      </label>
      <p className="small muted">
        Speech uses voices supplied by your browser and device. Offline
        availability varies.
      </p>
    </section>
  );
}
