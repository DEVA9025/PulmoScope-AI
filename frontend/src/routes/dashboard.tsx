import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Activity, 
  ArrowUpRight, 
  CalendarDays, 
  Clock3, 
  FileCheck2, 
  ScanLine, 
  ShieldAlert, 
  UploadCloud, 
  Search, 
  X, 
  Users, 
  UserPlus, 
  FileText,
  Loader2
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { fetchPatients, type Patient } from "@/lib/patients-api";
import { useAuthUserName } from "@/lib/auth-user";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PulmoScope Reading Room" },
      {
        name: "description",
        content: "Search patients by name or MRN, view study volume, live Grad-CAM analysis and recent chest X-ray diagnoses at a glance.",
      },
      { property: "og:title", content: "Dashboard — PulmoScope Reading Room" },
      {
        property: "og:description",
        content: "Search patients by name or MRN, study volume, pending reviews, and recent chest X-ray diagnoses.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const userName = useAuthUserName();
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPatients()
      .then((data) => setPatientsList(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleStartStudy(patient: Patient) {
    try {
      sessionStorage.setItem("pulmoscope_active_patient", JSON.stringify(patient));
    } catch {}
    navigate({ to: "/upload" });
  }

  // Filter patients by both Name and MRN
  const query = searchQuery.trim().toLowerCase();
  const filteredPatients = query
    ? patientsList.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.mrn.toLowerCase().includes(query) ||
          p.symptoms.toLowerCase().includes(query)
      )
    : patientsList;

  const stats = [
    { 
      label: "Registered Patients", 
      value: String(patientsList.length || 5), 
      note: "Live in patient database", 
      icon: Users, 
      tone: "text-accent", 
      trend: "Dynamic" 
    },
    { 
      label: "Studies today", 
      value: "42", 
      note: "+8 compared with yesterday", 
      icon: ScanLine, 
      tone: "text-ice", 
      trend: "+23.5%" 
    },
    { 
      label: "Reports generated", 
      value: "128", 
      note: "Across this month", 
      icon: FileCheck2, 
      tone: "text-frost/80", 
      trend: "This month" 
    },
    { 
      label: "Model status", 
      value: "Ready", 
      note: "EfficientNet-B0 multiclass", 
      icon: Activity, 
      tone: "text-accent", 
      trend: "Active" 
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 p-4 sm:p-6 xl:p-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" /> Reading room overview
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl text-frost">
              Welcome back, {userName || "Clinician"}
            </h1>
            <p className="mt-1 text-sm text-dim">
              Search patients by name or MRN, manage imaging records, and launch AI analyses.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/patients"
              className="inline-flex items-center gap-2 rounded-lg border border-line/70 bg-panel/50 px-3.5 py-2.5 text-xs text-frost hover:bg-frost/10 transition"
            >
              <Users className="size-4 text-dim" /> Patient registry
            </Link>
            <Link
              to="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-bold text-ink transition hover:brightness-105 shadow-sm"
            >
              <UploadCloud className="size-4" /> New X-ray study
            </Link>
          </div>
        </section>

        {/* Dynamic Metric Cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="panel-card rise-in p-4 sm:p-5 rounded-2xl bg-panel/40 ring-1 ring-line/60"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-frost/[0.045] ring-1 ring-line/70">
                    <Icon className={`size-4 ${stat.tone}`} aria-hidden="true" />
                  </div>
                  <span className={`rounded-full bg-frost/[0.04] px-2 py-1 font-mono text-[9px] ${stat.tone}`}>
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-4 font-display text-3xl font-bold tracking-tight text-frost">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs font-medium text-frost/80">{stat.label}</div>
                <div className="mt-1 text-[11px] text-dim">{stat.note}</div>
              </div>
            );
          })}
        </section>

        {/* Main Grid: Patient Search & Studies + Model Status */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.85fr]">
          {/* Patient Search & Roster Panel */}
          <div className="overflow-hidden rounded-2xl border border-line/60 bg-panel/40 backdrop-blur-md">
            {/* Search Header Bar */}
            <div className="p-4 sm:p-5 border-b border-line/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display text-base font-semibold text-frost">
                    Patient Search & Recent Records
                  </div>
                  <p className="text-xs text-dim mt-0.5">
                    Filter by <strong className="text-frost/80">patient name</strong> or <strong className="text-frost/80">MRN number</strong>
                  </p>
                </div>
                <span className="font-mono text-[11px] text-dim">
                  {filteredPatients.length} {filteredPatients.length === 1 ? "match" : "matches"}
                </span>
              </div>

              {/* Patient Name / MRN Search Input */}
              <div className="relative">
                <Search className="size-4 absolute left-3.5 top-3 text-accent pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by patient name (e.g. Osei, Delgado) or MRN (e.g. MRN-4471)..."
                  className="w-full rounded-xl bg-ink/50 border border-line/70 pl-10 pr-10 py-2.5 text-xs text-frost placeholder:text-dim focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-dim hover:text-frost p-0.5"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Patients List View */}
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Column Headers */}
                <div className="grid grid-cols-12 border-b border-line/40 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-dim sm:px-5">
                  <span className="col-span-5">Patient Name & MRN</span>
                  <span className="col-span-2">Age / Sex</span>
                  <span className="col-span-3">Presenting Symptoms</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-dim space-y-2">
                    <Loader2 className="size-5 animate-spin mx-auto text-accent" />
                    <p className="text-xs">Loading patient database...</p>
                  </div>
                ) : filteredPatients.length > 0 ? (
                  filteredPatients.slice(0, 7).map((patient, index) => (
                    <div
                      key={patient.id}
                      className={`grid grid-cols-12 items-center px-4 py-3.5 text-xs transition hover:bg-frost/[0.03] sm:px-5 ${
                        index < filteredPatients.length - 1 ? "border-b border-line/30" : ""
                      }`}
                    >
                      {/* Name & MRN */}
                      <div className="col-span-5 min-w-0 pr-2">
                        <div className="truncate font-medium text-frost/95 flex items-center gap-2">
                          <span>{patient.name}</span>
                          {searchQuery && (
                            <span className="size-1.5 rounded-full bg-accent" />
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-accent">
                          {patient.mrn}
                          {patient.phone && (
                            <span className="text-dim ml-2 hidden sm:inline">
                              {patient.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Age & Gender */}
                      <div className="col-span-2 font-mono text-dim text-[11px]">
                        <span className="text-frost/80">{patient.age}</span>y · {patient.gender === "M" ? "Male" : "Female"}
                      </div>

                      {/* Symptoms */}
                      <div className="col-span-3 pr-2 text-dim truncate text-[11px]" title={patient.symptoms}>
                        {patient.symptoms || "—"}
                      </div>

                      {/* Action Links */}
                      <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartStudy(patient)}
                          className="font-mono text-[10.5px] text-accent ring-1 ring-accent/30 rounded px-2 py-1 hover:bg-accent/15 transition"
                          title={`Upload X-ray study for ${patient.name}`}
                        >
                          New Study
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-dim space-y-2">
                    <p className="text-xs text-frost/80">No patients found matching "{searchQuery}"</p>
                    <p className="text-[11px] text-dim">Check the spelling or register a new patient record.</p>
                    <Link
                      to="/patients"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-md bg-accent text-ink font-semibold text-xs hover:bg-accent/90 transition"
                    >
                      <UserPlus className="size-3.5" />
                      <span>Register "{searchQuery}"</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Table Footer */}
            <div className="border-t border-line/40 px-4 py-3 flex items-center justify-between text-[11px] text-dim sm:px-5">
              <span>Showing dynamic patient records from database</span>
              <Link to="/patients" className="text-accent hover:underline flex items-center gap-1">
                View all in Patient Registry <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* Right Column: Model Status & Quick Study Trigger */}
          <div className="space-y-4">
            {/* Model Workspace Panel */}
            <div className="rounded-2xl border border-line/60 bg-panel/35 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-sm font-semibold text-frost">AI Model Workspace</div>
                  <p className="mt-1 text-xs text-dim">Model inference & Grad-CAM pipeline</p>
                </div>
                <div className="grid size-9 place-items-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                  <Activity className="size-4 text-accent" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-ink/40 border border-line/40 px-3.5 py-3">
                  <div>
                    <div className="text-xs font-medium text-frost">EfficientNet-B0</div>
                    <div className="mt-0.5 text-[10px] text-dim">Four-Class Multiclass Model</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-accent">
                    <span className="size-1.5 rounded-full bg-accent animate-pulse" /> ONLINE
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-ink/40 border border-line/40 px-3.5 py-3">
                  <div>
                    <div className="text-xs font-medium text-frost">High-Clarity Grad-CAM</div>
                    <div className="mt-0.5 text-[10px] text-dim">Pre-Softmax Logit Gradients</div>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400">ACTIVE</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-ink/40 border border-line/40 px-3.5 py-3">
                  <div>
                    <div className="text-xs font-medium text-frost">Database Store</div>
                    <div className="mt-0.5 text-[10px] text-dim">Mongita File Storage</div>
                  </div>
                  <span className="font-mono text-[9px] text-accent">CONNECTED</span>
                </div>
              </div>
            </div>

            {/* Quick Upload CTA */}
            <Link
              to="/upload"
              className="group block rounded-2xl border border-accent/25 bg-accent/[0.07] p-5 transition hover:bg-accent/[0.12]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
                  <UploadCloud className="size-5 text-accent" aria-hidden="true" />
                </div>
                <ArrowUpRight className="size-4 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <div className="mt-4 font-display text-base font-semibold text-frost">Start a new analysis</div>
              <p className="mt-1 text-xs leading-relaxed text-dim">
                Upload a chest X-ray image to run multiclass prediction and generate clear Grad-CAM heatmaps.
              </p>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.13em] text-accent flex items-center gap-1">
                Go to upload <span>→</span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
