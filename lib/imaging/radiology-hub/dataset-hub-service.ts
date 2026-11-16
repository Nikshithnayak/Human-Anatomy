import type {
  RadiologyDataset,
  RadiologyDatasetFilter,
  FineTuningProfile,
} from "./types.ts";
import { BENCHMARK_FINE_TUNING_PROFILES } from "./fine-tuning-profiles.ts";

// Benchmark mapping from Radiology Hub IDs to Anatomy Atelier's calibrated volumetric reference studies
export const BENCHMARK_STUDY_MAP: Record<string, string> = {
  "lidc-idri": "study-ct-thorax",
  "lits": "study-ct-abdomen",
  "btcv": "study-ct-abdomen",
  "brats-2021": "study-mr-neuro",
  "rsna-lumbar-spine-2024": "study-ct-spine",
  "totalsegmentator": "study-ct-abdomen",
};

let cachedDatasets: RadiologyDataset[] | null = null;
let fetchPromise: Promise<RadiologyDataset[]> | null = null;

/**
 * Loads the complete 474-dataset Radiology Dataset Hub catalog.
 * Uses client-side fetch from /data/radiology-datasets.json with caching.
 */
export async function getRadiologyDatasets(): Promise<RadiologyDataset[]> {
  if (cachedDatasets && cachedDatasets.length > 0) {
    return cachedDatasets;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch("/data/radiology-datasets.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch radiology datasets: HTTP ${response.status}`);
      }
      const rawData = (await response.json()) as RadiologyDataset[];

      // Enhance entries with mapped Anatomy Atelier benchmark case links
      cachedDatasets = rawData.map((d) => ({
        ...d,
        benchmarkCaseId: BENCHMARK_STUDY_MAP[d.id] || undefined,
      }));

      return cachedDatasets;
    } catch (err) {
      console.warn("Could not fetch remote radiology-datasets.json, falling back to core benchmark set:", err);
      // Fallback core set of premier clinical benchmarks
      cachedDatasets = getCoreFallbackDatasets();
      return cachedDatasets;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Filters radiology datasets by multiple clinical and technical facets.
 */
export function filterRadiologyDatasets(
  datasets: RadiologyDataset[],
  filter: RadiologyDatasetFilter
): RadiologyDataset[] {
  return datasets.filter((dataset) => {
    // 1. Text search
    if (filter.query && filter.query.trim().length > 0) {
      const q = filter.query.toLowerCase().trim();
      const matchName = dataset.name?.toLowerCase().includes(q) ?? false;
      const matchFullName = dataset.full_name?.toLowerCase().includes(q) ?? false;
      const matchAnatomy = dataset.anatomy?.toLowerCase().includes(q) ?? false;
      const matchDesc = dataset.description?.toLowerCase().includes(q) ?? false;
      const matchHost = dataset.host?.toLowerCase().includes(q) ?? false;
      const matchTasks = dataset.tasks?.some((t) => t?.toLowerCase().includes(q)) ?? false;

      if (!matchName && !matchFullName && !matchAnatomy && !matchDesc && !matchHost && !matchTasks) {
        return false;
      }
    }

    // 2. Region filter
    if (filter.region && filter.region !== "all") {
      if (!dataset.regions?.includes(filter.region)) {
        return false;
      }
    }

    // 3. Modality filter
    if (filter.modality && filter.modality !== "all") {
      if (!dataset.modality?.includes(filter.modality)) {
        return false;
      }
    }

    // 4. Task filter
    if (filter.task && filter.task !== "all") {
      if (!dataset.tasks?.includes(filter.task)) {
        return false;
      }
    }

    // 5. Access filter
    if (filter.access && filter.access !== "all") {
      if ((dataset.access || "").toLowerCase() !== filter.access.toLowerCase()) {
        return false;
      }
    }

    // 6. Segmentation checkbox
    if (filter.hasSegmentation && !dataset.segmentation) {
      return false;
    }

    // 7. Multi-sequence checkbox
    if (filter.hasMultiSequence && !dataset.multi_sequence) {
      return false;
    }

    return true;
  });
}

/**
 * Returns datasets that have calibrated benchmark cases ready for 1-click loading.
 */
export function getCalibratedBenchmarkDatasets(datasets: RadiologyDataset[]): RadiologyDataset[] {
  return datasets.filter((d) => d.benchmarkCaseId !== undefined);
}

/**
 * Retrieves fine-tuning specifications and protocol recommendations for a dataset.
 */
export function getFineTuningProfile(datasetId: string): FineTuningProfile | null {
  return BENCHMARK_FINE_TUNING_PROFILES[datasetId] || null;
}

/**
 * Summary metrics of the dataset hub for dashboards and stats headers.
 */
export function getRadiologyHubMetrics(datasets: RadiologyDataset[]) {
  const total = datasets.length;
  const withSegmentation = datasets.filter((d) => d.segmentation).length;
  const withMultiSequence = datasets.filter((d) => d.multi_sequence).length;
  const openAccess = datasets.filter((d) => d.access === "open").length;

  const modalitiesCount: Record<string, number> = {};
  const regionsCount: Record<string, number> = {};

  datasets.forEach((d) => {
    d.modality?.forEach((m) => {
      modalitiesCount[m] = (modalitiesCount[m] || 0) + 1;
    });
    d.regions?.forEach((r) => {
      regionsCount[r] = (regionsCount[r] || 0) + 1;
    });
  });

  return {
    total,
    withSegmentation,
    withMultiSequence,
    openAccess,
    modalitiesCount,
    regionsCount,
  };
}

/**
 * Core benchmark datasets included as emergency fallback in case network fetch fails.
 */
function getCoreFallbackDatasets(): RadiologyDataset[] {
  return [
    {
      id: "brats-2021",
      name: "BraTS 2021",
      full_name: "RSNA-ASNR-MICCAI Brain Tumor Segmentation Challenge 2021",
      type: "dataset",
      regions: ["Neuro"],
      anatomy: "brain",
      modality: ["MRI"],
      year: 2021,
      format: ["NIfTI"],
      raw_image: true,
      size: "~2,040 patients (1,251 public training)",
      paired_text: false,
      paired_text_detail: null,
      multi_sequence: true,
      multi_sequence_detail: "T1, T1Gd (T1c), T2, T2-FLAIR",
      segmentation: true,
      segmentation_detail: "enhancing tumor, tumor core, whole tumor",
      other_labels: ["classification"],
      tasks: ["segmentation", "classification"],
      license: "CC BY 4.0",
      access: "registration",
      host: "Synapse",
      url: "https://www.synapse.org/Synapse:syn25829067",
      description: "Multi-parametric MRI of adult glioma with expert tumor sub-region segmentations and MGMT methylation status.",
      benchmarkCaseId: "study-mr-neuro",
    },
    {
      id: "lidc-idri",
      name: "LIDC-IDRI",
      full_name: "Lung Image Database Consortium and Image Database Resource Initiative",
      type: "dataset",
      regions: ["Chest"],
      anatomy: "lung",
      modality: ["CT"],
      year: 2011,
      format: ["DICOM", "XML"],
      raw_image: true,
      size: "1,018 CT scans / 1,010 patients",
      paired_text: false,
      paired_text_detail: null,
      multi_sequence: false,
      multi_sequence_detail: null,
      segmentation: true,
      segmentation_detail: "nodule contours from four thoracic radiologists (XML)",
      other_labels: ["classification", "nodule characteristics"],
      tasks: ["detection", "segmentation", "classification"],
      license: "CC BY 3.0",
      access: "open",
      host: "TCIA",
      url: "https://www.cancerimagingarchive.net/collection/lidc-idri/",
      description: "1,018 thoracic CT scans with lesion markups and subjective nodule characteristic ratings from four radiologists.",
      benchmarkCaseId: "study-ct-thorax",
    },
    {
      id: "lits",
      name: "LiTS",
      full_name: "Liver Tumor Segmentation Challenge",
      type: "dataset",
      regions: ["Abdomen"],
      anatomy: "liver",
      modality: ["CT"],
      year: 2017,
      format: ["NIfTI"],
      raw_image: true,
      size: "201 CT scans (131 training / 70 test)",
      paired_text: false,
      paired_text_detail: null,
      multi_sequence: false,
      multi_sequence_detail: null,
      segmentation: true,
      segmentation_detail: "liver and liver lesion contours",
      other_labels: null,
      tasks: ["segmentation"],
      license: "CC BY-NC 4.0",
      access: "open",
      host: "Grand Challenge / CodaLab",
      url: "https://competitions.codalab.org/competitions/17094",
      description: "Abdominal CT scans with manual expert segmentations of both liver parenchyma and primary/secondary hepatic tumors.",
      benchmarkCaseId: "study-ct-abdomen",
    },
    {
      id: "rsna-lumbar-spine-2024",
      name: "RSNA Lumbar Spine 2024",
      full_name: "RSNA Lumbar Spine Degeneration Classification Challenge",
      type: "dataset",
      regions: ["MSK"],
      anatomy: "spine",
      modality: ["MRI"],
      year: 2024,
      format: ["DICOM"],
      raw_image: true,
      size: "2,400+ patients across multiple series",
      paired_text: false,
      paired_text_detail: null,
      multi_sequence: true,
      multi_sequence_detail: "Sagittal T1, Sagittal T2/STIR, Axial T2",
      segmentation: false,
      segmentation_detail: null,
      other_labels: ["classification"],
      tasks: ["classification"],
      license: "Non-Commercial Research",
      access: "registration",
      host: "Kaggle",
      url: "https://www.kaggle.com/competitions/rsna-2024-lumbar-spine-degeneration-classification",
      description: "Multi-sequence lumbar spine MRI for grading spinal canal stenosis, neural foraminal narrowing, and subarticular stenosis.",
      benchmarkCaseId: "study-ct-spine",
    },
    {
      id: "totalsegmentator",
      name: "TotalSegmentator v2",
      full_name: "TotalSegmentator: Robust Segmentation of 117 Anatomical Structures",
      type: "dataset",
      regions: ["WholeBody", "Abdomen", "Chest", "Pelvis", "MSK"],
      anatomy: "whole-body",
      modality: ["CT"],
      year: 2023,
      format: ["NIfTI"],
      raw_image: true,
      size: "1,204 CT scans from diverse scanner vendors",
      paired_text: false,
      paired_text_detail: null,
      multi_sequence: false,
      multi_sequence_detail: null,
      segmentation: true,
      segmentation_detail: "117 anatomical structures including 27 organs, 59 bones, 10 muscles, 21 vessels",
      other_labels: null,
      tasks: ["segmentation"],
      license: "Apache 2.0",
      access: "open",
      host: "Zenodo",
      url: "https://zenodo.org/record/6802614",
      description: "Whole-body CT dataset with human-verified annotations for 117 anatomical classes covering all major physiological systems.",
      benchmarkCaseId: "study-ct-abdomen",
    },
  ];
}
