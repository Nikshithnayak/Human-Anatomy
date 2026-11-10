/**
 * Z-Anatomy (nqwrc/3d-anatomy) Client & Metadata Adapter
 *
 * Integrates the 2,827-structure Z-Anatomy atlas across 7 anatomical systems
 * (Draco-compressed GLBs, Terminologia Anatomica Latin lexicon, and clinical definitions)
 * originally packaged in external/3d-anatomy.
 *
 * Attribution (CC BY-NC-SA 4.0):
 * - BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan
 * - Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0
 * - Inner Ear (University of Dundee, CC-BY-NC-SA 4.0) & Kidney (lissiecowley, CC-BY-NC 4.0)
 */

export type ZAnatomySystemId =
  | "skeletal"
  | "muscular"
  | "joints"
  | "cardiovascular"
  | "lymphatic"
  | "nervous"
  | "visceral";

export interface ZAnatomySystemMeta {
  id: ZAnatomySystemId;
  name: string;
  latinName: string;
  color: string;
  structureCount: number;
  sizeLabel: string;
  description: string;
}

export const Z_ANATOMY_SYSTEMS: ZAnatomySystemMeta[] = [
  {
    id: "skeletal",
    name: "Skeletal",
    latinName: "Systema skeletale",
    color: "#e2d9ba",
    structureCount: 277,
    sizeLabel: "1.8 MB",
    description: "277 osseous structures including axial cranium, vertebral column, thoracic cage, and appendicular skeleton.",
  },
  {
    id: "joints",
    name: "Joints & Ligaments",
    latinName: "Juncturae et ligamenta",
    color: "#a9c5be",
    structureCount: 349,
    sizeLabel: "0.9 MB",
    description: "349 articular capsules, menisci, labra, intervertebral discs, and stabilizing ligaments.",
  },
  {
    id: "muscular",
    name: "Muscular & Fasciae",
    latinName: "Systema musculare",
    color: "#b46055",
    structureCount: 669,
    sizeLabel: "4.3 MB",
    description: "669 skeletal muscles, tendons, aponeuroses, and bursae across head, trunk, and limbs.",
  },
  {
    id: "cardiovascular",
    name: "Cardiovascular",
    latinName: "Systema cardiovasculare",
    color: "#c45348",
    structureCount: 676,
    sizeLabel: "5.4 MB",
    description: "676 cardiac chambers, systemic arteries, and deep/superficial venous tributaries.",
  },
  {
    id: "lymphatic",
    name: "Lymphatic",
    latinName: "Systema lymphoideum",
    color: "#7f9d74",
    structureCount: 158,
    sizeLabel: "0.4 MB",
    description: "158 regional lymph node groups, thoracic duct trunks, thymus, and spleen.",
  },
  {
    id: "nervous",
    name: "Nervous & Sensory",
    latinName: "Systema nervosum",
    color: "#d4b05c",
    structureCount: 580,
    sizeLabel: "3.6 MB",
    description: "580 CNS subdivisions, cranial nerves, spinal plexuses, peripheral branches, eye, and inner ear.",
  },
  {
    id: "visceral",
    name: "Visceral Organs",
    latinName: "Viscera et splanchnologia",
    color: "#bd8d67",
    structureCount: 118,
    sizeLabel: "1.8 MB",
    description: "118 respiratory, digestive, urinary, and endocrine organs including tracheobronchial and GI tracts.",
  },
];

// Ordered superficial -> deep to drive the progressive depth peel slider
export const Z_ANATOMY_DEPTH_ORDER: ZAnatomySystemId[] = [
  "muscular",
  "lymphatic",
  "cardiovascular",
  "nervous",
  "visceral",
  "joints",
  "skeletal",
];

export interface ZAnatomyPreset {
  id: string;
  label: string;
  systems: ZAnatomySystemId[];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  description: string;
}

export const Z_ANATOMY_PRESETS: ZAnatomyPreset[] = [
  {
    id: "skeleton-front",
    label: "Skeleton Front",
    systems: ["skeletal"],
    cameraPos: [0, 0.86, 2.55],
    cameraTarget: [0, 0.86, 0],
    description: "Full standing skeletal reference (277 structures).",
  },
  {
    id: "thigh-muscles",
    label: "Musculoskeletal",
    systems: ["skeletal", "muscular"],
    cameraPos: [0.18, 0.78, 1.35],
    cameraTarget: [0.05, 0.72, 0],
    description: "Femoral and pelvic musculature over bony attachments.",
  },
  {
    id: "heart-vessels",
    label: "Heart & Vessels",
    systems: ["cardiovascular"],
    cameraPos: [0, 1.28, 0.82],
    cameraTarget: [0, 1.28, 0],
    description: "Thoracic cardiovascular tree, chambers, and great vessels.",
  },
  {
    id: "thorax-viscera",
    label: "Thorax & Viscera",
    systems: ["skeletal", "visceral", "cardiovascular"],
    cameraPos: [0.35, 1.24, 1.05],
    cameraTarget: [0, 1.22, 0],
    description: "Cardiopulmonary and upper abdominal organs within rib cage.",
  },
];

