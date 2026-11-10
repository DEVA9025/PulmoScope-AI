import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchPatients, type Patient } from "@/lib/patients-api";
import { setPredictionResult } from "@/lib/prediction-store";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Chest X-ray — PulmoScope" },
      { name: "description", content: "Upload a chest X-ray and request a research-model prediction." },
    ],
  }),
  component: Upload,
});

const steps = ["Upload image", "Resize to 224×224", "Run model inference", "Generate Grad-CAM"];

function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  useEffect(() => {
    // Load dynamic patient roster
    fetchPatients()
      .then((data) => {
        setPatientList(data);
        const stored = sessionStorage.getItem("pulmoscope_active_patient");
        if (stored) {
          try {
            const p = JSON.parse(stored);
            if (p?.id) setSelectedPatientId(p.id);
          } catch {}
        } else if (data.length > 0 && data[0]?.id) {
          setSelectedPatientId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || `Prediction request failed (${response.status})`);
      }

      const activePatient = patientList.find((p) => p.id === selectedPatientId);

      // Keep the image-heavy API response in memory instead of browser storage.
      setPredictionResult({
        ...payload,
        fileName: file.name,
        patientName: activePatient?.name,
        patientMRN: activePatient?.mrn,
        patientAge: activePatient?.age,
        patientGender: activePatient?.gender,
        patientSymptoms: activePatient?.symptoms,
        createdAt: new Date().toISOString(),
      });

      // Update patient lastStudy in database if assigned
      if (selectedPatientId) {
        fetch(`http://localhost:8000/patients/${selectedPatientId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ lastStudy: new Date().toISOString().split("T")[0] }),
        }).catch(() => {});
      }

      navigate({ to: "/prediction" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the prediction API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="p-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-7 rounded-xl bg-panel/40 backdrop-blur-md ring-1 ring-line/60 p-4 rise-in">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">Upload chest X-ray</span>
            <span className="font-mono text-[9px] text-dim">PNG · JPG · WEBP · max 10 MB</span>
          </div>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const picked = e.dataTransfer.files?.[0];
              if (picked) { setFile(picked); setError(""); }
            }}
            className="relative block rounded-lg border border-dashed border-line/80 bg-ink/40 min-h-[280px] grid place-items-center cursor-pointer hover:border-accent/50 transition-colors overflow-hidden"
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) { setFile(picked); setError(""); }
              }}
            />
            {preview ? (
              <img src={preview} alt="Selected chest X-ray preview" className="max-h-[360px] w-full object-contain" />
            ) : (
              <div className="text-center px-6 py-12">
                <div className="font-display font-semibold text-[15px] text-frost/85">Drop X-ray here or browse</div>
                <div className="font-mono text-[10px] text-dim mt-2">Select a PNG, JPG, or WEBP image</div>
              </div>
            )}
          </label>
          {file && <p className="mt-2 text-[11px] text-dim">Selected: {file.name}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">Assign to patient</span>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="mt-1.5 w-full bg-frost/[0.04] ring-1 ring-line/70 rounded-md px-3 py-2 text-[13px] text-frost focus:outline-none focus:ring-accent/50"
              >
                {patientList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-ink text-frost">
                    {p.name} · {p.mrn} ({p.age}y {p.gender})
                  </option>
                ))}
              </select>
            </label>
            <div className="text-[11px] text-dim flex items-end pb-2">The selected image is sent to your local FastAPI server.</div>
          </div>
          {error && <div role="alert" className="mt-4 rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
          <button
            disabled={!file || loading}
            onClick={analyze}
            className="mt-5 w-full px-3 py-3 rounded-md bg-accent text-ink font-semibold text-[12px] disabled:bg-line/60 disabled:text-dim hover:bg-accent/90 transition-colors"
          >
            {loading ? "Running model and generating Grad-CAM…" : "Analyze X-ray"}
          </button>
        </section>

        <section className="col-span-12 lg:col-span-5 rounded-xl bg-panel/40 backdrop-blur-md ring-1 ring-line/60 p-4 rise-in flex flex-col" style={{ animationDelay: "120ms" }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim mb-3">Analysis pipeline</div>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[12px]">
                <span className="size-1.5 rounded-full bg-accent" />
                <span className="text-frost/85">{s}</span>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.15em] text-dim">{i === 0 ? "ready" : "API"}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-lg bg-frost/[0.03] ring-1 ring-line/60 p-3 text-[11px] leading-relaxed text-dim">
            Research prototype only. Model scores are not calibrated probabilities and must not be used as a medical diagnosis.
          </div>
        </section>
      </div>
    </AppShell>
  );
}
