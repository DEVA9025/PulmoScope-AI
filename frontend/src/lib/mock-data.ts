export type DiseaseClass =
  | "Normal"
  | "Pneumonia"
  | "COVID"
  | "Tuberculosis"
  | "Pulmonary Fibrosis"
  | "Lung Cancer";

export const DISEASE_CLASSES: DiseaseClass[] = [
  "Normal",
  "Pneumonia",
  "COVID",
  "Tuberculosis",
  "Pulmonary Fibrosis",
  "Lung Cancer",
];

export type Patient = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: "M" | "F";
  phone: string;
  symptoms: string;
  lastStudy: string;
};

export type Diagnosis = {
  id: string;
  mrn: string;
  patient: string;
  disease: DiseaseClass;
  confidence: number;
  date: string;
};

export const doctor = {
  name: "Dr. Amara Osei",
  specialty: "Chest Radiology",
  email: "a.osei@stbernard.health",
  hospital: "St. Bernard Chest Institute",
  license: "MD-RAD-88214",
};

export const patients: Patient[] = [
  {
    id: "p1",
    mrn: "MRN-4471",
    name: "K. Osei",
    age: 54,
    gender: "F",
    phone: "+1 415 220 8841",
    symptoms: "Productive cough, fever 39.1°C, dyspnoea",
    lastStudy: "2026-09-10",
  },
  {
    id: "p2",
    mrn: "MRN-4468",
    name: "R. Delgado",
    age: 37,
    gender: "M",
    phone: "+1 415 771 3320",
    symptoms: "Routine pre-operative screening",
    lastStudy: "2026-09-10",
  },
  {
    id: "p3",
    mrn: "MRN-4452",
    name: "M. Haddad",
    age: 61,
    gender: "M",
    phone: "+1 415 908 1177",
    symptoms: "Night sweats, weight loss, chronic cough",
    lastStudy: "2026-09-09",
  },
  {
    id: "p4",
    mrn: "MRN-4439",
    name: "S. Nakamura",
    age: 45,
    gender: "F",
    phone: "+1 415 664 5502",
    symptoms: "Anosmia, low-grade fever, fatigue",
    lastStudy: "2026-09-09",
  },
  {
    id: "p5",
    mrn: "MRN-4402",
    name: "L. Fontaine",
    age: 68,
    gender: "F",
    phone: "+1 415 302 9911",
    symptoms: "Progressive exertional breathlessness",
    lastStudy: "2026-09-08",
  },
];

export const diagnoses: Diagnosis[] = [
  { id: "d1", mrn: "MRN-4471", patient: "K. Osei", disease: "Pneumonia", confidence: 0.96, date: "2026-09-10" },
  { id: "d2", mrn: "MRN-4468", patient: "R. Delgado", disease: "Normal", confidence: 0.99, date: "2026-09-10" },
  { id: "d3", mrn: "MRN-4452", patient: "M. Haddad", disease: "Tuberculosis", confidence: 0.88, date: "2026-09-09" },
  { id: "d4", mrn: "MRN-4439", patient: "S. Nakamura", disease: "COVID", confidence: 0.74, date: "2026-09-09" },
  {
    id: "d5",
    mrn: "MRN-4402",
    patient: "L. Fontaine",
    disease: "Pulmonary Fibrosis",
    confidence: 0.81,
    date: "2026-09-08",
  },
  { id: "d6", mrn: "MRN-4388", patient: "T. Iwu", disease: "Lung Cancer", confidence: 0.69, date: "2026-09-07" },
];

export const softmax: Record<DiseaseClass, number> = {
  Normal: 0.01,
  Pneumonia: 0.96,
  COVID: 0.01,
  Tuberculosis: 0.01,
  "Pulmonary Fibrosis": 0.0,
  "Lung Cancer": 0.01,
};
