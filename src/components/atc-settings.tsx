import type { AtcField, AtcFinish, AtcOrderMode } from "@/lib/atc-engine";

export type AtcSettingsValue = {
  finish: AtcFinish;
  field: AtcField;
  hitsPerTarget: number;
  increase: boolean;
  orderMode: AtcOrderMode;
};

export function Choice<T extends string | number>({
  label,
  options,
  value,
  hint,
  onPick,
}: {
  label: string;
  options: { value: T; text: string }[];
  value: T;
  hint: string;
  onPick: (value: T) => void;
}) {
  return (
    <>
      <label className="field-label">{label}</label>
      <div className="segmented atc-options" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            className={o.value === value ? "selected" : ""}
            aria-pressed={o.value === value}
            onClick={() => onPick(o.value)}
          >
            {o.text}
          </button>
        ))}
      </div>
      <p className="small muted atc-hint">{hint}</p>
    </>
  );
}

const FINISH_HINT = {
  "single-bull": "Finish by hitting the outer or inner bull.",
  bullseye: "Finish by hitting the inner bull.",
  all: "Finish by hitting the outer bull, then the inner bull.",
};
const FIELD_HINT = {
  any: "Any part of the number counts.",
  single: "Only single hits count.",
  double: "Only double hits count.",
  treble: "Only treble hits count.",
};
const ORDER_HINT = {
  "low-high": "Play from 1 to 20.",
  "high-low": "Play from 20 to 1.",
  random: "A random order, fixed for the whole match.",
};

export function AtcSettings({
  value,
  onChange,
  legs,
  onLegs,
}: {
  value: AtcSettingsValue;
  onChange: (value: AtcSettingsValue) => void;
  legs: number;
  onLegs: (legs: number) => void;
}) {
  const set = (patch: Partial<AtcSettingsValue>) =>
    onChange({ ...value, ...patch });
  return (
    <>
      <Choice
        label="FINISH"
        value={value.finish}
        hint={FINISH_HINT[value.finish]}
        onPick={(finish) => set({ finish })}
        options={[
          { value: "single-bull", text: "Single bull" },
          { value: "bullseye", text: "Bullseye" },
          { value: "all", text: "All" },
        ]}
      />
      <Choice
        label="TARGET FIELD"
        value={value.field}
        hint={FIELD_HINT[value.field]}
        onPick={(field) => set({ field })}
        options={[
          { value: "any", text: "Any" },
          { value: "single", text: "Single" },
          { value: "double", text: "Double" },
          { value: "treble", text: "Treble" },
        ]}
      />
      <Choice
        label="HITS PER NUMBER"
        value={value.hitsPerTarget}
        hint="How many times to hit each number."
        onPick={(hitsPerTarget) => set({ hitsPerTarget })}
        options={[
          { value: 1, text: "One" },
          { value: 2, text: "Two" },
          { value: 3, text: "Three" },
        ]}
      />
      <Choice
        label="ORDER"
        value={value.orderMode}
        hint={ORDER_HINT[value.orderMode]}
        onPick={(orderMode) => set({ orderMode })}
        options={[
          { value: "low-high", text: "Low to high" },
          { value: "high-low", text: "High to low" },
          { value: "random", text: "Random" },
        ]}
      />
      <label className="setting-toggle">
        <span>
          <strong>Increase by segment</strong>
          <small>A double moves you on two numbers, a treble three.</small>
        </span>
        <input
          type="checkbox"
          checked={value.increase}
          onChange={(e) => set({ increase: e.target.checked })}
        />
      </label>
      <div className="two-fields">
        <label className="field-label">
          LEGS TO WIN
          <select value={legs} onChange={(e) => onLegs(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                First to {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
