import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getPredictionResult } from "@/lib/prediction-store";

type ApiResult = {
  predicted_class: string;
  scores: Record<string, number>;
  images: { original: string; heatmap: string; overlay: string };
  notice?: string;
  fileName?: string;
  createdAt?: string;
};

const labels: Record<string, string> = {
  NORMAL: "Normal",
  PNEUMONIA: "Pneumonia",
  TUBERCULOSIS: "Tuberculosis",
  COVID19: "COVID-19",
};

export const Route = createFileRoute("/prediction")({
  head: () => ({
    meta: [
      { title: "Prediction & Grad-CAM — PulmoScope" },
      { name: "description", content: "View model output and Grad-CAM visualizations for an uploaded chest X-ray." },
    ],
  }),
  component: Prediction,
});

function Prediction() {
  const [note, setNote] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(85);
  const [result, setResult] = useState<ApiResult | null>(() => getPredictionResult());

  useEffect(() => {
    // The prediction is kept in shared in-memory state while navigating.
    setResult(getPredictionResult());
  }, []);

  if (!result) {
    return (
      <AppShell>
        <div className="p-6">
          <section className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-6">
            <h1 className="font-display font-semibold text-xl">No prediction yet</h1>
            <p className="mt-2 text-sm text-dim">Upload an X-ray and run the API analysis first.</p>
            <a href="/upload" className="inline-block mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink">Go to upload</a>
          </section>
        </div>
      </AppShell>
    );
  }

  const scoreEntries = Object.entries(result.scores ?? {});
  const predictionLabel = labels[result.predicted_class] ?? result.predicted_class;

  return (
    <AppShell>
      <div className="p-6 space-y-4">
        <div className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-4 rise-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">Prediction result</div>
              <h1 className="font-display font-bold text-2xl mt-1">{predictionLabel}</h1>
              <p className="text-xs text-dim mt-1">{result.fileName ?? "Uploaded X-ray"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/reports"
                className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-ink hover:bg-accent/90 transition shadow-sm"
              >
                View Diagnostic Report →
              </Link>
              <Link
                to="/upload"
                className="rounded-md bg-frost/[0.04] ring-1 ring-line/70 px-3 py-2 text-xs hover:bg-frost/10 transition"
              >
                Analyze another image
              </Link>
            </div>
          </div>
          <p className="mt-3 rounded-md bg-amber-400/10 ring-1 ring-amber-300/20 p-3 text-xs leading-relaxed text-amber-100">
            {result.notice ?? "Research prototype only. Model scores are not calibrated probabilities and are not a medical diagnosis."}
          </p>
        </div>

        {/* Interactive Visualization Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-panel/30 ring-1 ring-line/50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-dim uppercase tracking-wider">Live Overlay Opacity:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(Number(e.target.value))}
              className="w-32 sm:w-44 accent-accent cursor-pointer h-1.5 bg-line/80 rounded-lg"
            />
            <span className="font-mono text-xs text-accent font-semibold w-8">{overlayOpacity}%</span>
          </div>
          <div className="text-[11px] text-dim">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Clear focal activation — Non-salient regions kept 100% transparent
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Original */}
          <section className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-3 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">1. Original X-ray</h2>
              <span className="text-[10px] text-dim">Unprocessed</span>
            </div>
            {result.images?.original ? (
              <img
                src={`data:image/png;base64,${result.images.original}`}
                alt="Original X-ray"
                className="mt-3 w-full aspect-square object-contain rounded-lg bg-black/60 shadow-inner"
              />
            ) : (
              <div className="mt-3 aspect-square grid place-items-center rounded-lg bg-black/30 text-xs text-dim">Image unavailable</div>
            )}
            <p className="mt-2 text-[11px] text-dim">Pristine anatomical view without filter</p>
          </section>

          {/* Card 2: Heatmap */}
          <section className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-3 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">2. Grad-CAM Activation</h2>
              <span className="text-[10px] text-accent">Attention Map</span>
            </div>
            {result.images?.heatmap ? (
              <img
                src={`data:image/png;base64,${result.images.heatmap}`}
                alt="Grad-CAM heatmap"
                className="mt-3 w-full aspect-square object-contain rounded-lg bg-black/60 shadow-inner"
              />
            ) : (
              <div className="mt-3 aspect-square grid place-items-center rounded-lg bg-black/30 text-xs text-dim">Image unavailable</div>
            )}
            <p className="mt-2 text-[11px] text-dim">Model feature map intensity</p>
          </section>

          {/* Card 3: Interactive Clear Overlay */}
          <section className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-3 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">3. Clear Overlay</h2>
              <span className="text-[10px] text-amber-300 font-mono">Focal Zones</span>
            </div>
            {result.images?.original && result.images?.overlay ? (
              <div className="relative mt-3 w-full aspect-square rounded-lg overflow-hidden bg-black/60 shadow-inner">
                {/* Base Image */}
                <img
                  src={`data:image/png;base64,${result.images.original}`}
                  alt="Base X-ray"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {/* Blended High-Clarity Overlay controlled by live opacity */}
                <img
                  src={`data:image/png;base64,${result.images.overlay}`}
                  alt="Clear Grad-CAM overlay"
                  style={{ opacity: overlayOpacity / 100 }}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-150"
                />
              </div>
            ) : (
              <div className="mt-3 aspect-square grid place-items-center rounded-lg bg-black/30 text-xs text-dim">Image unavailable</div>
            )}
            <p className="mt-2 text-[11px] text-dim">Adjust slider above to dial opacity from 0% to 100%</p>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim mb-4">Model output scores</h2>
            <div className="space-y-3">
              {scoreEntries.map(([key, value]) => {
                const numeric = Number(value);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-frost/85">{labels[key] ?? key}</span>
                      <span className="font-mono text-accent">{(numeric * 100).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-line/50 overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.max(0, Math.min(100, numeric * 100))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-dim">These are model output scores, not calibrated disease probabilities. Grad-CAM is an explanatory visualization and does not establish a diagnosis.</p>
          </section>

          <section className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">Research note</span>
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add your study note…"
                className="mt-2 w-full bg-frost/[0.04] ring-1 ring-line/70 rounded-md px-3 py-2 text-[12.5px] placeholder:text-dim focus:outline-none focus:ring-accent/50 resize-y"
              />
            </label>
            <button onClick={() => { try { sessionStorage.setItem("lungsightResearchNote", note); } catch {} }} className="mt-3 px-3 py-2 rounded-md bg-frost/[0.04] ring-1 ring-line/70 text-xs hover:bg-frost/10">
              Save note in this browser session
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
