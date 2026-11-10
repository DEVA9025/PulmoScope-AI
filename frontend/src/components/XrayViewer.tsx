import { useState } from "react";
import xray from "@/assets/xray.jpg";

export function XrayViewer({ scanning = false }: { scanning?: boolean }) {
  const [opacity, setOpacity] = useState(60);

  return (
    <>
      <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-black/60 ring-1 ring-line/50">
        <img
          src={xray}
          alt="Chest radiograph, posteroanterior view"
          width={1024}
          height={768}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 cam-overlay" style={{ opacity: opacity / 100 }} />
        {scanning && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="scan-sweep" />
          </div>
        )}
        <div className="absolute top-2 left-2 font-mono text-[9px] text-frost/70 bg-black/40 rounded px-1.5 py-0.5">
          GAUC 0.982
        </div>
        <div className="absolute bottom-2 left-2 font-mono text-[9px] text-frost/70 bg-black/40 rounded px-1.5 py-0.5">
          EfficientNet-B0 · softmax
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="font-mono text-[10px] text-dim">Grad-CAM opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          aria-label="Grad-CAM opacity"
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="flex-1 max-w-[180px] h-1 appearance-none rounded-full bg-line/70 accent-accent"
        />
        <span className="font-mono text-[10px] text-accent">{opacity}%</span>
        <button
          onClick={() => setOpacity(60)}
          className="ml-auto font-mono text-[10px] text-frost/70 ring-1 ring-line/70 rounded-md px-2.5 py-1 hover:bg-frost/5 transition-colors"
        >
          Reset view
        </button>
      </div>
    </>
  );
}
