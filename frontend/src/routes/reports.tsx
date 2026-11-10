import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { getPredictionResult, type PredictionResult } from "@/lib/prediction-store";
import { doctor, patients, diagnoses } from "@/lib/mock-data";
import { useAuthUserName } from "@/lib/auth-user";
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  User, 
  Calendar, 
  FileCheck,
  RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Diagnostic Reports — PulmoScope AI" },
      {
        name: "description",
        content: "Clinical radiology diagnostic reports with AI multiclass predictions, Grad-CAM interpretability, and physician sign-off.",
      },
    ],
  }),
  component: ReportsPage,
});

const CLASS_DISPLAY_NAMES: Record<string, string> = {
  NORMAL: "Normal (No Active Infiltrate)",
  PNEUMONIA: "Bacterial / Viral Pneumonia",
  TUBERCULOSIS: "Pulmonary Tuberculosis",
  COVID19: "COVID-19 Associated Pneumonia",
};

const CLINICAL_RECOMMENDATIONS: Record<string, string[]> = {
  COVID19: [
    "Correlate with urgent RT-PCR SARS-CoV-2 assay.",
    "Recommend isolation precautions and supplemental SpO2 monitoring.",
    "Consider High-Resolution CT (HRCT) of chest if respiratory distress progresses.",
    "Evaluate inflammatory markers (CRP, Ferritin, D-Dimer)."
  ],
  PNEUMONIA: [
    "Recommend targeted antibiotic therapy guided by local microbiological patterns.",
    "Obtain CBC, blood cultures, and sputum Gram stain/culture.",
    "Follow-up chest radiograph in 4 to 6 weeks to confirm resolution of consolidation.",
    "Assess CURB-65 / pneumonia severity score for inpatient vs outpatient triage."
  ],
  TUBERCULOSIS: [
    "Recommend immediate sputum AFB smear (3 consecutive samples) and GeneXpert MTB/RIF.",
    "Initiate respiratory isolation in negative-pressure room pending workup.",
    "Notify infectious disease/public health surveillance if confirmed.",
    "Perform baseline hepatic and renal function panels prior to anti-tubercular therapy."
  ],
  NORMAL: [
    "No focal consolidation, pneumothorax, or acute pleural effusion observed.",
    "If symptoms persist, consider evaluation for upper airway etiology or cardiac origins.",
    "Routine clinical follow-up as indicated by primary care provider."
  ],
};

