# Third-Party Open-Source Licenses & Attribution

**Project:** Anatomy Atelier & 3D Human Atlas  
**Compliance Standard:** Open-Source Academic & Research Attribution Guidelines  
**Date:** October 2026  

This document provides formal legal attribution, repository URLs, author credits, and license summaries for all open-source projects, machine learning models, and anatomical reference datasets evaluated and utilized within Anatomy Atelier.

---

## 1. Hierarchical-Temporal-BP-Seg
- **Repository URL:** `https://github.com/nistring/Hierarchical-Temporal-BP-Seg`
- **Authors / Research Group:** Donghyeon Baek, Inha University / SUIT Consortium (2024)
- **Code License:** MIT License
- **Model License:** MIT License (Pretrained checkpoints in `lightning_logs/seq50/checkpoints/last.ckpt`)
- **Dataset Attribution:** SUIT Brachial Plexus Ultrasound Dataset
- **Attribution Statement:**
  > "Copyright (c) 2024 Baek-Donghyeon. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files..."
- **Exact Component Used in Anatomy Atelier:**
  - Network architecture specification: `MixVisionTransformerEncoder (mit_b0)` + `ConvLSTM` temporal cells + `SegformerDecoder`.
  - Class ontology mapping: 8 ultrasound structures (`C5`, `C6`, `C7`, `C8` nerve roots, `UT` Upper Trunk, `MT` Middle Trunk, `LT` Lower Trunk, `SSN` Suprascapular Nerve).
  - Integration in **Feature 5: Nerve Explorer** correlating ultrasound frames with 3D cervical spine and brachial plexus atlas geometry.

---

## 2. OHIF Viewers (Open Health Imaging Foundation)
- **Repository URL:** `https://github.com/OHIF/Viewers.git`
- **Local Submodule Path:** `external/ohif`
- **Authors / Organization:** Open Health Imaging Foundation (OHIF) / Massachusetts General Hospital / Radical Imaging
- **Code License:** MIT License
- **Attribution Statement:**
  > "Copyright (c) 2018 Open Health Imaging Foundation. Licensed under the MIT License."
- **Exact Component Used in Anatomy Atelier:**
  - Embedded `dicom-parser@1.8.21` and `dcmjs@0.52.0` packages, OHIF 2×2 Quad MPR Hanging Protocols, calibrated Length/Angle/Elliptical ROI tools, HU Pixel Probe, DICOMweb QIDO-RS query browser, and TID-1500 Structured Report JSON export inside **Radiology Lab**.

---

## 11. Z-Anatomy 3D Atlas (`nqwrc/3d-anatomy`)
- **Repository URL:** `https://github.com/nqwrc/3d-anatomy.git`
- **Local Submodule Path:** `external/3d-anatomy` (runtime assets synced under `public/z-anatomy/`)
- **Code & Assets License:** CC BY-NC-SA 4.0 (incorporating BodyParts3D CC-BY-SA 2.1 Japan, Z-Anatomy CC-BY-SA 4.0, Inner Ear CC-BY-NC-SA 4.0, Kidney CC-BY-NC 4.0, and Wikipedia definitions CC BY-SA 3.0 / GFDL)
- **Required Attributions:**
  > "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan"
  > "Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0"
- **Exact Component Used in Anatomy Atelier:**
  - 2,827 anatomical structures across 7 Draco GLB systems (`skeletal`, `joints`, `muscular`, `cardiovascular`, `lymphatic`, `nervous`, `visceral`) with `three-mesh-bvh` raycasting, Terminologia Anatomica Latin lexicon, clinical definitions, containment tree, and superficial-to-deep depth peel slider inside **Human Atlas**.

---

## 3. TotalSegmentator
- **Repository URL:** `https://github.com/wasserth/TotalSegmentator`
- **Authors / Institution:** Jakob Wasserth et al., Department of Research and Analysis, University Hospital Basel
- **Code License:** Apache License 2.0 (Code base); Academic/Research License for weights
- **Attribution Statement:**
  > "Wasserth, J., et al. (2023). TotalSegmentator: Robust Segmentation of 104 Anatomical Structures in CT Images. Radiology: Artificial Intelligence, 5(5), e230024."
- **Exact Component Used in Anatomy Atelier:**
  - 117 anatomical structure taxonomy (vertebrae C1–L5, thoracic/abdominal visceral organs, major vasculature).
  - Whole-body CT/MRI reference structure mapping in **Feature 3: Whole-Body Anatomical Segmentation Bridge**.
  - **Medical Safety Disclaimer:** Peripheral nerves are not included in TotalSegmentator's class inventory and are strictly not claimed as TotalSegmentator outputs.

---

