import type { OrganId } from "@/app/lib/anatomy-data";

export interface LessonSection {
  title: string;
  content: string;
  pearl?: string;
  structures?: string[];
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  system: string;
  organId?: OrganId;
  structureTarget?: string;
  difficulty: "Fundamentals" | "Intermediate" | "Advanced Medical";
  estimatedMinutes: number;
  badge: string;
  accent: string;
  overview: string;
  isCompleted?: boolean;
  sections: LessonSection[];
  checkpoints: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  vignette?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  system: string;
  organId?: OrganId;
  structureId?: string;
  difficulty: "Beginner" | "Intermediate" | "Board Review";
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  system: string;
  icon: string;
  accent: string;
  questionsCount: number;
  difficulty: "Beginner" | "Intermediate" | "Board Review";
  questions: QuizQuestion[];
}

export interface UserNote {
  id: string;
  title: string;
  content: string;
  organId?: OrganId;
  structureId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkItem {
  id: string;
  targetId: string;
  targetType: "organ" | "structure";
  name: string;
  system?: string;
  savedAt: string;
}

// In-memory runtime persistence with seed data
export const LESSONS: Lesson[] = [
  {
    id: "lesson-cardiac-conduction",
    slug: "cardiac-conduction-system",
    title: "The Cardiac Conduction System & Rhythm",
    subtitle: "From Sinoatrial Node to Purkinje Fibers",
    system: "Cardiovascular",
    organId: "heart",
    structureTarget: "heart",
    difficulty: "Intermediate",
    estimatedMinutes: 8,
    badge: "Cardiology",
    accent: "#eb7c6b",
    overview:
      "Understand the electrical wiring of the human heart, tracing action potential initiation at the SA node through the AV node, Bundle of His, and Purkinje network, and how clinical arrhythmias develop.",
    sections: [
      {
        title: "1. The Primary Pacemaker: Sinoatrial (SA) Node",
        content:
          "Located at the junction of the superior vena cava and the right atrium, the SA node consists of specialized pacemaker myocytes displaying automaticity due to funny sodium (If) channels. It drives normal sinus rhythm at 60–100 beats per minute.",
        pearl:
          "The SA node is primarily supplied by the Sinoatrial Nodal Artery, which originates from the Right Coronary Artery (RCA) in approximately 60% of individuals, and the Left Circumflex Artery (LCx) in 40%.",
        structures: ["Sinoatrial node", "Right atrium", "Superior vena cava"],
      },
      {
        title: "2. The Atrioventricular (AV) Node & Physiological Delay",
        content:
          "Situated in Koch's triangle in the posteroinferior right atrium, the AV node introduces a critical 0.1-second delay in electrical conduction. This delay ensures the atria fully empty their blood volume into the ventricles (atrial kick) before ventricular systole begins.",
        pearl:
          "Damage to the AV node (e.g., from inferior myocardial infarction compromising the AV nodal artery from the RCA) can produce second- or third-degree heart block requiring a permanent pacemaker.",
        structures: ["Atrioventricular node", "Right ventricle", "Tricuspid valve"],
      },
      {
        title: "3. Bundle of His, Bundle Branches & Purkinje Network",
        content:
          "The electrical wavefront traverses the central fibrous skeleton of the heart via the Bundle of His, bifurcating into the Right and Left Bundle Branches. The left branch further divides into anterior and posterior fascicles, terminating in the subendocardial Purkinje arborization that conducts rapidly at 2–4 m/s.",
        pearl:
          "Rapid Purkinje conduction ensures apex-to-base ventricular depolarization, wringing the ventricles upward toward the aortic and pulmonary outflow tracts for optimal ejection fraction.",
        structures: ["Interventricular septum", "Left ventricle", "Aortic valve"],
      },
    ],
    checkpoints: [
      {
        question: "Why is the 0.10-second delay introduced at the AV node physiologically vital?",
        options: [
          "To allow the coronary arteries to fill during systole",
          "To enable complete atrial emptying into ventricles before ventricular contraction",
          "To prevent retrograde electrical flow to the SA node",
          "To reduce oxygen consumption by the Bundle of His",
        ],
        correctIndex: 1,
        explanation:
          "The physiological AV nodal delay allows ventricular filling to finish ('atrial booster kick') prior to ventricular contraction, preserving cardiac output.",
      },
      {
        question: "Which coronary vessel supplies the SA node in ~60% of the population?",
        options: [
          "Left Anterior Descending (LAD) artery",
          "Right Coronary Artery (RCA)",
          "Left Circumflex (LCx) artery",
          "Posterior Descending Artery (PDA)",
        ],
        correctIndex: 1,
        explanation:
          "The SA nodal artery arises from the proximal RCA in approximately 60% of people, making inferior RCA infarcts frequently associated with sinus bradycardia.",
      },
    ],
  },
  {
    id: "lesson-circle-of-willis",
    slug: "cerebral-circulation-circle-of-willis",
    title: "Cerebral Circulation & The Circle of Willis",
    subtitle: "Arterial Anastomosis & Stroke Localization",
    system: "Nervous",
    organId: "brain",
    structureTarget: "brain",
    difficulty: "Advanced Medical",
    estimatedMinutes: 10,
    badge: "Neurology",
    accent: "#8d6bcc",
    overview:
      "Explore the arterial polygonal network at the skull base that provides collateral cerebral perfusion, connecting the anterior carotid and posterior vertebrobasilar systems.",
    sections: [
      {
        title: "1. Architecture of the Circle of Willis",
        content:
          "Formed along the ventral surface of the brainstem and optic chiasm, the Circle of Willis connects the internal carotid arteries (ICAs) and vertebrobasilar circulation via the Anterior Communicating Artery (ACom) and paired Posterior Communicating Arteries (PCom).",
        pearl:
          "Only about 20–25% of individuals have a completely symmetric, classical Circle of Willis. Variations like hypoplastic PCom or A1 segments are extremely common.",
        structures: ["Internal carotid artery", "Anterior cerebral artery", "Basilar artery"],
      },
      {
        title: "2. Vascular Territories: ACA, MCA, and PCA",
        content:
          "The Anterior Cerebral Artery (ACA) supplies the medial frontal and parietal lobes (motor and sensory control of the contralateral lower extremity). The Middle Cerebral Artery (MCA) supplies the lateral convexity (face and arm motor/sensory homunculus, Broca's and Wernicke's speech areas). The Posterior Cerebral Artery (PCA) supplies the occipital lobe and visual cortex.",
        pearl:
          "An MCA stroke typically causes contralateral hemiparesis and hemisensory loss predominantly sparing the leg, plus aphasia if involving the dominant hemisphere (typically left).",
        structures: ["Frontal lobe", "Parietal lobe", "Occipital lobe"],
      },
      {
        title: "3. Clinical Pathology: Aneurysms & Subarachnoid Hemorrhage",
        content:
          "Saccular (berry) aneurysms characteristically arise at branch points in the Circle of Willis, with the Anterior Communicating Artery (ACom) being the single most common site (~30–35%), followed by the ICA-PCom junction.",
        pearl:
          "An expanding PCom aneurysm can compress Cranial Nerve III (Oculomotor), presenting with sudden ipsilateral ptosis, a 'down-and-out' pupil, and mydriasis (blown pupil).",
        structures: ["Oculomotor nerve", "Optic chiasm", "Temporal lobe"],
      },
    ],
    checkpoints: [
      {
        question: "A patient presents with contralateral lower extremity weakness and sensory loss. Which cerebral artery is most likely occluded?",
        options: [
          "Middle Cerebral Artery (MCA)",
          "Anterior Cerebral Artery (ACA)",
          "Posterior Cerebral Artery (PCA)",
          "Superior Cerebellar Artery (SCA)",
        ],
        correctIndex: 1,
        explanation:
          "The ACA irrigates the medial hemispheric surface corresponding to the motor and sensory homunculus for the contralateral leg and foot.",
      },
      {
        question: "Compression of which cranial nerve by a Posterior Communicating (PCom) aneurysm causes ptosis and a dilated pupil?",
        options: ["CN II (Optic)", "CN III (Oculomotor)", "CN IV (Trochlear)", "CN VI (Abducens)"],
        correctIndex: 1,
        explanation:
          "The Oculomotor nerve (CN III) travels adjacent to the PCom artery. Parasympathetic pupilloconstrictor fibers ride on its periphery, causing early mydriasis when compressed.",
      },
    ],
  },
  {
    id: "lesson-respiratory-mechanics",
    slug: "pulmonary-mechanics-gas-exchange",
    title: "Pulmonary Mechanics & Alveolar Gas Exchange",
    subtitle: "Ventilation, Surfactant, and the Blood-Air Barrier",
    system: "Respiratory",
    organId: "lungs",
    structureTarget: "lungs",
    difficulty: "Fundamentals",
    estimatedMinutes: 7,
    badge: "Pulmonology",
    accent: "#769d74",
    overview:
      "Uncover how negative intrapleural pressures draw air through the bronchial tree down to 300 million alveoli, where oxygen and carbon dioxide diffuse across a 0.5-micrometer barrier.",
    sections: [
      {
        title: "1. The Thoracic Pump & Diaphragm Dynamics",
        content:
          "Inspiration is an active process driven by diaphragm contraction (phrenic nerve C3–C5), which flattens downward and expands the thoracic cavity vertically. External intercostal muscles elevate the ribs in a 'bucket-handle' and 'pump-handle' motion, dropping pleural pressure from -5 to -8 cm H2O.",
        pearl:
          "'C3, 4, 5 keeps the diaphragm alive.' Spinal cord injuries above C3 cause respiratory arrest requiring immediate mechanical ventilation.",
        structures: ["Diaphragm", "Lungs", "Trachea"],
      },
      {
        title: "2. The Alveolar Architecture & Surfactant",
        content:
          "Type I pneumocytes cover 95% of alveolar surface area and are specialized for passive gas diffusion. Type II pneumocytes secrete pulmonary surfactant (dipalmitoylphosphatidylcholine), which reduces surface tension according to the Law of Laplace (P = 2T/r), preventing small alveoli from collapsing at end-expiration.",
        pearl:
          "Infant Respiratory Distress Syndrome (NRDS) in premature infants results from immature Type II pneumocytes and surfactant deficiency, causing diffuse microatelectasis.",
        structures: ["Bronchus", "Left lung", "Right lung"],
      },
      {
        title: "3. The Blood-Air Diffusion Barrier",
        content:
          "Oxygen diffuses from alveolar air through surfactant, Type I pneumocyte epithelium, the fused basement membrane, capillary endothelial cell, and blood plasma into erythrocytes, binding hemoglobin in under 0.25 seconds.",
        pearl:
          "In pulmonary fibrosis or edema, the thickened interstitial barrier impairs gas transfer, resulting in exertional hypoxemia before hypercapnia because CO2 diffuses 20 times faster than O2.",
        structures: ["Pulmonary artery", "Pulmonary veins", "Alveoli"],
      },
    ],
    checkpoints: [
      {
        question: "What is the primary physiological function of pulmonary surfactant produced by Type II pneumocytes?",
        options: [
          "To stimulate bronchial smooth muscle relaxation",
          "To reduce alveolar surface tension and prevent end-expiratory collapse",
          "To neutralize inhaled pathogens via IgA secretion",
          "To actively transport oxygen into the capillary lumen",
        ],
        correctIndex: 1,
        explanation:
          "Surfactant disrupts hydrogen bonding between water molecules on alveolar walls, lowering surface tension and preventing atelectasis (collapse).",
      },
    ],
  },
  {
    id: "lesson-renal-nephron",
    slug: "renal-nephron-countercurrent",
    title: "Renal Microanatomy & Countercurrent Multiplication",
    subtitle: "Glomerular Filtration and Urine Concentration",
    system: "Urinary",
    organId: "kidneys",
    structureTarget: "kidney",
    difficulty: "Advanced Medical",
    estimatedMinutes: 9,
    badge: "Nephrology",
    accent: "#d48d53",
    overview:
      "Journey through the 1 million nephrons per kidney, exploring ultrafiltration at the glomerulus, electrolyte handling along tubules, and the medullary osmotic gradient.",
    sections: [
      {
        title: "1. The Glomerular Filtration Barrier",
        content:
          "Composed of fenestrated endothelial cells (70–100 nm pores), the negatively charged glomerular basement membrane (heparan sulfate), and podocyte foot processes with slit diaphragms (nephrin). It filters 180 liters of plasma daily while completely excluding albumin and cells.",
        pearl:
          "Loss of negative charge on the glomerular basement membrane is the hallmark of Minimal Change Disease, resulting in massive selective proteinuria.",
        structures: ["Glomerulus", "Renal cortex", "Renal pelvis"],
      },
      {
        title: "2. The Loop of Henle & Countercurrent Mechanism",
        content:
          "The descending limb is permeable to water but impermeable to solutes, concentrating tubular fluid. The thick ascending limb actively pumps Na+-K+-2Cl- via the NKCC2 symporter (the target of loop diuretics like furosemide) into the medullary interstitium, impermeable to water.",
        pearl:
          "Vasa recta capillaries run in parallel with the Loop of Henle, serving as countercurrent exchangers that preserve the corticomedullary hyperosmolar gradient without washing out solutes.",
        structures: ["Renal medulla", "Ureter", "Renal vein"],
      },
    ],
    checkpoints: [
      {
        question: "Which nephron segment is the primary site of action for loop diuretics like furosemide?",
        options: [
          "Proximal Convoluted Tubule",
          "Descending Limb of Loop of Henle",
          "Thick Ascending Limb of Loop of Henle (NKCC2)",
          "Distal Convoluted Tubule (NCC)",
        ],
        correctIndex: 2,
        explanation:
          "Loop diuretics inhibit the Na+-K+-2Cl- cotransporter (NKCC2) in the thick ascending limb of the loop of Henle.",
      },
    ],
  },
  {
    id: "lesson-hepatic-portal",
    slug: "hepatic-microarchitecture-portal-system",
    title: "Hepatic Lobule Architecture & The Portal System",
    subtitle: "Kupffer Cells, Sinusoids, and Portal Triads",
    system: "Digestive",
    organId: "liver",
    structureTarget: "liver",
    difficulty: "Intermediate",
    estimatedMinutes: 8,
    badge: "Gastroenterology",
    accent: "#c45d4f",
    overview:
      "Understand the structural unit of the liver, the classic hexagonal lobule, blood flow from portal triads to the central vein, and bile canalicular drainage.",
    sections: [
      {
        title: "1. The Portal Triad & Dual Blood Supply",
        content:
          "The liver receives 75% of its blood from the Hepatic Portal Vein (nutrient-rich, deoxygenated blood from the gut) and 25% from the Hepatic Artery (oxygenated). Together with bile ducts, they form the portal triad entering at the porta hepatis.",
        pearl:
          "Portal hypertension in cirrhosis causes blood to shunt through portosystemic anastomoses, manifesting as esophageal varices, caput medusae, and anorectal varices.",
        structures: ["Hepatic portal vein", "Gallbladder", "Common bile duct"],
      },
      {
        title: "2. The Hepatic Acinus & Metabolic Zones",
        content:
          "Rappaport's acinus divides liver parenchyma into 3 metabolic zones: Zone 1 (periportal) receives highest oxygen and nutrient supply, resisting ischemia. Zone 3 (centrilobular, surrounding the central vein) has lowest oxygenation and highest CYP450 enzyme concentration, making it most vulnerable to acetaminophen toxicity and ischemic necrosis.",
        pearl:
          "Centrilobular necrosis (Zone 3) is classically observed in 'nutmeg liver' secondary to right-sided congestive heart failure and acetaminophen overdose.",
        structures: ["Hepatic vein", "Inferior vena cava", "Liver"],
      },
    ],
    checkpoints: [
      {
        question: "Which zone of the hepatic acinus is most susceptible to ischemic injury and acetaminophen toxicity?",
        options: ["Zone 1 (Periportal)", "Zone 2 (Mid-zonal)", "Zone 3 (Centrilobular)", "Space of Disse"],
        correctIndex: 2,
        explanation:
          "Zone 3 surrounds the central vein and is furthest from oxygenated arterial blood while having the highest CYP450 concentration, predisposing it to ischemic and toxic insult.",
      },
    ],
  },
];

export const QUIZZES: Quiz[] = [
  {
    id: "quiz-clinical-pathology",
    title: "Clinical Anatomy & Pathology Board Review",
    description: "High-yield multi-system clinical vignettes testing diagnosis, anatomical localization, and surgical anatomy.",
    system: "Multi-System",
    icon: "Stethoscope",
    accent: "#eb7c6b",
    questionsCount: 5,
    difficulty: "Board Review",
    questions: [
      {
        id: "q-1",
        vignette:
          "A 62-year-old male presents with acute crushing retrosternal chest pain and ST-segment elevations in leads II, III, and aVF. Coronary angiography confirms complete occlusion of the artery supplying the inferior wall of the left ventricle.",
        question: "Which coronary artery is most likely occluded?",
        options: [
          "Left Anterior Descending (LAD) artery",
          "Right Coronary Artery (RCA) or Posterior Descending Artery",
          "Left Circumflex Artery (LCx)",
          "Left Main Coronary Artery (LMCA)",
        ],
        correctIndex: 1,
        explanation:
          "Leads II, III, and aVF look at the inferior myocardial surface, supplied by the Posterior Descending Artery (PDA), which arises from the Right Coronary Artery (RCA) in ~85% of right-dominant individuals.",
        system: "Cardiovascular",
        organId: "heart",
        difficulty: "Board Review",
      },
      {
        id: "q-2",
        vignette:
          "A 24-year-old motorcyclist sustains a head strike with brief loss of consciousness, followed by a 2-hour 'lucid interval'. He then rapidly deteriorates into a coma with an ipsilateral dilated and fixed pupil. Non-contrast CT reveals a biconvex (lens-shaped) hyperdense extra-axial collection.",
        question: "Which intracranial vessel was ruptured, typically near the pterion?",
        options: [
          "Bridging cortical veins",
          "Middle Meningeal Artery",
          "Anterior Communicating Artery",
          "Internal Carotid Artery cavernous segment",
        ],
        correctIndex: 1,
        explanation:
          "An epidural hematoma with a classic lucid interval and lens-shaped CT appearance results from trauma to the pterion lacerating the Middle Meningeal Artery, a branch of the maxillary artery.",
        system: "Nervous",
        organId: "brain",
        difficulty: "Board Review",
      },
      {
        id: "q-3",
        vignette:
          "A 48-year-old female presents with severe right upper quadrant colicky pain radiating to her right scapula, triggered after consuming a fatty meal. Physical exam demonstrates arrest of inspiration on deep palpation of the right upper quadrant (Murphy's sign).",
        question: "Which anatomical structure is acutely inflamed?",
        options: ["Head of pancreas", "Gallbladder", "Duodenal bulb", "Appendix"],
        correctIndex: 1,
        explanation:
          "Acute cholecystitis produces a positive Murphy's sign and pain referred to the right shoulder/scapula via phrenic nerve afferents (C3–C5) irritating the diaphragmatic peritoneum.",
        system: "Digestive",
        organId: "liver",
        difficulty: "Intermediate",
      },
      {
        id: "q-4",
        vignette:
          "A 19-year-old college student presents with right lower quadrant abdominal tenderness maximal at McBurney's point (one-third the distance from the anterior superior iliac spine to the umbilicus), with rebound tenderness and guarding.",
        question: "The inflamed structure arises from which portion of the gastrointestinal tract?",
        options: ["Terminal ileum", "Cecum at the convergence of the teniae coli", "Sigmoid colon", "Hepatic flexure"],
        correctIndex: 1,
        explanation:
          "The vermiform appendix arises from the posteromedial wall of the cecum, approximately 2 cm below the ileocecal valve, where the three teniae coli converge.",
        system: "Digestive",
        organId: "intestine",
        difficulty: "Beginner",
      },
      {
        id: "q-5",
        vignette:
          "A 55-year-old chronic heavy smoker presents with progressive dyspnea and chronic cough. Spirometry demonstrates FEV1/FVC < 0.70. High-resolution CT shows permanent dilation and destruction of respiratory bronchioles and alveolar septa predominantly in the upper lobes.",
        question: "Which histopathological finding characterizes centriacinar emphysema?",
        options: [
          "Diffuse panacinar destruction from alpha-1 antitrypsin deficiency",
          "Destruction of alveolar walls and capillary surface area by neutrophil elastase",
          "Bronchial goblet cell metaplasia without alveolar involvement",
          "Caseating granulomas with Langhans giant cells",
        ],
        correctIndex: 1,
        explanation:
          "Smoking causes centriacinar emphysema where smoke stimulates alveolar macrophages and neutrophils to release elastase and matrix metalloproteinases, destroying elastic alveolar walls.",
        system: "Respiratory",
        organId: "lungs",
        difficulty: "Intermediate",
      },
    ],
  },
  {
    id: "quiz-3d-spotter",
    title: "3D Organ & Structure Spotter",
    description: "Rapid-fire visual identification questions testing anatomical knowledge of specific organ structures.",
    system: "Anatomy Spotter",
    icon: "Crosshair",
    accent: "#8d6bcc",
    questionsCount: 4,
    difficulty: "Intermediate",
    questions: [
      {
        id: "s-1",
        question: "Which heart chamber forms the anatomical apex of the heart and generates the systemic blood pressure?",
        options: ["Right Atrium", "Right Ventricle", "Left Atrium", "Left Ventricle"],
        correctIndex: 3,
        explanation:
          "The Left Ventricle forms the cardiac apex, situated in the 5th left intercostal space at the midclavicular line, and has walls approximately three times thicker than the right ventricle.",
        system: "Cardiovascular",
        organId: "heart",
        difficulty: "Beginner",
      },
      {
        id: "s-2",
        question: "Which cerebral structure bridges the left and right cerebral hemispheres, containing over 200 million axonal fibers?",
        options: ["Corpus Callosum", "Internal Capsule", "Fornix", "Basal Ganglia"],
        correctIndex: 0,
        explanation:
          "The Corpus Callosum is the largest commissural tract in the human brain, allowing interhemispheric communication and coordination.",
        system: "Nervous",
        organId: "brain",
        difficulty: "Beginner",
      },
      {
        id: "s-3",
        question: "The horizontal fissure of the lung is found exclusively in which lung?",
        options: ["Left Lung", "Right Lung", "Both Lungs equally", "Neither Lung"],
        correctIndex: 1,
        explanation:
          "The right lung has 3 lobes (superior, middle, inferior) separated by oblique and horizontal fissures. The left lung has 2 lobes separated by an oblique fissure.",
        system: "Respiratory",
        organId: "lungs",
        difficulty: "Beginner",
      },
      {
        id: "s-4",
        question: "Which organ produces both endocrine hormones (insulin, glucagon) and exocrine digestive enzymes (trypsinogen, lipase, amylase)?",
        options: ["Spleen", "Pancreas", "Gallbladder", "Kidney"],
        correctIndex: 1,
        explanation:
          "The Pancreas is a dual-function gland: Islets of Langerhans deliver hormones into the blood, while acinar cells deliver digestive juices into the duodenum via the pancreatic duct.",
        system: "Digestive",
        organId: "pancreas",
        difficulty: "Beginner",
      },
    ],
  },
];

// In-memory state for user progress and notes
class BackendStore {
  private notes: UserNote[] = [
    {
      id: "note-1",
      title: "Cardiac Conduction High Yield Points",
      content:
        "Remember: SA node supplied by RCA in 60%, LCx in 40%. AV node delay = 0.1s. Purkinje fibers have highest conduction velocity (4 m/s).",
      organId: "heart",
      tags: ["Cardio", "High-Yield", "Exam"],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "note-2",
      title: "Circle of Willis Aneurysm Rules",
      content:
        "ACom is #1 site of berry aneurysms (bitemporal hemianopsia risk). PCom #2 site (CN III palsy with pupil dilation).",
      organId: "brain",
      tags: ["Neuro", "Aneurysm", "CNIII"],
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  private bookmarks: BookmarkItem[] = [
    {
      id: "bm-1",
      targetId: "heart",
      targetType: "organ",
      name: "Heart",
      system: "Cardiovascular",
      savedAt: new Date().toISOString(),
    },
    {
      id: "bm-2",
      targetId: "brain",
      targetType: "organ",
      name: "Brain",
      system: "Nervous",
      savedAt: new Date().toISOString(),
    },
  ];

  private completedLessons = new Set<string>(["lesson-respiratory-mechanics"]);
  private quizScores: Record<string, { highScore: number; attempts: number; lastScore: number }> = {
    "quiz-3d-spotter": { highScore: 100, attempts: 2, lastScore: 100 },
  };

  getLessons() {
    return LESSONS.map((lesson) => ({
      ...lesson,
      isCompleted: this.completedLessons.has(lesson.id),
    }));
  }

  getLessonById(id: string) {
    const lesson = LESSONS.find((l) => l.id === id || l.slug === id);
    if (!lesson) return null;
    return {
      ...lesson,
      isCompleted: this.completedLessons.has(lesson.id),
    };
  }

  toggleLessonComplete(id: string) {
    if (this.completedLessons.has(id)) {
      this.completedLessons.delete(id);
      return false;
    } else {
      this.completedLessons.add(id);
      return true;
    }
  }

  getQuizzes() {
    return QUIZZES.map((quiz) => {
      const stat = this.quizScores[quiz.id] || { highScore: 0, attempts: 0, lastScore: 0 };
      return {
        ...quiz,
        ...stat,
      };
    });
  }

  getQuizById(id: string) {
    const quiz = QUIZZES.find((q) => q.id === id);
    if (!quiz) return null;
    const stat = this.quizScores[quiz.id] || { highScore: 0, attempts: 0, lastScore: 0 };
    return { ...quiz, ...stat };
  }

  recordQuizScore(quizId: string, score: number) {
    const current = this.quizScores[quizId] || { highScore: 0, attempts: 0, lastScore: 0 };
    this.quizScores[quizId] = {
      highScore: Math.max(current.highScore, score),
      attempts: current.attempts + 1,
      lastScore: score,
    };
    return this.quizScores[quizId];
  }

  getNotes() {
    return [...this.notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  addNote(title: string, content: string, organId?: OrganId, structureId?: string, tags: string[] = []) {
    const note: UserNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      content,
      organId,
      structureId,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.notes.unshift(note);
    return note;
  }

  updateNote(id: string, updates: { title?: string; content?: string; tags?: string[] }) {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return null;
    if (updates.title !== undefined) note.title = updates.title;
    if (updates.content !== undefined) note.content = updates.content;
    if (updates.tags !== undefined) note.tags = updates.tags;
    note.updatedAt = new Date().toISOString();
    return note;
  }

  deleteNote(id: string) {
    const index = this.notes.findIndex((n) => n.id === id);
    if (index !== -1) {
      this.notes.splice(index, 1);
      return true;
    }
    return false;
  }

  getBookmarks() {
    return [...this.bookmarks];
  }

  deleteBookmark(idOrTargetId: string) {
    const index = this.bookmarks.findIndex((b) => b.id === idOrTargetId || b.targetId === idOrTargetId);
    if (index !== -1) {
      this.bookmarks.splice(index, 1);
      return true;
    }
    return false;
  }

  toggleBookmark(targetId: string, targetType: "organ" | "structure", name: string, system?: string) {
    const index = this.bookmarks.findIndex((b) => b.targetId === targetId);
    if (index !== -1) {
      this.bookmarks.splice(index, 1);
      return { isBookmarked: false };
    } else {
      const item: BookmarkItem = {
        id: `bm-${Date.now()}`,
        targetId,
        targetType,
        name,
        system,
        savedAt: new Date().toISOString(),
      };
      this.bookmarks.unshift(item);
      return { isBookmarked: true, item };
    }
  }
}

// Singleton backend store across API requests
const globalStore = (globalThis as unknown as { __anatomyBackendStore?: BackendStore });
if (!globalStore.__anatomyBackendStore || typeof globalStore.__anatomyBackendStore.updateNote !== "function") {
  globalStore.__anatomyBackendStore = new BackendStore();
}
export const backendStore = globalStore.__anatomyBackendStore;
