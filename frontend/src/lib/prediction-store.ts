export type PredictionResult = {
  predicted_class: string;
  scores: Record<string, number>;
  images: { original: string; heatmap: string; overlay: string };
  notice?: string;
  fileName?: string;
  patientName?: string;
  patientMRN?: string;
  patientAge?: number;
  patientGender?: "M" | "F";
  patientSymptoms?: string;
  createdAt?: string;
};

let currentPrediction: PredictionResult | null = null;

export function setPredictionResult(result: PredictionResult | null): void {
  currentPrediction = result;
}

export function getPredictionResult(): PredictionResult | null {
  return currentPrediction;
}
