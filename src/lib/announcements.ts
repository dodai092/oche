import type { GameState } from "./engine";
export function scoreAnnouncement(game: GameState): string | null {
  const turn = game.turns.at(-1);
  if (!turn?.complete) return null;
  const name = game.players[turn.playerIndex].name;
  if (game.status === "complete") return `${name} wins the match.`;
  if (turn.checkout)
    return `${name} wins the leg. ${game.players[game.activePlayer].name} to throw.`;
  const result = turn.bust
    ? `Bust. ${name} stays on ${turn.startScore}.`
    : `${name} scores ${turn.startScore - turn.endScore}.`;
  return `${result} ${game.players[game.activePlayer].name} to throw.`;
}