function ReportsPage() {
  const currentResult = getPredictionResult();
  const userName = useAuthUserName();
  const doctorName = userName && userName !== "User" ? userName : doctor.name;

  // Selected report source: "active" (latest AI prediction) or patient ID from mock records
  const [selectedSource, setSelectedSource] = useState<string>(
    currentResult ? "active" : diagnoses[0]?.id || "active"
  );

  const [copied, setCopied] = useState(false);
  const [reportNote, setReportNote] = useState<string>("");
  const [reportId] = useState<string>(() => `RPT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [reportDate] = useState<string>(() => new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }));

  // Resolve active patient details
  const isLiveAnalysis = selectedSource === "active" && currentResult;
  const mockDiagnosis = diagnoses.find((d) => d.id === selectedSource);
  const mockPatient = mockDiagnosis ? patients.find((p) => p.mrn === mockDiagnosis.mrn) : null;

  const activePatientName = isLiveAnalysis
    ? currentResult.patientName || ("Patient Study #" + (currentResult.fileName?.replace(/\.[^/.]+$/, "") || "X-8820"))
    : mockPatient?.name || "K. Osei";

  const activeMRN = isLiveAnalysis ? currentResult.patientMRN || "MRN-ACTIVE" : mockPatient?.mrn || "MRN-4471";
  const activeAge = isLiveAnalysis ? (currentResult.patientAge !== undefined ? String(currentResult.patientAge) : "48") : String(mockPatient?.age || "54");
  const activeGender = isLiveAnalysis ? (currentResult.patientGender === "M" ? "Male" : currentResult.patientGender === "F" ? "Female" : "Adult") : mockPatient?.gender === "M" ? "Male" : "Female";
  const activeSymptoms = isLiveAnalysis
    ? currentResult.patientSymptoms || "Cough, shortness of breath, fever for 4 days"
    : mockPatient?.symptoms || "Productive cough, fever 39.1°C, dyspnoea";

  const predictedClass = isLiveAnalysis
    ? currentResult.predicted_class
    : mockDiagnosis?.disease?.toUpperCase() === "COVID"
    ? "COVID19"
    : mockDiagnosis?.disease?.toUpperCase() || "PNEUMONIA";

  const primaryConfidence = isLiveAnalysis
    ? (currentResult.scores?.[predictedClass] ?? 0.95)
    : mockDiagnosis?.confidence || 0.94;

  const scoreMap = isLiveAnalysis && currentResult.scores
    ? currentResult.scores
    : {
        NORMAL: predictedClass === "NORMAL" ? 0.92 : 0.02,
        PNEUMONIA: predictedClass === "PNEUMONIA" ? 0.94 : 0.03,
        TUBERCULOSIS: predictedClass === "TUBERCULOSIS" ? 0.89 : 0.04,
        COVID19: predictedClass === "COVID19" ? 0.96 : 0.01,
      };

  const originalImg = isLiveAnalysis ? currentResult.images?.original : null;
  const overlayImg = isLiveAnalysis ? currentResult.images?.overlay : null;

  // Initialize report clinical notes based on class
  useEffect(() => {
    const defaultImpression = `AI evaluation of the PA chest radiograph indicates findings highly consistent with ${CLASS_DISPLAY_NAMES[predictedClass] || predictedClass} (Calculated confidence: ${(primaryConfidence * 100).toFixed(1)}%). Grad-CAM localization reveals salient focal changes in lung parenchyma requiring clinical correlation.`;
    setReportNote(defaultImpression);
  }, [predictedClass, primaryConfidence]);

  function handlePrint() {
    window.print();
  }

  function handleCopySummary() {
    const summary = `PULMOSCOPE DIAGNOSTIC REPORT
Report ID: ${reportId}
Patient: ${activePatientName} (${activeMRN})
Study Date: ${reportDate}
Reading Radiologist: ${doctorName}

PRIMARY FINDINGS:
Condition: ${CLASS_DISPLAY_NAMES[predictedClass] || predictedClass}
Confidence: ${(primaryConfidence * 100).toFixed(2)}%

CLINICAL IMPRESSION:
${reportNote}

RECOMMENDED NEXT STEPS:
${(CLINICAL_RECOMMENDATIONS[predictedClass] || []).map((r, i) => `${i + 1}. ${r}`).join("\n")}
`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AppShell>
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
        {/* Top Control Bar (Hidden during print) */}
        <div className="print:hidden rounded-xl bg-panel/40 ring-1 ring-line/60 p-4 rise-in flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-accent/15 ring-1 ring-accent/30 grid place-items-center text-accent">
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-frost">Diagnostic Report Generator</h1>
              <p className="text-xs text-dim">Generate, verify, and export comprehensive clinical chest imaging reports</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Report Case Selector */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-frost/[0.04] ring-1 ring-line/70 rounded-md px-3 py-1.5 text-xs text-frost focus:outline-none focus:ring-accent/50"
            >
              {currentResult && <option value="active">⚡ Latest Uploaded X-Ray (Live AI)</option>}
              {diagnoses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.patient} — {d.disease} ({d.date})
                </option>
              ))}
            </select>

            {/* Copy Button */}
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-frost/[0.04] ring-1 ring-line/70 text-xs text-frost/90 hover:bg-frost/10 transition"
              title="Copy text summary to clipboard"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-dim" />}
              <span>{copied ? "Copied" : "Copy Summary"}</span>
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-accent text-ink font-semibold text-xs hover:bg-accent/90 transition shadow-sm"
              title="Print or save formal clinical report as PDF"
            >
              <Printer className="size-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Printable Formal Diagnostic Radiology Report Sheet */}
        {/* ========================================================================= */}
        <div 
          id="clinical-report-sheet" 
          className="rounded-2xl bg-panel/70 ring-1 ring-line/70 p-6 sm:p-10 shadow-2xl backdrop-blur-md print:bg-white print:text-black print:ring-0 print:shadow-none print:p-0 print:m-0"
        >
          {/* Document Header */}
          <header className="border-b border-line/60 pb-6 print:border-black/30">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-11 rounded-lg bg-accent/20 ring-1 ring-accent/40 grid place-items-center text-accent print:ring-black print:bg-black/10 print:text-black font-display font-black text-xl">
                  P
                </div>
                <div>
                  <div className="font-display font-bold text-xl tracking-tight text-frost print:text-black">
                    PulmoScope AI Diagnostic Center
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-dim print:text-gray-600">
                    Advanced Deep Learning Pulmonary Imaging & Interpretability
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-xs text-dim print:text-gray-700 space-y-0.5">
                <div><strong className="text-frost print:text-black">Report ID:</strong> {reportId}</div>
                <div><strong className="text-frost print:text-black">Study Date:</strong> {reportDate}</div>
                <div><strong className="text-frost print:text-black">Modality:</strong> Digital PA Chest Radiograph</div>
              </div>
            </div>
          </header>

          {/* Patient Demographic Information Banner */}
          <section className="my-6 rounded-xl bg-frost/[0.02] ring-1 ring-line/50 p-4 print:bg-gray-100 print:ring-gray-300">
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-accent print:text-black font-bold mb-3">
              Patient & Study Demographics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-dim print:text-gray-600 block text-[11px]">Patient Name</span>
                <span className="font-semibold text-frost print:text-black">{activePatientName}</span>
              </div>
              <div>
                <span className="text-dim print:text-gray-600 block text-[11px]">Medical Record No.</span>
                <span className="font-mono font-semibold text-frost print:text-black">{activeMRN}</span>
              </div>
              <div>
                <span className="text-dim print:text-gray-600 block text-[11px]">Age / Gender</span>
                <span className="font-semibold text-frost print:text-black">{activeAge} yrs • {activeGender}</span>
              </div>
              <div>
                <span className="text-dim print:text-gray-600 block text-[11px]">Attending Clinician</span>
                <span className="font-semibold text-frost print:text-black">{doctorName}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-line/40 print:border-gray-300 text-xs">
              <span className="text-dim print:text-gray-600 font-mono text-[10px] uppercase tracking-wider mr-2">Clinical Indication:</span>
              <span className="text-frost/90 print:text-black italic">{activeSymptoms}</span>
            </div>
          </section>

          {/* Primary AI Classification Impression */}
          <section className="mb-6 rounded-xl bg-panel/50 ring-1 ring-line/60 p-5 print:ring-black/20 print:bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/40 pb-3 print:border-black/20">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-accent print:text-black" />
                <h3 className="font-mono text-[11px] uppercase tracking-wider font-bold text-frost print:text-black">
                  Primary Radiographic Diagnosis
                </h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-accent/15 text-accent ring-1 ring-accent/30 print:bg-black/10 print:text-black">
                Model Confidence: {(primaryConfidence * 100).toFixed(2)}%
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display font-bold text-2xl text-accent print:text-black">
                  {CLASS_DISPLAY_NAMES[predictedClass] || predictedClass}
                </div>
                <p className="text-xs text-dim print:text-gray-600 mt-1">
                  Multiclass deep convolutional neural classification (EfficientNet-B0 transfer model)
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 ring-1 ring-amber-300/30 px-3 py-2 text-amber-200 print:text-black print:bg-gray-100 print:ring-gray-300 text-[11px]">
                <ShieldCheck className="size-4 shrink-0 text-amber-400 print:text-black" />
                <span>AI-Assisted triage output. Requires clinical correlation.</span>
              </div>
            </div>
          </section>

          {/* Multi-Class Probabilities Grid */}
          <section className="mb-6">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim print:text-gray-600 font-semibold mb-3">
              Differential Probability Distribution
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(scoreMap).map(([key, val]) => {
                const score = Number(val);
                const isWinner = key === predictedClass;
                return (
                  <div
                    key={key}
                    className={`rounded-xl p-3 ring-1 transition ${
                      isWinner
                        ? "bg-accent/10 ring-accent/40 text-frost print:bg-gray-100 print:ring-black"
                        : "bg-frost/[0.02] ring-line/50 text-dim print:text-gray-700"
                    }`}
                  >
                    <div className="text-[11px] font-medium truncate mb-1">
                      {CLASS_DISPLAY_NAMES[key]?.split(" ")[0] || key}
                    </div>
                    <div className="font-mono text-base font-bold text-frost print:text-black">
                      {(score * 100).toFixed(1)}%
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-line/60 overflow-hidden print:bg-gray-300">
                      <div
                        className={`h-full rounded-full ${isWinner ? "bg-accent print:bg-black" : "bg-ice/50"}`}
                        style={{ width: `${Math.max(2, Math.min(100, score * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Imaging & Interpretability Panel */}
          {originalImg && overlayImg && (
            <section className="mb-6 rounded-xl bg-frost/[0.02] ring-1 ring-line/50 p-4 print:ring-gray-300">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim print:text-gray-600 font-semibold mb-3">
                Radiographic Images & Salience Localization
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg bg-black/60 p-2 text-center ring-1 ring-line/40 print:bg-white print:ring-gray-300">
                  <img
                    src={`data:image/png;base64,${originalImg}`}
                    alt="Original Chest Radiograph"
                    className="w-full max-h-64 object-contain rounded mx-auto"
                  />
                  <span className="block mt-2 font-mono text-[10px] text-dim print:text-gray-600">
                    Figure A: Original Unprocessed Radiograph
                  </span>
                </div>
                <div className="rounded-lg bg-black/60 p-2 text-center ring-1 ring-line/40 print:bg-white print:ring-gray-300">
                  <img
                    src={`data:image/png;base64,${overlayImg}`}
                    alt="Grad-CAM Overlay"
                    className="w-full max-h-64 object-contain rounded mx-auto"
                  />
                  <span className="block mt-2 font-mono text-[10px] text-accent print:text-black font-semibold">
                    Figure B: High-Clarity Grad-CAM Salience Overlay
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Clinical Opinion / Findings Input Box */}
          <section className="mb-6">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim print:text-gray-600 font-semibold mb-2">
              Radiologist Clinical Impression & Interpretive Notes
            </h3>
            <textarea
              rows={4}
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              className="w-full rounded-xl bg-frost/[0.03] ring-1 ring-line/70 p-3 text-xs leading-relaxed text-frost print:text-black print:bg-white print:ring-0 focus:outline-none focus:ring-accent/50 resize-y"
              placeholder="Enter radiologist clinical impressions and observations..."
            />
          </section>

          {/* Evidence-Based Next Steps */}
          <section className="mb-8 rounded-xl bg-panel/30 ring-1 ring-line/50 p-4 print:ring-gray-300 print:bg-white">
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-dim print:text-gray-600 font-semibold mb-2 flex items-center gap-1.5">
              <FileCheck className="size-3.5 text-accent print:text-black" />
              <span>Recommended Clinical Next Steps</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-frost/85 print:text-gray-800">
              {(CLINICAL_RECOMMENDATIONS[predictedClass] || []).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-accent print:text-black font-bold">[{i + 1}]</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Formal Verification & Signature Footer */}
          <footer className="pt-6 border-t border-line/60 print:border-black/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end text-xs">
              <div>
                <p className="text-[11px] text-dim print:text-gray-600 leading-relaxed">
                  <strong>Notice & Medical Disclaimer:</strong> PulmoScope is a machine-learning research system for exploratory chest radiograph triage. Final clinical diagnosis remains the sole responsibility of the licensed examining physician.
                </p>
              </div>

              <div className="sm:text-right space-y-1">
                <div className="font-signature text-xl text-accent print:text-black font-serif italic">
                  {doctorName}
                </div>
                <div className="font-semibold text-frost print:text-black">{doctorName}, MD</div>
                <div className="text-[11px] text-dim print:text-gray-600 font-mono">
                  License: {doctor.license} • Chest Imaging
                </div>
                <div className="text-[10px] text-dim print:text-gray-500 font-mono">
                  Electronically Signed: {reportDate}
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </AppShell>
  );
}
