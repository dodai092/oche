"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isX01, useGameStore } from "@/lib/store";
import {
  botTarget,
  isBotDifficulty,
  scheduleBotDart,
  type BotTurnState,
} from "@/lib/bot";
import { dartLabel } from "@/lib/engine";
import { Button } from "./ui/button";
const subscribeVisibility = (callback: () => void) => {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
};

/** Mount once throughout the live match, including human turns. No props.
 * Parent owns config.bot and store.readOnly, and disables human scoring on bot turns.
 * Unmount on leaving the match. Pause is local to this mounted match, not persisted.
 */
function botState(): BotTurnState {
  const s = useGameStore.getState();
  return { ...s, current: isX01(s.current) ? s.current : null };
}
export function BotTurn() {
  const raw = useGameStore();
  const store: BotTurnState = {
    ...raw,
    current: isX01(raw.current) ? raw.current : null,
  };
  const { current, hydrated, readOnly } = store;
  if (!current || !current.game.config.bot) return null;
  return (
    <BotTurnControls
      key={current.id}
      current={current}
      hydrated={hydrated}
      readOnly={readOnly}
    />
  );
}

// Match identity resets pause. Ordinary dart and undo updates keep it mounted.
function BotTurnControls({
  current,
  hydrated,
  readOnly,
}: {
  current: NonNullable<BotTurnState["current"]>;
  hydrated: boolean;
  readOnly?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const pauseRef = useRef(false);
  const game = current.game;
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const bot = game.config.bot;
  const active =
    !!bot &&
    !!game &&
    game.status === "playing" &&
    game.players[game.activePlayer].id === bot.playerId &&
    isBotDifficulty(bot.difficulty);

  useEffect(() => {
    if (!active || paused || !hydrated || readOnly || !visible) return;
    return scheduleBotDart(
      botState,
      current,
      () => pauseRef.current,
    );
  }, [current, active, paused, hydrated, readOnly, visible]);

  if (!bot || game.status !== "playing") return null;
  const lastTurn = game.turns.at(-1);
  const lastIsBot =
    !!lastTurn && game.players[lastTurn.playerIndex].id === bot.playerId;

  function changePause(value: boolean) {
    // Block an already queued timer immediately, before React commits the render.
    pauseRef.current = value;
    setPaused(value);
  }

  return (
    <section className="panel" aria-label="DartBot controls">
      <p role="status">
        {readOnly
          ? "DartBot unavailable in read-only mode."
          : paused
            ? "DartBot paused."
            : active
              ? `DartBot aiming at ${dartLabel(botTarget(game))}.`
              : "DartBot waiting for its turn."}
      </p>
      {lastIsBot && lastTurn && (
        <p className="small muted">
          Thrown: {lastTurn.darts.map(dartLabel).join(" · ")}
          {lastTurn.bust ? " · Bust" : ""}
        </p>
      )}
      <div className="action-row">
        <Button
          variant="outline"
          disabled={!!readOnly}
          onClick={() => changePause(!paused)}
        >
          {paused ? "Resume DartBot" : "Pause DartBot"}
        </Button>
        <Button
          variant="ghost"
          disabled={!lastTurn || !!readOnly}
          onClick={() => {
            changePause(true);
            const latest = useGameStore.getState();
            if (
              latest.current?.id === current.id &&
              isX01(latest.current) &&
              latest.current.game === game
            )
              latest.undo(true);
          }}
        >
          {lastIsBot ? "Undo bot turn" : "Undo my last visit"}
        </Button>
      </div>
    </section>
  );
}
