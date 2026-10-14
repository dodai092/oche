import { expect, it } from "vitest";
import { resolvePlayers } from "./setup";
it("creates distinct guest identities between matches", () => {
  const first = resolvePlayers(["Alice"], [], () => "a");
  const next = resolvePlayers(["Bob"], [], () => "b");
  expect(first[0].id).not.toBe(next[0].id);
});
it("uses saved profile identities", () => {
  expect(
    resolvePlayers([" alice "], [{ id: "a", name: "Alice" }], () => "guest"),
  ).toEqual([{ id: "a", name: "alice" }]);
});
it("rejects duplicate profile selections with an actionable error", () => {
  expect(() =>
    resolvePlayers(
      ["Alice", "ALICE"],
      [{ id: "a", name: "Alice" }],
      () => "guest",
    ),
  ).toThrow("Choose a different player");
});
