import { isCheckable, type CheckoutRounds } from "./checkout-engine";

export type CheckoutSetupInput = {
  startMode: "121" | "custom";
  customStart: string;
  roundsMode: "10" | "custom" | "infinite";
  customRounds: string;
};
export type CheckoutSetupResult =
  | { ok: true; startTarget: number; rounds: CheckoutRounds }
  | { ok: false; error: string };

const whole = (text: string) => (/^\d{1,3}$/.test(text.trim()) ? Number(text) : NaN);

/** Turns the setup fields into a start target and a round count, or one plain error. */
export function parseCheckoutSetup(input: CheckoutSetupInput): CheckoutSetupResult {
  let startTarget = 121;
  if (input.startMode === "custom") {
    startTarget = whole(input.customStart);
    if (!isCheckable(startTarget))
      return {
        ok: false,
        error:
          "Start target must be 2 to 170 and possible to check out with three darts. 159, 162, 163, 165, 166, 168 and 169 are not.",
      };
  }
  let rounds: CheckoutRounds = 10;
  if (input.roundsMode === "infinite") rounds = "infinite";
  else if (input.roundsMode === "custom") {
    const n = whole(input.customRounds);
    if (!Number.isInteger(n) || n < 1 || n > 99)
      return { ok: false, error: "Rounds must be a whole number from 1 to 99." };
    rounds = n;
  }
  return { ok: true, startTarget, rounds };
}
