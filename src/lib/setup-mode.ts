export type SetupMode = "x01" | "cricket" | "atc" | "checkout";

// A game picked on the overview, read once by the setup screen on mount.
// Module state, not storage: it only has to survive a client-side navigation.
let requested: SetupMode | null = null;

export function requestSetupMode(mode: SetupMode) {
  requested = mode;
}

export function takeSetupMode(): SetupMode | null {
  const mode = requested;
  requested = null;
  return mode;
}
