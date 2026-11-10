import { DISEASE_CLASSES, type DiseaseClass } from "@/lib/mock-data";

export function ConfidenceMeters({
  scores,
  top,
}: {
  scores: Record<DiseaseClass, number>;
  top: DiseaseClass;
}) {
  return (
    <div className="mt-4 space-y-2.5">
      {DISEASE_CLASSES.map((cls, i) => {
        const value = scores[cls];
        const isTop = cls === top;
        return (
          <div key={cls} className="rise-in" style={{ animationDelay: `${120 + i * 60}ms` }}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className={isTop ? "text-frost font-medium" : "text-frost/80"}>{cls}</span>
              <span className={`font-mono ${isTop ? "text-accent" : "text-dim"}`}>{value.toFixed(2)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-line/50 overflow-hidden">
              <div
                className={`h-full rounded-full meter-bar ${isTop ? "bg-accent" : "bg-ice/60"}`}
                style={{
                  width: `${Math.max(value * 100, 1.5)}%`,
                  animationDelay: `${200 + i * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
