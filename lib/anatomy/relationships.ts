import type { AnatomicalRelationship, StructureRelationshipProfile } from "@/integrations/anatomy/anatomy.types";

/**
 * Verified Anatomical Relationships Database
 * Maps clinical and spatial connections: Origin, Insertion, Innervation,
 * Blood Supply, Venous Drainage, Anatomical Neighbors, and Part-Of hierarchies.
 */
export const ANATOMICAL_RELATIONSHIPS_DATA: Record<string, StructureRelationshipProfile> = {
  // 1. Heart (Cor)
  heart: {
    structureId: "heart",
    structureName: "Heart",
    latinName: "Cor",
    system: "cardiac",
    relationships: [
      {
        id: "rel-h-1",
        sourceId: "heart",
        sourceName: "Heart",
        targetId: "ascending_aorta",
        targetName: "Ascending Aorta",
        type: "parent_of",
        description: "Left ventricular outflow tract directly empties into the ascending aorta through the aortic valve.",
        clinicalRelevance: "Aortic valve stenosis causes left ventricular hypertrophy and angina.",
      },
      {
        id: "rel-h-2",
        sourceId: "heart",
        sourceName: "Heart",
        targetId: "right_coronary_artery",
        targetName: "Right Coronary Artery (RCA)",
        type: "blood_supply",
        description: "RCA supplies the right atrium, right ventricle, and the SA node in ~60% of individuals.",
        clinicalRelevance: "Inferior myocardial infarction (leads II, III, aVF) is caused by RCA occlusion.",
      },
      {
        id: "rel-h-3",
        sourceId: "heart",
        sourceName: "Heart",
        targetId: "left_anterior_descending",
        targetName: "Left Anterior Descending Artery (LAD)",
        type: "blood_supply",
        description: "LAD irrigates the anterior wall of the left ventricle and anterior two-thirds of interventricular septum.",
        clinicalRelevance: "Known as the 'widow maker'; occlusion leads to massive anterior wall MI.",
      },
      {
        id: "rel-h-4",
        sourceId: "heart",
        sourceName: "Heart",
        targetId: "vagus_nerve",
        targetName: "Vagus Nerve (CN X)",
        type: "innervation",
        description: "Parasympathetic preganglionic fibers decrease heart rate and AV nodal conduction velocity.",
        clinicalRelevance: "Carotid sinus massage stimulates vagal tone, aborting supraventricular tachycardias.",
      },
      {
        id: "rel-h-5",
        sourceId: "heart",
        sourceName: "Heart",
        targetId: "lungs",
        targetName: "Lungs (Pulmones)",
        type: "neighbor",
        description: "The heart lies in the middle mediastinum between the bilateral pleural cavities and lungs.",
        clinicalRelevance: "Pericardial effusion can cause tamponade with compression of pulmonary veins.",
      },
    ],
  },

  // 2. Brain (Encephalon)
  brain: {
    structureId: "brain",
    structureName: "Brain",
    latinName: "Encephalon",
    system: "nervous",
    relationships: [
      {
        id: "rel-b-1",
        sourceId: "brain",
        sourceName: "Brain",
        targetId: "circle_of_willis",
        targetName: "Circle of Willis",
        type: "blood_supply",
        description: "Polygonal arterial anastomosis at skull base connecting internal carotid and basilar systems.",
        clinicalRelevance: "Most common site of saccular berry aneurysms (Anterior Communicating Artery).",
      },
      {
        id: "rel-b-2",
        sourceId: "brain",
        sourceName: "Brain",
        targetId: "internal_jugular_vein",
        targetName: "Internal Jugular Vein",
        type: "venous_drainage",
        description: "Dural venous sinuses drain through the sigmoid sinus into the internal jugular vein.",
        clinicalRelevance: "Cavernous sinus thrombosis can cause ophthalmoplegia and proptosis.",
      },
      {
        id: "rel-b-3",
        sourceId: "brain",
        sourceName: "Brain",
        targetId: "spinal_cord",
        targetName: "Spinal Cord",
        type: "neighbor",
        description: "Medulla oblongata is continuous inferiorly with the cervical spinal cord at foramen magnum.",
        clinicalRelevance: "Tonsillar herniation through foramen magnum compresses respiratory centers.",
      },
    ],
  },

  // 3. Deltoid Muscle
  deltoid: {
    structureId: "deltoid",
    structureName: "Deltoid Muscle",
    latinName: "Musculus deltoideus",
    system: "muscular",
    relationships: [
      {
        id: "rel-d-1",
        sourceId: "deltoid",
        sourceName: "Deltoid Muscle",
        targetId: "clavicle",
        targetName: "Lateral Clavicle & Acromion / Scapular Spine",
        type: "origin",
        description: "Arises from lateral third of clavicle, acromion, and spine of scapula.",
      },
      {
        id: "rel-d-2",
        sourceId: "deltoid",
        sourceName: "Deltoid Muscle",
        targetId: "humerus",
        targetName: "Deltoid Tuberosity of Humerus",
        type: "insertion",
        description: "Inserts into deltoid tuberosity on lateral surface of mid-humerus.",
      },
      {
        id: "rel-d-3",
        sourceId: "deltoid",
        sourceName: "Deltoid Muscle",
        targetId: "axillary_nerve",
        targetName: "Axillary Nerve (C5, C6)",
        type: "innervation",
        description: "Innervated by axillary nerve winding around surgical neck of humerus.",
        clinicalRelevance: "Fracture of surgical neck of humerus causes deltoid atrophy and sensory loss over lateral shoulder ('sergeant badge area').",
      },
      {
        id: "rel-d-4",
        sourceId: "deltoid",
        sourceName: "Deltoid Muscle",
        targetId: "posterior_circumflex_humeral",
        targetName: "Posterior Circumflex Humeral Artery",
        type: "blood_supply",
        description: "Arterial supply accompanies axillary nerve through the quadrangular space.",
      },
    ],
  },

  // 4. Biceps Brachii
  biceps_brachii: {
    structureId: "biceps_brachii",
    structureName: "Biceps Brachii",
    latinName: "Musculus biceps brachii",
    system: "muscular",
    relationships: [
      {
        id: "rel-bb-1",
        sourceId: "biceps_brachii",
        sourceName: "Biceps Brachii",
        targetId: "scapula",
        targetName: "Supraglenoid Tubercle & Coracoid Process",
        type: "origin",
        description: "Long head from supraglenoid tubercle; short head from coracoid process.",
      },
      {
        id: "rel-bb-2",
        sourceId: "biceps_brachii",
        sourceName: "Biceps Brachii",
        targetId: "radius",
        targetName: "Radial Tuberosity",
        type: "insertion",
        description: "Inserts into radial tuberosity and bicipital aponeurosis.",
      },
      {
        id: "rel-bb-3",
        sourceId: "biceps_brachii",
        sourceName: "Biceps Brachii",
        targetId: "musculocutaneous_nerve",
        targetName: "Musculocutaneous Nerve (C5, C6, C7)",
        type: "innervation",
        description: "Pierces coracobrachialis to supply biceps and brachialis.",
        clinicalRelevance: "Tested clinically via the Biceps Reflex (C5-C6).",
      },
    ],
  },

  // 5. Kidneys (Renes)
  kidneys: {
    structureId: "kidneys",
    structureName: "Kidneys",
    latinName: "Renes",
    system: "urinary",
    relationships: [
      {
        id: "rel-k-1",
        sourceId: "kidneys",
        sourceName: "Kidneys",
        targetId: "renal_artery",
        targetName: "Renal Artery",
        type: "blood_supply",
        description: "Arises directly from abdominal aorta at L1-L2 vertebra; receives 20-25% of cardiac output.",
        clinicalRelevance: "Renal artery stenosis activates renin-angiotensin system, causing renovascular hypertension.",
      },
      {
        id: "rel-k-2",
        sourceId: "kidneys",
        sourceName: "Kidneys",
        targetId: "renal_vein",
        targetName: "Renal Vein",
        type: "venous_drainage",
        description: "Left renal vein crosses over aorta beneath SMA; drains into Inferior Vena Cava (IVC).",
        clinicalRelevance: "Left renal vein entrapment ('Nutcracker syndrome') between aorta and SMA.",
      },
      {
        id: "rel-k-3",
        sourceId: "kidneys",
        sourceName: "Kidneys",
        targetId: "ureters",
        targetName: "Ureters",
        type: "parent_of",
        description: "Renal pelvis narrows at the ureteropelvic junction (UPJ) to conduct urine to the urinary bladder.",
        clinicalRelevance: "Common site of renal calculus impaction causing severe flank colic.",
      },
    ],
  },

  // 6. Liver (Hepar)
  liver: {
    structureId: "liver",
    structureName: "Liver",
    latinName: "Hepar",
    system: "digestive",
    relationships: [
      {
        id: "rel-l-1",
        sourceId: "liver",
        sourceName: "Liver",
        targetId: "hepatic_portal_vein",
        targetName: "Hepatic Portal Vein",
        type: "blood_supply",
        description: "Delivers 75% of blood volume to liver (nutrient-rich from stomach, intestine, spleen).",
        clinicalRelevance: "Portal hypertension produces esophageal varices, ascites, and caput medusae.",
      },
      {
        id: "rel-l-2",
        sourceId: "liver",
        sourceName: "Liver",
        targetId: "hepatic_artery_proper",
        targetName: "Hepatic Artery Proper",
        type: "blood_supply",
        description: "Delivers 25% of blood volume (oxygen-rich) branching from celiac trunk.",
      },
      {
        id: "rel-l-3",
        sourceId: "liver",
        sourceName: "Liver",
        targetId: "gallbladder",
        targetName: "Gallbladder",
        type: "neighbor",
        description: "Rests in gallbladder fossa on inferior surface of right liver lobe.",
        clinicalRelevance: "Acute cholecystitis produces positive Murphy's sign and right scapula referred pain.",
      },
    ],
  },

  // 7. Lungs (Pulmones)
  lungs: {
    structureId: "lungs",
    structureName: "Lungs",
    latinName: "Pulmones",
    system: "respiratory",
    relationships: [
      {
        id: "rel-lu-1",
        sourceId: "lungs",
        sourceName: "Lungs",
        targetId: "pulmonary_artery",
        targetName: "Pulmonary Trunk & Arteries",
        type: "blood_supply",
        description: "Carries deoxygenated blood from right ventricle into alveolar capillary network.",
        clinicalRelevance: "Saddle pulmonary embolism occludes bifurcation, producing sudden obstructive shock.",
      },
      {
        id: "rel-lu-2",
        sourceId: "lungs",
        sourceName: "Lungs",
        targetId: "phrenic_nerve",
        targetName: "Phrenic Nerve (C3, C4, C5)",
        type: "innervation",
        description: "Passes between pericardium and pleura to innervate the diaphragm.",
        clinicalRelevance: "'C3, 4, 5 keeps the diaphragm alive.' High spinal cord trauma causes respiratory arrest.",
      },
    ],
  },
};

/**
 * Searches and returns relationship profile for a given structure ID or name
 */
export function getAnatomicalRelationships(structureKey: string): StructureRelationshipProfile | null {
  const normalized = structureKey.toLowerCase().trim().replace(/[\s-]+/g, "_");
  
  if (ANATOMICAL_RELATIONSHIPS_DATA[normalized]) {
    return ANATOMICAL_RELATIONSHIPS_DATA[normalized];
  }

  // Fallback: check substrings (e.g. "heart" in "left_atrium")
  for (const [key, profile] of Object.entries(ANATOMICAL_RELATIONSHIPS_DATA)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return profile;
    }
  }

  return null;
}

