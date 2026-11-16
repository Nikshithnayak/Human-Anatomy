/**
 * Layered Body Atlas (bodyatlas.github.io) Client & Data Adapter
 *
 * Integrates the procedural 1,310-structure Layered Body Atlas across 12 anatomical systems
 * and 10 progressive dissection peel layers (skin to skeleton).
 *
 * Attribution:
 * - Layered Body Atlas (https://bodyatlas.github.io/)
 * - Procedural Three.js landmark models, Terminologia Anatomica Latin names, and clinical notes.
 */

import type { OrganId } from "@/app/lib/anatomy-data";

export type BodyAtlasSystemId =
  | "integumentary"
  | "skeletal"
  | "muscular"
  | "cardiovascular"
  | "respiratory"
  | "digestive"
  | "urinary"
  | "reproductive"
  | "nervous"
  | "endocrine"
  | "lymphatic"
  | "sensory";

export interface BodyAtlasSystemMeta {
  id: BodyAtlasSystemId;
  name: string;
  color: string;
  partCount: number;
  description: string;
}

export interface BodyAtlasLayerMeta {
  layer: number;
  name: string;
  partCount: number;
  description: string;
}

export interface BodyAtlasPartInfo {
  description: string;
  function: string;
  size: string;
  notes: string;
}

export interface BodyAtlasPart {
  id: string;
  name: string;
  latin: string;
  system: BodyAtlasSystemId;
  systemName: string;
  systemColor: string;
  layer: number;
  layerName: string;
  region: string;
  side: "L" | "R" | "M";
  parent: string | null;
  info: BodyAtlasPartInfo;
  center: [number, number, number];
  sexes: ("male" | "female")[];
}

export interface BodyAtlasFilter {
  query?: string;
  system?: BodyAtlasSystemId | "all";
  maxLayer?: number;
  sex?: "male" | "female" | "all";
  region?: string;
}

export const BODY_ATLAS_SYSTEMS: BodyAtlasSystemMeta[] = [
  {
    id: "integumentary",
    name: "Integumentary (skin)",
    color: "#d9a982",
    partCount: 30,
    description: "Epidermis, dermis, hypodermis, tactile corpuscles, hair follicles, and nail matrices.",
  },
  {
    id: "skeletal",
    name: "Skeletal",
    color: "#e9dfc7",
    partCount: 206,
    description: "Axial cranium, vertebral column, thoracic cage, and appendicular extremities with articular surfaces.",
  },
  {
    id: "muscular",
    name: "Muscular",
    color: "#b03a3a",
    partCount: 284,
    description: "Superficial and deep skeletal muscles, tendons, retinacula, and aponeuroses of upper/lower limbs and torso.",
  },
  {
    id: "cardiovascular",
    name: "Cardiovascular",
    color: "#d3363b",
    partCount: 228,
    description: "Heart chambers, myocardium, coronary circulation, great vessels, systemic arteries, and venae cavae.",
  },
  {
    id: "respiratory",
    name: "Respiratory",
    color: "#e2a5a5",
    partCount: 68,
    description: "Nasal cartilages, larynx, vocal cords, trachea with C-rings, bronchial tree, and five pulmonary lobes.",
  },
  {
    id: "digestive",
    name: "Digestive",
    color: "#d9968f",
    partCount: 96,
    description: "Oral cavity, salivary glands, esophagus, stomach, small/large intestines, liver segments, and pancreas.",
  },
  {
    id: "urinary",
    name: "Urinary",
    color: "#8b3b3b",
    partCount: 32,
    description: "Renal cortex, medullary pyramids, renal pelvis, ureters, urinary bladder, and urethra.",
  },
  {
    id: "reproductive",
    name: "Reproductive",
    color: "#c76a7a",
    partCount: 42,
    description: "Male (testes, epididymis, prostate) and female (ovaries, uterine tubes, uterus, cervix) genitalia.",
  },
  {
    id: "nervous",
    name: "Nervous",
    color: "#e8d24a",
    partCount: 164,
    description: "Cerebral lobes, basal ganglia, ventricles, brainstem, spinal cord, cranial nerves, and peripheral plexuses.",
  },
  {
    id: "endocrine",
    name: "Endocrine & glands",
    color: "#e0a85c",
    partCount: 28,
    description: "Pituitary gland, pineal gland, thyroid lobes, parathyroids, suprarenal glands, and islets of Langerhans.",
  },
  {
    id: "lymphatic",
    name: "Lymphatic & immune",
    color: "#79c27a",
    partCount: 56,
    description: "Spleen, thymus, thoracic duct, cisterna chyli, cervical/axillary/inguinal lymph node clusters.",
  },
  {
    id: "sensory",
    name: "Sensory (eye & ear)",
    color: "#5a7a9a",
    partCount: 76,
    description: "Detailed optical globe (cornea, lens, retina) and auditory apparatus (auricle, ossicles, cochlea, semicircular canals).",
  },
];

