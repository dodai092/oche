import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

/** The darts in this visit, and the Submit that ends it. Same look as the 501 score entry. */
export function DartScoreField({
  slots,
  onSubmit,
}: {
  slots: { main: string; sub?: string }[];
  onSubmit: () => void;
}) {
  return (
    <div className="score-entry-row">
      <div className="score-field" role="group" aria-label="Darts this turn">
        {[0, 1, 2].map((i) => (
          <div key={i} className="score-field-slot">
            {slots[i] && (
              <>
                <strong>{slots[i].main}</strong>
                {slots[i].sub && <span>{slots[i].sub}</span>}
              </>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        disabled={!slots.length}
        onClick={onSubmit}
        aria-label="End turn"
      >
        Submit <ArrowRight size={17} />
      </Button>
    </div>
  );
}
