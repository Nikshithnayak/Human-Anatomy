/**
 * Data structures and ontologies for external models:
 * 1. Hierarchical-Temporal-BP-Seg (MIT License) - 8 Brachial Plexus ultrasound structures
 * 2. TotalSegmentator v2 (Apache 2.0) - 117 CT/MR whole-body structures
 * 3. NeuroAxis (MIT License) - Brainstem & Cranial Nerves
 */

export const BRACHIAL_PLEXUS_CLASSES = [
  {
    id: "C5",
    name: "C5 Spinal Nerve Root",
    color: "#38bdf8",
    threeJsConceptId: "bp_root_c5",
    spinalLevel: "C4-C5 Intervertebral Foramen",
    coordinates3D: [0.08, 1.48, -0.02],
    description: "Exits superior to C5 vertebra, travels between anterior and middle scalene muscles.",
    clinicalPathology: "Upper trunk injury (Erb-Duchenne palsy). Weakness in deltoid, supraspinatus, and biceps brachii."
  },
  {
    id: "C6",
    name: "C6 Spinal Nerve Root",
    color: "#4ade80",
    threeJsConceptId: "bp_root_c6",
    spinalLevel: "C5-C6 Intervertebral Foramen",
    coordinates3D: [0.09, 1.45, -0.02],
    description: "Joins C5 in the interscalene space to form the upper trunk.",
    clinicalPathology: "Loss of brachioradialis reflex, impaired sensation along lateral forearm and thumb."
  },
  {
    id: "C7",
    name: "C7 Spinal Nerve Root",
    color: "#facc15",
    threeJsConceptId: "bp_root_c7",
    spinalLevel: "C6-C7 Intervertebral Foramen",
    coordinates3D: [0.10, 1.42, -0.02],
    description: "Continues independently as the middle trunk across the posterior cervical triangle.",
    clinicalPathology: "Weakness of triceps, wrist drop, sensory loss of the middle finger."
  },
  {
    id: "C8",
    name: "C8 Spinal Nerve Root",
    color: "#f97316",
    threeJsConceptId: "bp_root_c8",
    spinalLevel: "C7-T1 Intervertebral Foramen",
    coordinates3D: [0.11, 1.39, -0.02],
    description: "Exits below C7, converges with T1 to form the lower trunk behind the subclavian artery.",
    clinicalPathology: "Impaired intrinsic hand muscles, finger flexors, hypothenar sensory loss."
  },
  {
    id: "UT",
    name: "Upper Trunk (Brachial Plexus)",
    color: "#818cf8",
    threeJsConceptId: "bp_trunk_upper",
    spinalLevel: "Lateral Border of Scalenus Medius",
    coordinates3D: [0.12, 1.43, -0.01],
    description: "Confluence of C5 and C6 roots. Classical site of Erb's point and interscalene regional anesthesia.",
    clinicalPathology: "Classic 'waiter's tip' deformity resulting from traction during birth or shoulder trauma."
  },
  {
    id: "MT",
    name: "Middle Trunk (Brachial Plexus)",
    color: "#a855f7",
    threeJsConceptId: "bp_trunk_middle",
    spinalLevel: "Supraclavicular Fossa",
    coordinates3D: [0.13, 1.40, -0.01],
    description: "Direct anatomical continuation of C7 root.",
    clinicalPathology: "Middle trunk syndrome: isolated triceps and finger extensor paresis."
  },
  {
    id: "LT",
    name: "Lower Trunk (Brachial Plexus)",
    color: "#ec4899",
    threeJsConceptId: "bp_trunk_lower",
    spinalLevel: "First Rib / Posterior to Subclavian Artery",
    coordinates3D: [0.14, 1.37, -0.01],
    description: "Union of C8 and T1 roots resting on the cervical dome of the pleura and first rib.",
    clinicalPathology: "Klumpke palsy (claw hand), often accompanied by Horner syndrome due to sympathetic trunk proximity."
  },
  {
    id: "SSN",
    name: "Suprascapular Nerve",
    color: "#06b6d4",
    threeJsConceptId: "bp_nerve_suprascapular",
    spinalLevel: "Branch of Upper Trunk",
    coordinates3D: [0.15, 1.41, -0.03],
    description: "Passes laterally across the posterior triangle into the supraspinous fossa.",
    clinicalPathology: "Entrapment at the suprascapular notch causing isolated wasting of supraspinatus/infraspinatus."
  }
];

