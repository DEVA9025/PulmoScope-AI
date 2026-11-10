export type Patient = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: "M" | "F";
  phone: string;
  symptoms: string;
  lastStudy: string;
  createdAt?: string;
};

export type PatientCreateInput = {
  name: string;
  age: number;
  gender: "M" | "F";
  phone?: string;
  symptoms?: string;
};

const API_BASE = "http://localhost:8000";

export async function fetchPatients(query?: string): Promise<Patient[]> {
  const url = new URL(`${API_BASE}/patients`);
  if (query) {
    url.searchParams.set("search", query);
  }
  const res = await fetch(url.toString(), {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to load patients (${res.status})`);
  }
  return res.json();
}

export async function createPatient(data: PatientCreateInput): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to register patient (${res.status})`);
  }
  return res.json();
}

export async function deletePatient(patientId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/patients/${patientId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete patient (${res.status})`);
  }
}