export interface ZAnatomyLexiconEntry {
  la?: string;
  official?: boolean;
}

export interface ZAnatomyPart {
  id: string;
  meshName: string;
  name: string;
  baseName: string;
  side: "left" | "right" | null;
  system: ZAnatomySystemId;
  latinName: string;
  official: boolean;
}

export interface ZAnatomyContainment {
  parentId: string | null;
  childIds: string[];
}

export function splitZAnatomySide(meshName: string): { base: string; side: "left" | "right" | null } {
  const suffix = meshName.slice(-2);
  if (suffix === ".l") return { base: meshName.slice(0, -2), side: "left" };
  if (suffix === ".r") return { base: meshName.slice(0, -2), side: "right" };
  return { base: meshName, side: null };
}

export function formatZAnatomyPartName(meshName: string): string {
  const { base, side } = splitZAnatomySide(meshName);
  const clean = base.replace(/^\((.*)\)$/, "$1").trim();
  return side ? `${clean} (${side})` : clean;
}

export function buildZAnatomyPartsData(
  systemsData: Record<string, string[]>,
  lexicon: Record<string, ZAnatomyLexiconEntry> = {}
): Record<string, ZAnatomyPart> {
  const parts: Record<string, ZAnatomyPart> = {};

  Object.entries(systemsData).forEach(([sysKey, meshNames]) => {
    const system = sysKey as ZAnatomySystemId;
    meshNames.forEach((meshName) => {
      const { base, side } = splitZAnatomySide(meshName);
      const lexEntry = lexicon[base] || {};
      parts[meshName] = {
        id: meshName,
        meshName,
        name: formatZAnatomyPartName(meshName),
        baseName: base,
        side,
        system,
        latinName: lexEntry.la || "",
        official: lexEntry.official !== false,
      };
    });
  });

  return parts;
}

export function parseZAnatomyDefinition(raw?: string): { text: string; url: string | null } {
  if (!raw) return { text: "", url: null };
  const urlMatch = raw.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : null;
  const text = raw
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/\s*===\s*([^=]+?)\s*===\s*/g, "\n\n$1: ")
    .trim();
  return { text, url };
}

/**
 * Pure depth peel computation faithful to external/3d-anatomy/src/ui/depthSlider.js
 */
export function computeDepthLayerStates(
  depthPercent: number,
  loadedSystems: ZAnatomySystemId[]
): Record<ZAnatomySystemId, { visible: boolean; opacity: number }> {
  const ordered = Z_ANATOMY_DEPTH_ORDER.filter((id) => loadedSystems.includes(id));
  const out = {} as Record<ZAnatomySystemId, { visible: boolean; opacity: number }>;
  if (ordered.length === 0) return out;

  const clamped = Math.max(0, Math.min(100, depthPercent));
  const progress = (clamped / 100) * ordered.length;

  ordered.forEach((systemId, index) => {
    const opacity = Math.min(Math.max(1 - (progress - index), 0), 1);
    out[systemId] = {
      visible: opacity > 0.05,
      opacity,
    };
  });

  return out;
}

let cachedSystems: Record<string, string[]> | null = null;
let cachedLexicon: Record<string, ZAnatomyLexiconEntry> | null = null;
let cachedDefinitions: Record<string, string> | null = null;

export async function loadZAnatomySystemsJson(): Promise<Record<string, string[]>> {
  if (cachedSystems) return cachedSystems;
  const res = await fetch("/z-anatomy/data/systems.json");
  if (!res.ok) throw new Error(`Failed to fetch Z-Anatomy catalog (${res.status})`);
  cachedSystems = (await res.json()) as Record<string, string[]>;
  return cachedSystems;
}

export async function loadZAnatomyLexiconJson(): Promise<Record<string, ZAnatomyLexiconEntry>> {
  if (cachedLexicon) return cachedLexicon;
  try {
    const res = await fetch("/z-anatomy/data/lexicon.json");
    cachedLexicon = res.ok ? ((await res.json()) as Record<string, ZAnatomyLexiconEntry>) : {};
  } catch {
    cachedLexicon = {};
  }
  return cachedLexicon;
}

export async function loadZAnatomyDefinitionsJson(): Promise<Record<string, string>> {
  if (cachedDefinitions) return cachedDefinitions;
  try {
    const res = await fetch("/z-anatomy/data/definitions.json");
    cachedDefinitions = res.ok ? ((await res.json()) as Record<string, string>) : {};
  } catch {
    cachedDefinitions = {};
  }
  return cachedDefinitions;
}