export const TOTALSEGMENTATOR_STRUCTURES = [
  // Organs
  { id: "spleen", category: "organ", name: "Spleen", system: "lymphatic" },
  { id: "kidney_right", category: "organ", name: "Right Kidney", system: "urinary" },
  { id: "kidney_left", category: "organ", name: "Left Kidney", system: "urinary" },
  { id: "gallbladder", category: "organ", name: "Gallbladder", system: "digestive" },
  { id: "liver", category: "organ", name: "Liver", system: "digestive" },
  { id: "stomach", category: "organ", name: "Stomach", system: "digestive" },
  { id: "pancreas", category: "organ", name: "Pancreas", system: "digestive" },
  { id: "adrenal_gland_right", category: "organ", name: "Right Adrenal Gland", system: "endocrine" },
  { id: "adrenal_gland_left", category: "organ", name: "Left Adrenal Gland", system: "endocrine" },
  { id: "heart", category: "organ", name: "Heart (Myocardium & Chambers)", system: "cardiac" },
  { id: "lung_upper_lobe_left", category: "organ", name: "Left Lung Upper Lobe", system: "respiratory" },
  { id: "lung_lower_lobe_left", category: "organ", name: "Left Lung Lower Lobe", system: "respiratory" },
  { id: "lung_upper_lobe_right", category: "organ", name: "Right Lung Upper Lobe", system: "respiratory" },
  { id: "lung_middle_lobe_right", category: "organ", name: "Right Lung Middle Lobe", system: "respiratory" },
  { id: "lung_lower_lobe_right", category: "organ", name: "Right Lung Lower Lobe", system: "respiratory" },
  { id: "esophagus", category: "organ", name: "Esophagus", system: "digestive" },
  { id: "trachea", category: "organ", name: "Trachea", system: "respiratory" },
  { id: "urinary_bladder", category: "organ", name: "Urinary Bladder", system: "urinary" },
  { id: "prostate", category: "organ", name: "Prostate", system: "reproductive" },
  { id: "small_bowel", category: "organ", name: "Small Bowel", system: "digestive" },
  { id: "duodenum", category: "organ", name: "Duodenum", system: "digestive" },
  { id: "colon", category: "organ", name: "Colon", system: "digestive" },
  // Vasculature
  { id: "aorta", category: "vessel", name: "Aorta", system: "arterial" },
  { id: "pulmonary_artery", category: "vessel", name: "Pulmonary Artery", system: "arterial" },
  { id: "inferior_vena_cava", category: "vessel", name: "Inferior Vena Cava", system: "venous" },
  { id: "portal_vein_and_splenic_vein", category: "vessel", name: "Portal & Splenic Veins", system: "venous" },
  { id: "iliac_artery_left", category: "vessel", name: "Left Common Iliac Artery", system: "arterial" },
  { id: "iliac_artery_right", category: "vessel", name: "Right Common Iliac Artery", system: "arterial" },
  { id: "iliac_vena_left", category: "vessel", name: "Left Common Iliac Vein", system: "venous" },
  { id: "iliac_vena_right", category: "vessel", name: "Right Common Iliac Vein", system: "venous" },
  // Spine (C1-C7, T1-T12, L1-L5, Sacrum)
  { id: "vertebrae_C1", category: "vertebra", name: "Atlas (C1)", system: "skeletal" },
  { id: "vertebrae_C2", category: "vertebra", name: "Axis (C2)", system: "skeletal" },
  { id: "vertebrae_C3", category: "vertebra", name: "C3 Vertebra", system: "skeletal" },
  { id: "vertebrae_C4", category: "vertebra", name: "C4 Vertebra", system: "skeletal" },
  { id: "vertebrae_C5", category: "vertebra", name: "C5 Vertebra", system: "skeletal" },
  { id: "vertebrae_C6", category: "vertebra", name: "C6 Vertebra", system: "skeletal" },
  { id: "vertebrae_C7", category: "vertebra", name: "C7 Vertebra", system: "skeletal" },
  { id: "vertebrae_T1", category: "vertebra", name: "T1 Vertebra", system: "skeletal" },
  { id: "vertebrae_T2", category: "vertebra", name: "T2 Vertebra", system: "skeletal" },
  { id: "vertebrae_T3", category: "vertebra", name: "T3 Vertebra", system: "skeletal" },
  { id: "vertebrae_T4", category: "vertebra", name: "T4 Vertebra", system: "skeletal" },
  { id: "vertebrae_T5", category: "vertebra", name: "T5 Vertebra", system: "skeletal" },
  { id: "vertebrae_T6", category: "vertebra", name: "T6 Vertebra", system: "skeletal" },
  { id: "vertebrae_T7", category: "vertebra", name: "T7 Vertebra", system: "skeletal" },
  { id: "vertebrae_T8", category: "vertebra", name: "T8 Vertebra", system: "skeletal" },
  { id: "vertebrae_T9", category: "vertebra", name: "T9 Vertebra", system: "skeletal" },
  { id: "vertebrae_T10", category: "vertebra", name: "T10 Vertebra", system: "skeletal" },
  { id: "vertebrae_T11", category: "vertebra", name: "T11 Vertebra", system: "skeletal" },
  { id: "vertebrae_T12", category: "vertebra", name: "T12 Vertebra", system: "skeletal" },
  { id: "vertebrae_L1", category: "vertebra", name: "L1 Vertebra", system: "skeletal" },
  { id: "vertebrae_L2", category: "vertebra", name: "L2 Vertebra", system: "skeletal" },
  { id: "vertebrae_L3", category: "vertebra", name: "L3 Vertebra", system: "skeletal" },
  { id: "vertebrae_L4", category: "vertebra", name: "L4 Vertebra", system: "skeletal" },
  { id: "vertebrae_L5", category: "vertebra", name: "L5 Vertebra", system: "skeletal" },
  { id: "vertebrae_S1", category: "vertebra", name: "Sacrum (S1)", system: "skeletal" },
  // Ribs (1-12 left and right)
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `rib_left_${i + 1}`,
    category: "rib",
    name: `Left Rib ${i + 1}`,
    system: "skeletal",
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `rib_right_${i + 1}`,
    category: "rib",
    name: `Right Rib ${i + 1}`,
    system: "skeletal",
  })),
  // Appendicular skeleton
  { id: "humerus_left", category: "bone", name: "Left Humerus", system: "skeletal" },
  { id: "humerus_right", category: "bone", name: "Right Humerus", system: "skeletal" },
  { id: "scapula_left", category: "bone", name: "Left Scapula", system: "skeletal" },
  { id: "scapula_right", category: "bone", name: "Right Scapula", system: "skeletal" },
  { id: "clavicula_left", category: "bone", name: "Left Clavicle", system: "skeletal" },
  { id: "clavicula_right", category: "bone", name: "Right Clavicle", system: "skeletal" },
  { id: "femur_left", category: "bone", name: "Left Femur", system: "skeletal" },
  { id: "femur_right", category: "bone", name: "Right Femur", system: "skeletal" },
  { id: "hip_left", category: "bone", name: "Left Hip (Pelvis)", system: "skeletal" },
  { id: "hip_right", category: "bone", name: "Right Hip (Pelvis)", system: "skeletal" },
];