export const BODY_ATLAS_LAYERS: BodyAtlasLayerMeta[] = [
  { layer: 1, name: "Skin", partCount: 30, description: "Cutaneous surface and external skin landmarks." },
  { layer: 2, name: "Fat & fascia", partCount: 24, description: "Subcutaneous adipose layer and investing deep fasciae." },
  { layer: 3, name: "Superficial muscles", partCount: 162, description: "External prime movers and postural muscle envelopes." },
  { layer: 4, name: "Deep muscles", partCount: 122, description: "Intrinsic, stabilizing, and deep intervertebral muscle layers." },
  { layer: 5, name: "Blood vessels", partCount: 228, description: "Systemic arteries, major veins, and capillary arborizations." },
  { layer: 6, name: "Nerves", partCount: 164, description: "Peripheral nerves, plexuses, and cranial roots." },
  { layer: 7, name: "Lymphatics", partCount: 56, description: "Lymph node chains, collecting vessels, and lymphoid organs." },
  { layer: 8, name: "Organs", partCount: 242, description: "Visceral internal organs, thoracic contents, and brain parenchyma." },
  { layer: 9, name: "Glands", partCount: 28, description: "Exocrine and endocrine glandular structures." },
  { layer: 10, name: "Skeleton", partCount: 206, description: "Axial and appendicular bony framework." },
];

let cachedParts: BodyAtlasPart[] | null = null;
let partsLoadingPromise: Promise<BodyAtlasPart[]> | null = null;

export async function loadBodyAtlasParts(): Promise<BodyAtlasPart[]> {
  if (cachedParts) return cachedParts;
  if (partsLoadingPromise) return partsLoadingPromise;

  partsLoadingPromise = (async () => {
    try {
      const res = await fetch("/body-atlas/data/parts.json");
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching body-atlas parts`);
      const data = (await res.json()) as BodyAtlasPart[];
      cachedParts = data;
      return data;
    } catch (err) {
      console.warn("Falling back to embedded core BodyAtlas structures:", err);
      return [];
    } finally {
      partsLoadingPromise = null;
    }
  })();

  return partsLoadingPromise;
}

export function filterBodyAtlasParts(
  parts: BodyAtlasPart[],
  filter: BodyAtlasFilter
): BodyAtlasPart[] {
  const query = (filter.query || "").trim().toLowerCase();
  const system = filter.system || "all";
  const maxLayer = filter.maxLayer ?? 10;
  const sex = filter.sex || "all";
  const region = filter.region || "all";

  return parts.filter((part) => {
    if (system !== "all" && part.system !== system) return false;
    if (part.layer > maxLayer) return false;
    if (sex !== "all" && !part.sexes.includes(sex)) return false;
    if (region !== "all" && part.region !== region) return false;

    if (query) {
      const matchName = part.name.toLowerCase().includes(query);
      const matchLatin = (part.latin || "").toLowerCase().includes(query);
      const matchId = part.id.toLowerCase().includes(query);
      const matchNotes = (part.info?.notes || "").toLowerCase().includes(query);
      const matchFunc = (part.info?.function || "").toLowerCase().includes(query);
      return matchName || matchLatin || matchId || matchNotes || matchFunc;
    }

    return true;
  });
}

/**
 * Maps a selected BodyAtlas part to an interactive Organ Atelier target.
 */
export function mapBodyAtlasPartToOrganId(part: BodyAtlasPart): OrganId | null {
  const text = `${part.id} ${part.name} ${part.latin}`.toLowerCase();

  if (/(heart|atrium|ventricle|aorta|myocardi|pericardi|coronary)/i.test(text)) {
    return "heart";
  }
  if (/(brain|cerebr|cerebell|cortex|cortical|hippocamp|thalam|encephalon)/i.test(text)) {
    return "brain";
  }
  if (/(kidney|renal|nephron|renes)/i.test(text)) {
    return "kidneys";
  }
  if (/(liver|hepatic|hepar|gallbladder|bile)/i.test(text)) {
    return "liver";
  }
  if (/(lung|pulm|bronch|alveol|pleura|trachea)/i.test(text)) {
    return "lungs";
  }
  if (/(pancreas|pancreat|islet)/i.test(text)) {
    return "pancreas";
  }
  if (/(skin|epiderm|dermis|integument)/i.test(text)) {
    return "skin";
  }
  if (/(eye|eyeball|cornea|retina|sclera|lens)/i.test(text)) {
    return "eyeball";
  }
  if (/(stomach|gastric|intestine|colon|bowel|ileum|jejunum|duodenum|appendix|rectum)/i.test(text)) {
    return "intestine";
  }

  return null;
}
