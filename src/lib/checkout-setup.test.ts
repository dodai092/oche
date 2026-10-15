import { describe, expect, it } from "vitest";
import { parseCheckoutSetup, type CheckoutSetupInput } from "./checkout-setup";

const base: CheckoutSetupInput = {
  startMode: "121",
  customStart: "",
  roundsMode: "10",
  customRounds: "",
};

describe("parseCheckoutSetup", () => {
  it("uses 121 and 10 rounds by default", () => {
    expect(parseCheckoutSetup(base)).toEqual({ ok: true, startTarget: 121, rounds: 10 });
  });
  it("accepts a custom start and custom or infinite rounds", () => {
    expect(
      parseCheckoutSetup({ ...base, startMode: "custom", customStart: " 40 ", roundsMode: "custom", customRounds: "25" }),
    ).toEqual({ ok: true, startTarget: 40, rounds: 25 });
    expect(parseCheckoutSetup({ ...base, roundsMode: "infinite" })).toEqual({
      ok: true,
      startTarget: 121,
      rounds: "infinite",
    });
  });
  it("rejects a start that cannot be checked out", () => {
    for (const customStart of ["", "abc", "1", "171", "159", "40.5", "-5", "1e2"]) {
      const r = parseCheckoutSetup({ ...base, startMode: "custom", customStart });
      expect(r.ok).toBe(false);
    }
  });
  it("rejects bad custom rounds", () => {
    for (const customRounds of ["", "0", "100", "2.5", "x"]) {
      const r = parseCheckoutSetup({ ...base, roundsMode: "custom", customRounds });
      expect(r).toEqual({ ok: false, error: "Rounds must be a whole number from 1 to 99." });
    }
  });
  it("ignores the custom fields while their mode is not selected", () => {
    expect(parseCheckoutSetup({ ...base, customStart: "junk", customRounds: "junk" }).ok).toBe(true);
  });
});
