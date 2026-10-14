import { expect, it } from "vitest";
import { createGame, submitVisit } from "./engine";
import { scoreAnnouncement } from "./announcements";
const start = () =>
  createGame({
    startScore: 301,
    doubleOut: true,
    legsToWin: 1,
    setsToWin: 1,
    players: [{ id: "a", name: "Alice" }],
  });
it("announces only finished visits and describes bust recovery", () => {
  expect(scoreAnnouncement(start())).toBe(null);
  const game = submitVisit(start(), 180);
  expect(scoreAnnouncement(game)).toBe("Alice scores 180. Alice to throw.");
  expect(scoreAnnouncement(submitVisit(game, 180))).toBe(
    "Bust. Alice stays on 121. Alice to throw.",
  );
  expect(
    scoreAnnouncement(submitVisit(game, 121, { checkoutConfirmed: true })),
  ).toBe("Alice wins the match.");
});
