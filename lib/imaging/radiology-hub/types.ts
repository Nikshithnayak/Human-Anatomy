/**
 * Types & Ontologies for Jung Oh Lee's Radiology Dataset Hub
 * Source: https://jungohlee.github.io/radiology-dataset-hub/
 * License: MIT License (Jung Oh Lee)
 */

export interface RadiologyDatasetDetails {
  label_schema?: string[];
  file_structure?: string;
  splits?: string;
  label_source?: string[];
  label_readers?: string;
  label_unit?: string[];
  reference_standard?: string;
  label_variants?: Array<{
    name: string;
    url: string;
    note?: string;
  }>;
  version?: string;
  release_date?: string;
  dicom_headers?: string;
  third_party_processing?: string;
  third_party_note?: string;
  extra?: string;
  [key: string]: unknown;
}

export interface RadiologyDataset {
  id: string;
  name: string;
  full_name: string;
  type: string;
  regions: string[];
  anatomy: string;
  modality: string[];
  year: number;
  format: string[];
  raw_image: boolean;
  size: string;
  paired_text: boolean;
  paired_text_detail: string | null;
  multi_sequence: boolean;
  multi_sequence_detail: string | null;
  segmentation: boolean;
  segmentation_detail: string | null;
  other_labels: string[] | null;
  tasks: string[];
  license: string | null;
  access: string;
  host: string;
  url: string;
  description: string;
  details?: RadiologyDatasetDetails;
  /** Mapped reference volumetric study ID in Anatomy Atelier if pre-calibrated */
  benchmarkCaseId?: string;
}

export interface RadiologyDatasetFilter {
  query?: string;
  region?: string;
  modality?: string;
  task?: string;
  access?: string;
  hasSegmentation?: boolean;
  hasMultiSequence?: boolean;
}

export interface FineTuningProfile {
  datasetId: string;
  datasetName: string;
  task: "segmentation" | "classification" | "detection";
  recommendedArchitecture: string;
  recommendedLoss: string;
  inputResolution: [number, number, number] | [number, number];
  intensityNormalization: {
    method: "hu-clipping" | "z-score" | "min-max";
    huWindow?: [number, number];
    meanStd?: { mean: number; std: number };
    description: string;
  };
  augmentationStrategy: string[];
  dataSplitsRecommended: string;
  evaluationMetrics: string[];
  clinicalSignificance: string;
}
