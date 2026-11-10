import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { 
  fetchPatients, 
  createPatient, 
  deletePatient, 
  type Patient 
} from "@/lib/patients-api";
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Phone,
  FileText
} from "lucide-react";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Patient Records — PulmoScope AI" },
      {
        name: "description",
        content: "Dynamic patient registry and chest imaging roster with database persistence.",
      },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "F" as "M" | "F",
    phone: "",
    symptoms: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const data = await fetchPatients();
      setList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");
      const newPatient = await createPatient({
        name: form.name.trim(),
        age: Number(form.age) || 0,
        gender: form.gender,
        phone: form.phone.trim(),
        symptoms: form.symptoms.trim(),
      });

      setList((prev) => [newPatient, ...prev]);
      setForm({ name: "", age: "", gender: "F", phone: "", symptoms: "" });
      setSuccessMsg(`Patient registered: ${newPatient.name} (${newPatient.mrn})`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register patient.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(patient: Patient) {
    if (!window.confirm(`Are you sure you want to remove patient ${patient.name} (${patient.mrn}) from the database?`)) {
      return;
    }

    try {
      setDeletingId(patient.id);
      await deletePatient(patient.id);
      setList((prev) => prev.filter((p) => p.id !== patient.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete patient.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleStartStudy(patient: Patient) {
    try {
      sessionStorage.setItem("pulmoscope_active_patient", JSON.stringify(patient));
    } catch {}
    navigate({ to: "/upload" });
  }

  const filtered = list.filter((p) =>
    `${p.name} ${p.mrn} ${p.symptoms} ${p.phone}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="rounded-xl bg-panel/40 ring-1 ring-line/60 p-4 rise-in flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-accent/15 ring-1 ring-accent/30 grid place-items-center text-accent">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-frost">Live Patient Registry</h1>
              <p className="text-xs text-dim">Database-backed patient roster with clinical history and active study tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-frost/[0.04] ring-1 ring-line/70 text-xs text-frost hover:bg-frost/10 transition disabled:opacity-50"
              title="Refresh patients from database"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <div className="font-mono text-xs px-2.5 py-1 rounded bg-panel/60 ring-1 ring-line/50 text-accent">
              {list.length} {list.length === 1 ? "Patient" : "Patients"}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 ring-1 ring-red-400/30 p-3.5 text-xs text-red-200">
            <AlertCircle className="size-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/30 p-3.5 text-xs text-emerald-200">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Grid: Registration Form + Patient Roster */}
        <div className="grid grid-cols-12 gap-4">
          {/* Register Patient Form */}
          <section className="col-span-12 lg:col-span-4 rounded-xl bg-panel/40 backdrop-blur-md ring-1 ring-line/60 p-4 rise-in h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-line/40 pb-3">
              <UserPlus className="size-4 text-accent" />
              <h2 className="font-mono text-[11px] uppercase tracking-wider font-bold text-frost">
                Register New Patient
              </h2>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <Field
                label="Full Patient Name"
                placeholder="e.g. Maria Santos"
                required
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Age"
                  type="number"
                  placeholder="e.g. 52"
                  required
                  value={form.age}
                  onChange={(v) => setForm({ ...form, age: v })}
                />
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">Gender</span>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as "M" | "F" })}
                    className="mt-1.5 w-full bg-frost/[0.04] ring-1 ring-line/70 rounded-md px-3 py-2 text-[13px] text-frost focus:outline-none focus:ring-accent/50"
                  >
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </label>
              </div>

              <Field
                label="Contact Phone"
                placeholder="+1 555 0192"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">Presenting Symptoms</span>
                <textarea
                  rows={3}
                  placeholder="Productive cough, fever, dyspnea for 3 days..."
                  value={form.symptoms}
                  onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                  className="mt-1.5 w-full bg-frost/[0.04] ring-1 ring-line/70 rounded-md px-3 py-2 text-[13px] text-frost placeholder:text-dim/60 focus:outline-none focus:ring-accent/50 resize-y"
                />
              </label>

              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-accent text-ink font-semibold text-xs hover:bg-accent/90 transition shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving to database...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    <span>Save Patient Record</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Dynamic Patient Roster Table */}
          <section className="col-span-12 lg:col-span-8 rounded-xl bg-panel/40 ring-1 ring-line/60 p-4 rise-in flex flex-col min-w-0">
            {/* Search filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line/50">
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-[15px] text-frost">Patient Roster</span>
                <span className="text-xs text-dim">({filtered.length} matching)</span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="size-3.5 absolute left-3 top-2.5 text-dim" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by name, MRN, symptom..."
                  className="w-full bg-frost/[0.04] ring-1 ring-line/70 rounded-md pl-8 pr-3 py-1.5 text-xs text-frost placeholder:text-dim focus:outline-none focus:ring-accent/50"
                />
              </div>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 px-3 py-2.5 font-mono text-[9px] uppercase tracking-widest text-dim border-b border-line/40">
              <span className="col-span-4">Patient & MRN</span>
              <span className="col-span-2">Age / Sex</span>
              <span className="col-span-3">Presenting Symptoms</span>
              <span className="col-span-3 text-right">Actions</span>
            </div>

            {/* Loading Indicator */}
            {loading && list.length === 0 && (
              <div className="py-16 text-center text-dim space-y-2">
                <Loader2 className="size-6 animate-spin mx-auto text-accent" />
                <p className="text-xs">Fetching dynamic patient records from database...</p>
              </div>
            )}

            {/* List entries */}
            <div className="divide-y divide-line/30">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 px-3 py-3 items-center text-xs hover:bg-frost/[0.02] transition"
                >
                  {/* Name and MRN */}
                  <div className="col-span-7 md:col-span-4 min-w-0 pr-2">
                    <div className="font-medium text-frost truncate">{p.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-accent/90">{p.mrn}</span>
                      {p.phone && (
                        <span className="text-[10px] text-dim hidden sm:inline flex items-center gap-0.5">
                          • {p.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="col-span-5 md:col-span-2 font-mono text-dim text-[11px]">
                    <span className="text-frost/90">{p.age}</span> yrs · {p.gender === "M" ? "Male" : "Female"}
                  </div>

                  {/* Symptoms */}
                  <div className="col-span-12 md:col-span-3 hidden md:block text-frost/70 truncate text-[11.5px] pr-2" title={p.symptoms}>
                    {p.symptoms || "—"}
                  </div>

                  {/* Action buttons */}
                  <div className="col-span-12 md:col-span-3 mt-2 md:mt-0 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleStartStudy(p)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-accent/15 ring-1 ring-accent/30 text-accent hover:bg-accent/25 transition text-[11px] font-medium"
                      title={`Initiate X-ray analysis for ${p.name}`}
                    >
                      <span>New Study</span>
                      <ArrowUpRight className="size-3" />
                    </button>

                    <button
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      className="p-1.5 rounded text-dim hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                      title={`Delete ${p.name}`}
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="py-12 text-center text-dim space-y-1">
                <FileText className="size-8 mx-auto text-dim/50 stroke-1" />
                <p className="text-xs text-frost/80">No patients found</p>
                <p className="text-[11px] text-dim">Try a different search term or register a patient on the left.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-frost/[0.04] ring-1 ring-line/70 rounded-md px-3 py-2 text-[13px] text-frost placeholder:text-dim/60 focus:outline-none focus:ring-accent/50"
      />
    </label>
  );
}
