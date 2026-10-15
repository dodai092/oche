import { Choice } from "./atc-settings";
import type { CheckoutSetupInput } from "@/lib/checkout-setup";

export type CheckoutSettingsValue = CheckoutSetupInput & { darts: number };

export function CheckoutSettings({
  value,
  onChange,
}: {
  value: CheckoutSettingsValue;
  onChange: (value: CheckoutSettingsValue) => void;
}) {
  const set = (patch: Partial<CheckoutSettingsValue>) =>
    onChange({ ...value, ...patch });
  return (
    <>
      <Choice
        label="START TARGET"
        value={value.startMode}
        hint={
          value.startMode === "121"
            ? "Start at 121. Every target you clear raises it by 1."
            : "Pick your own start, 2 to 170, possible to check out with three darts."
        }
        onPick={(startMode) => set({ startMode })}
        options={[
          { value: "121", text: "121" },
          { value: "custom", text: "Custom" },
        ]}
      />
      {value.startMode === "custom" && (
        <div className="two-fields">
          <label className="field-label">
            CUSTOM START TARGET
            <input
              inputMode="numeric"
              maxLength={3}
              aria-label="Custom start target"
              value={value.customStart}
              onChange={(e) => set({ customStart: e.target.value })}
            />
          </label>
        </div>
      )}
      <Choice
        label="DARTS PER ATTEMPT"
        value={value.darts}
        hint="Darts to check out each target. A checkout in three darts or fewer sets your safehouse."
        onPick={(darts) => set({ darts })}
        options={[3, 6, 9, 12, 15].map((n) => ({ value: n, text: String(n) }))}
      />
      <Choice
        label="ROUNDS"
        value={value.roundsMode}
        hint={
          value.roundsMode === "infinite"
            ? "Play until you end the run."
            : "Each target you attempt is one round."
        }
        onPick={(roundsMode) => set({ roundsMode })}
        options={[
          { value: "10", text: "10" },
          { value: "custom", text: "Custom" },
          { value: "infinite", text: "Infinite" },
        ]}
      />
      {value.roundsMode === "custom" && (
        <div className="two-fields">
          <label className="field-label">
            CUSTOM ROUNDS
            <input
              inputMode="numeric"
              maxLength={2}
              aria-label="Custom rounds"
              value={value.customRounds}
              onChange={(e) => set({ customRounds: e.target.value })}
            />
          </label>
        </div>
      )}
      <p className="small muted atc-hint">
        Miss a target and you fall back to your safehouse, the last target you
        cleared in three darts or fewer.
      </p>
    </>
  );
}