## 4. NeuroAxis 3D Brainstem Atlas
- **Repository URL:** `https://github.com/linkbag/neuroaxis-atlas`
- **Authors / Organization:** NeuroAxis Contributors (2026)
- **Code License:** MIT License
- **Attribution Statement:**
  > "Copyright (c) 2026 NeuroAxis contributors. Licensed under the MIT License."
- **Exact Component Used in Anatomy Atelier:**
  - Neuroanatomical pathway taxonomy: Cranial Nerves I–XII, corticospinal tract, spinothalamic tract, medial lemniscus.
  - Brainstem stroke syndrome definitions: Wallenberg syndrome (lateral medullary), Weber syndrome, Millard-Gubler syndrome.
  - Cross-sectional levels and nuclei geometry integration in **Feature 6: Neuroanatomy Explorer Mode**.

---

## 5. MedSAM2 (Segment Anything in 3D Medical Images and Videos)
- **Repository URL:** `https://github.com/bowang-lab/MedSAM2`
- **Authors / Institution:** Bo Wang Lab, University of Toronto, Peter Munk Cardiac Centre
- **Code License:** Apache License 2.0
- **Model License:** Apache License 2.0 (Hugging Face `wanglab/MedSAM2`)
- **Attribution Statement:**
  > "Wang Lab (2025). MedSAM2: Segment Anything in 3D Medical Images and Videos. arXiv:2504.03600."
- **Exact Component Used in Anatomy Atelier:**
  - Standardized promptable bounding box / click interaction protocol for medical slice segmentation in **Feature 2: AI Segmentation Service Bridge**.

---

## 6. MONAI Label (Project MONAI)
- **Repository URL:** `https://github.com/Project-MONAI/MONAILabel`
- **Authors / Organization:** MONAI Consortium / NVIDIA / King's College London
- **Code License:** Apache License 2.0
- **Attribution Statement:**
  > "Copyright (c) MONAI Consortium. Licensed under the Apache License, Version 2.0."
- **Exact Component Used in Anatomy Atelier:**
  - Server-client active learning architecture specifications and RESTful annotation session definitions.

---

## 7. Open Anatomy Atlas
- **Repository URL:** `https://github.com/CognitionLabSNUC/open-anatomy-atlas`
- **Authors / Institution:** Cognition Lab, Shiv Nadar University Chennai & Open Anatomy Atlas contributors (2026)
- **Code License:** MIT License
- **Data Source License:** BodyParts3D (CC BY-SA 2.1 Japan) & Z-Anatomy (CC BY-SA 4.0)
- **Attribution Statement:**
  > "Copyright (c) 2026 Cognition Lab, Shiv Nadar University Chennai, and Open Anatomy Atlas contributors."
- **Exact Component Used in Anatomy Atelier:**
  - Anatomical ontology reference (systemic and regional grouping) in **Feature 9: Anatomical Reference Standardization**.

---

## 8. DejaVu (Surgical Gesture Rehearsal)
- **Repository URL:** `https://github.com/rouge1616/DejaVu`
- **Authors / Institution:** Rouge et al., Inria / HAL Science (2024)
- **Code License:** Open Research License
- **Attribution Statement:**
  > "Rouge, R., et al. (2024). DejaVu: Intra-operative simulation for surgical gesture rehearsal."
- **Exact Component Used in Anatomy Atelier:**
  - Documented as an educational reference for soft-tissue deformation parameters and surgical grasping workflows.

---

## 9. SlicerSOFA
- **Repository URL:** `https://github.com/Slicer/SlicerSOFA`
- **Authors / Institution:** Oslo University Hospital / 3D Slicer Community (2024)
- **Code License:** MIT License
- **Attribution Statement:**
  > "Copyright (c) 2024 Oslo University Hospital. Licensed under the MIT License."
- **Exact Component Used in Anatomy Atelier:**
  - Reference architecture for connecting anatomical segmentations to finite-element simulation environments.

---

## 10. SOFA Framework
- **Repository URL:** `https://github.com/sofa-framework/sofa`
- **Authors / Organization:** SOFA Consortium / Inria
- **Code License:** GNU Lesser General Public License (LGPL v2.1 / v3)
- **Attribution Statement:**
  > "SOFA Framework: Simulation Open Framework Architecture. (LGPL)."
- **Exact Component Used in Anatomy Atelier:**
  - Reference only; isolated in `external/sofa` as a future research extension.

---

## Regulatory and Medical Safety Notice

> **IMPORTANT DISCLAIMER:**
> Anatomy Atelier, along with all included models, segmentations, and educational workflows, is strictly intended for **educational, academic, and research purposes only**. It does not constitute a certified medical device and must never be used for primary diagnostic interpretation, treatment planning, or clinical patient care. All AI inferences are categorized as **AI-Assisted Educational Demonstrations**.
