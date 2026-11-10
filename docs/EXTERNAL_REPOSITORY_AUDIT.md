# External Repository Audit & Technical Feasibility Report

**Project:** Anatomy Atelier & 3D Human Atlas  
**Maintainer:** Nikshith Nayak  
**Status:** Technical Assessment of Reference & Integrated Repositories  

---

## Executive Summary & Target Architecture

Anatomy Atelier is a dedicated 3D spatial clinical reasoning learning system built on Next.js, React, and Three.js. This audit systematically investigates ten external open-source medical imaging, deep learning, and biomechanical simulation repositories cloned locally into `external/`.

### Classification Framework
- **Category A (Integrate):** Directly integrated into Anatomy Atelier as native features or direct bridges.
- **Category B (Prototype Separately):** Maintained as decoupled external Python microservices with standardized API contracts and client-side fallbacks.
- **Category C (Reference Only):** Consulted for anatomical taxonomy, clinical ontologies, and UI paradigms without code duplication.
- **Category D (Reject):** Excluded from frontend integration due to incompatibility, compilation weight, or excessive computational requirements.

```
                             ANATOMY ATELIER (Next.js + Three.js)
                                              |
               +------------------------------+------------------------------+
               |                                                             |
         CLINICAL CASES & REASONING                                   MEDICAL IMAGING CENTER
   - Patient Case Presentation                                  - DICOM Part 10 / DICOMweb loader
   - Spatial Query ("Show me where")                            - Multiplanar Reconstruction (MPR: Axial/Sag/Cor)
   - Anatomical Hypothesis Verification                         - Synchronized 3D Slice Intersect
   - Pedagogical Diagnostic Feedback                            - Measurement & Annotation Tools
               |                                                             |
               +------------------------------+------------------------------+
                                              |
                                     AI / SEGMENTATION
                                              |
               +------------------------------+------------------------------+
               |                              |                              |
         NERVE EXPLORER                WHOLE-BODY SCAN               PROMPTABLE 3D MASK
   Hierarchical-Temporal-BP-Seg        TotalSegmentator                   MedSAM2
   - Pretrained mit_b0 ConvLSTM        - 117 CT/MR Structures         - Bounding Box / Point Prompt
   - 8 Brachial Plexus Classes         - Vertebrae, Organs, Vessels   - Microservice API with Fallback
   - Interscalene Ultrasound Map       - Pre-computed Benchmarks                     |
               |                              |                                      |
               +------------------------------+--------------------------------------+
                                              |
                                              v
                              EXISTING 3D HUMAN ANATOMY ATLAS
                                              |
                        +---------------------+---------------------+
                        |                                           |
               NORMAL 3D REFERENCE                         PATIENT FINDING OVERLAY
         Canonical Three.js GLB Atlas                 Segmented Volumetric / Mesh Mask
         - C5-T1 Roots, Trunks, Cords                 - Correlated Lesion / Nerve Root
         - Neurovascular Bundles                      - Precise Anatomical Delta
                        |                                           |
                        +---------------------+---------------------+
                                              |
                                              v
                                  SPATIAL CLINICAL EXPLANATION
```

---

## Detailed Repository Assessments

---

### 1. OHIF/Viewers
* **Repository:** `https://github.com/OHIF/Viewers`
* **Local Location:** `external/ohif`
* **License:** MIT License (Open Health Imaging Foundation)
* **Actual Purpose:** Production-grade, zero-footprint web viewer for medical images (DICOM Part 10, DICOMweb, Cornerstone3D, VTK.js). Provides 2D cross-sectional viewing, Multi-Planar Reconstruction (MPR: Axial, Coronal, Sagittal), volume rendering, measurement annotations, and segmentation mask rendering (DICOM-SEG/RTSTRUCT).
* **Programming Language:** JavaScript / TypeScript (Node.js >= 24, pnpm monorepo).
* **Dependencies:** `@cornerstonejs/core`, `@cornerstonejs/tools`, `@cornerstonejs/dicom-image-loader`, `dcmjs`, `react`, `redux`.
* **GPU Requirements:** WebGL 2.0 / WebGPU client GPU acceleration for volume rendering and MPR.
* **Pretrained Weights:** N/A (Visualization and annotation framework).
* **Dataset Requirements:** DICOM files or DICOMweb endpoint (WADO-RS, QIDO-RS, STOW-RS).
* **Runnable on Machine:** Yes (requires Node >= 24 for full monorepo build).
* **Service/API Capability:** Exposes DICOMweb clients and standard embedded Cornerstone3D viewports.
* **Integration Difficulty:** Medium-High if building full 50-package monorepo inside Next.js; Low-Medium when integrating dedicated Cornerstone3D/DICOM imaging pipeline directly into Anatomy Atelier's UI.
* **Useful Anatomy Atelier Feature:** **Medical Imaging Center** — interactive DICOM loading, multi-frame playback, cross-sectional MPR slice rendering, measurement calipers, and synchronized 3D plane intersection with Anatomy Atelier's 3D atlas.
* **Recommendation:** **Category A (Integrate as Medical Imaging Center)**.

---

### 2. Hierarchical-Temporal-BP-Seg (Brachial Plexus Segmentation)
* **Repository:** `https://github.com/nistring/Hierarchical-Temporal-BP-Seg`
* **Local Location:** `external/brachial-plexus`
* **License:** MIT License (Baek-Donghyeon, 2024)
* **Actual Purpose:** High-precision temporal semantic segmentation of the **brachial plexus** and surrounding anatomical landmarks in dynamic ultrasound video sequences.
* **Supported Inputs:** 1-channel Grayscale B-mode ultrasound video or image sequence (standard shape: 1 × 1 × 416 × 416).
* **Outputs:** 8-class segmentation masks with temporal consistency:
  1. `C5` — C5 nerve root
  2. `C6` — C6 nerve root
  3. `C7` — C7 nerve root
  4. `C8` — C8 nerve root
  5. `UT` — Upper Trunk (C5 + C6 convergence)
  6. `MT` — Middle Trunk (C7 continuation)
  7. `LT` — Lower Trunk (C8 + T1 convergence)
  8. `SSN` — Suprascapular Nerve
* **Programming Language:** Python 3.10+ / PyTorch / PyTorch Lightning.
* **Dependencies:** `torch`, `torchvision`, `lightning`, `segmentation-models-pytorch`, `opencv-python`, `tqdm`, `pyyaml`.
* **GPU Requirements:** CPU runnable for single frame inference (~4.7M parameters); GPU (NVIDIA CUDA) recommended for real-time video stream.
* **Pretrained Weights:** **Pre-existing in repository!** Verified checkpoint file: `external/brachial-plexus/lightning_logs/seq50/checkpoints/last.ckpt` (75.7 MB, 4.7M parameters, MixVisionTransformer `mit_b0` + ConvLSTM + SegformerDecoder).
* **Dataset Requirements:** SUIT ultrasound dataset or standard B-mode ultrasound frames.
* **Runnable on Machine:** Yes. PyTorch can load the 75.7 MB checkpoint directly.
* **Service/API Capability:** Easily wrapped in lightweight FastAPI service or run via CLI runner script.
* **Integration Difficulty:** Low. Weights already present locally; deterministic mapping to Anatomy Atelier's 3D brachial plexus model.
* **Useful Anatomy Atelier Feature:** **Feature 5: Nerve Explorer** — ultrasound interscalene view with live/reference segmentation of C5–T1 roots and trunks mapped directly to 3D cervical spine & brachial plexus in Three.js.
* **Recommendation:** **Category A (Integrate - Primary AI Nerve Highlight)**.

---

### 3. TotalSegmentator
* **Repository:** `https://github.com/wasserth/TotalSegmentator`
* **Local Location:** `external/totalsegmentator`
* **License:** Apache 2.0 (University Hospital Basel).
* **Actual Purpose:** Robust whole-body anatomical segmentation for CT and MR volumes. Automatically segments 117 anatomical structures (bones, major organs, vasculature, vertebrae C1–L5, ribs, muscles).
* **Supported Inputs:** 3D CT or MR volumes in NIfTI format (`.nii.gz`) or DICOM directories.
* **Outputs:** Multilabel 3D segmentation NIfTI volumes or individual binary structure masks.
* **Programming Language:** Python 3.10+, PyTorch, nnUNet v2.
* **Dependencies:** `torch`, `nnunetv2`, `nibabel`, `scipy`, `numpy`, `tqdm`.
* **GPU Requirements:** NVIDIA GPU with >= 8 GB VRAM recommended; CPU mode supported via `--fast` flag with lower resolution.
* **Pretrained Weights:** Downloaded automatically on first CLI call from Zenodo repository.
* **Dataset Requirements:** Full-body or regional CT/MRI DICOM or NIfTI scans.
* **Runnable on Machine:** Yes via Python CLI / API.
* **Service/API Capability:** Wrappable as a background batch processing service.
* **Integration Difficulty:** Medium. Requires PyTorch and nnUNet runtime; execution takes 30s–3min per full scan.
* **Crucial Medical Safety Limitation:** **TotalSegmentator DOES NOT segment peripheral nerves.** It handles bones, vertebrae, ribs, visceral organs, and major blood vessels. It MUST NOT be claimed as a nerve segmentation tool.
* **Useful Anatomy Atelier Feature:** **Feature 3: Whole-Body Anatomical Segmentation Bridge** — provides reference segmentation masks for CT scans, mapping detected organs and vertebrae to Anatomy Atelier's 3D anatomy mesh IDs.
* **Recommendation:** **Category A (Integrate as Whole-Body Benchmark & Reference Mapping)**.

---

### 4. neuroaxis-atlas
* **Repository:** `https://github.com/linkbag/neuroaxis-atlas`
* **Local Location:** `external/neuroaxis`
* **License:** MIT License (NeuroAxis contributors, 2026).
* **Actual Purpose:** Interactive 3D Neuroanatomy Atlas focusing on the human brainstem, diencephalon, mesencephalon, rhombencephalon, cranial nerves, tracts, and brainstem stroke syndromes.
* **Supported Inputs:** Web browser interaction, 3D GLB mesh assets, structured clinical syndrome definitions.
* **Outputs:** Interactive 3D visualization, cross-sectional slices (axial, coronal, sagittal), tract pathways, stroke syndrome clinical correlations.
* **Programming Language:** TypeScript / React 18 / Three.js / React Three Fiber / Zustand.
* **Dependencies:** `@react-three/fiber`, `@react-three/drei`, `three`, `zustand`, `postprocessing`.
* **GPU Requirements:** Standard WebGL client.
* **Pretrained Weights:** N/A (Pure anatomical geometry & clinical knowledge base).
* **Dataset Requirements:** None (Bundled anatomical GLBs and curated clinical JSON taxonomies).
* **Runnable on Machine:** Yes, runs instantly in modern web browsers.
* **Service/API Capability:** Client-side anatomical data structures.
* **Integration Difficulty:** Low. Uses the exact same rendering stack (Three.js / WebGL) as Anatomy Atelier.
* **Useful Anatomy Atelier Feature:** **Feature 6: Neuroanatomy Explorer Mode** — adds brainstem nuclei, cranial nerve pathways (CN I–XII), ascending/descending tracts (corticospinal, spinothalamic), and clinical syndromes (Wallenberg lateral medullary syndrome, Weber syndrome, Millard-Gubler syndrome).
* **Recommendation:** **Category A (Integrate directly into Neuroanatomy Engine)**.

---

### 5. MedSAM2
* **Repository:** `https://github.com/bowang-lab/MedSAM2`
* **Local Location:** `external/medsam2`
* **License:** Apache 2.0 (Wang Lab, University of Toronto).
* **Actual Purpose:** Promptable 2D/3D segmentation foundation model for medical images and videos (Segment Anything Model 2 adapted for CT, MRI, Ultrasound, and Endoscopy).
* **Supported Inputs:** 2D slices, 3D CT/MRI volumes, video frames + User prompts (bounding box, positive/negative click points).
* **Outputs:** Binary segmentation masks of prompted target regions.
* **Programming Language:** Python 3.12, PyTorch 2.5.1.
* **Dependencies:** `torch`, `torchvision`, `sam2`, `numpy`, `gradio`, `opencv-python`.
* **GPU Requirements:** NVIDIA CUDA GPU with >= 12 GB VRAM strongly required for real-time SAM2 tensor operations.
* **Pretrained Weights:** HuggingFace repository (`MedSAM2_2411.pt`, `MedSAM2_latest.pt`, ~1.8 GB).
* **Dataset Requirements:** Any standard medical image (NIfTI, NPZ, PNG, MP4).
* **Runnable on Machine:** Requires external GPU instance or local CUDA setup with ~2 GB weights download.
* **Service/API Capability:** REST API service via FastAPI / Gradio.
* **Integration Difficulty:** High to run locally inside browser; Low as an external API bridge.
* **Useful Anatomy Atelier Feature:** **Feature 2: Promptable AI Segmentation Service** — allows clicking a region on a DICOM slice to generate a localized lesion or organ mask.
* **Recommendation:** **Category B (Prototype Separately / API Bridge with Fallback Mock)**.

---

### 6. Project-MONAI/MONAILabel
* **Repository:** `https://github.com/Project-MONAI/MONAILabel`
* **Local Location:** `external/monai-label`
* **License:** Apache 2.0 (MONAI Consortium).
* **Actual Purpose:** Intelligent server-client system for AI-assisted medical image annotation and continuous learning.
* **Supported Inputs:** 2D/3D DICOM, NIfTI, and active learning user corrections.
* **Outputs:** Segmentations, user-corrected annotations, model checkpoint updates.
* **Programming Language:** Python 3.10+, PyTorch, FastAPI, Uvicorn.
* **Dependencies:** `monai`, `torch`, `fastapi`, `uvicorn`, `simpleitk`, `pydantic`.
* **GPU Requirements:** Recommended for deep learning inference and active fine-tuning.
* **Pretrained Weights:** MONAI model zoo (deepedit, segmentation_spleen, lung, etc.).
* **Dataset Requirements:** Radiologic image repository.
* **Runnable on Machine:** Yes as a standalone background FastAPI server.
* **Service/API Capability:** First-class RESTful server architecture (`/v1/infer`, `/v1/session`).
* **Integration Difficulty:** Medium. Cannot be embedded directly into Next.js frontend; must run as dedicated service.
* **Useful Anatomy Atelier Feature:** **Feature 4: AI-Assisted Annotation Reference** — architectural template for client-server active annotation.
* **Recommendation:** **Category B (Prototype Separately / Service Reference)**.

---

### 7. open-anatomy-atlas
* **Repository:** `https://github.com/CognitionLabSNUC/open-anatomy-atlas`
* **Local Location:** `external/open-anatomy`
* **License:** MIT License (Cognition Lab, Shiv Nadar University Chennai).
* **Actual Purpose:** Open-source 3D human anatomy educational atlas derived from BodyParts3D and Z-Anatomy.
* **Supported Inputs:** WebGL / Three.js browser runtime.
* **Outputs:** 3D anatomical model viewing and anatomical taxonomy navigation.
* **Programming Language:** JavaScript / HTML / CSS.
* **Dependencies:** `three.js`.
* **GPU Requirements:** Basic WebGL.
* **Pretrained Weights:** N/A.
* **Dataset Requirements:** BodyParts3D dataset assets.
* **Runnable on Machine:** Yes.
* **Service/API Capability:** Static anatomical assets and metadata.
* **Integration Difficulty:** Very Low.
* **Useful Anatomy Atelier Feature:** **Feature 9: Anatomical Nomenclature & Hierarchy** — standard anatomical categorization (systemic, regional, organ-level) and clinical terminology.
* **Recommendation:** **Category C (Reference Only for Nomenclature and Hierarchy)**.

---

### 8. DejaVu
* **Repository:** `https://github.com/rouge1616/DejaVu`
* **Local Location:** `external/dejavu`
* **License:** Open Research (HAL 2024 / Inria / SOFA scenes).
* **Actual Purpose:** Intra-operative surgical gesture rehearsal using the SOFA framework. Simulates soft-tissue deformation, grasping, pulling, and cutting for 5 organs (Brain, Liver, Kidney, Eye, Uterus).
* **Supported Inputs:** SOFA `.scn` scene files, Python simulation scripts, 3D meshes (OBJ/VTK), surgical endoscopic footage.
* **Outputs:** Real-time physics simulation of deformation, stress tensors, cut geometry.
* **Programming Language:** Python 3 / C++ / SOFA Framework.
* **Dependencies:** SOFA Framework runtime (`sofa-framework`), NumPy, SciPy.
* **GPU Requirements:** Desktop OpenGL acceleration.
* **Pretrained Weights:** N/A (Finite element physics models and constitutive parameter files).
* **Dataset Requirements:** Bundled organ meshes and endoscopic video sequences.
* **Runnable on Machine:** Requires full native desktop SOFA binary installation. Cannot run natively in Node.js or browser WebAssembly without extensive custom compilation.
* **Service/API Capability:** None natively exposed (desktop simulation).
* **Integration Difficulty:** Extremely High for web integration.
* **Useful Anatomy Atelier Feature:** Reference for surgical tool interaction mechanics and organ stress visualization.
* **Recommendation:** **Category C (Reference Only / Documented as Future Research Extension)**.

---

### 9. SlicerSOFA
* **Repository:** `https://github.com/Slicer/SlicerSOFA`
* **Local Location:** `external/slicer-sofa`
* **License:** MIT License (Oslo University Hospital, 2024).
* **Actual Purpose:** 3D Slicer extension integrating the SOFA physics simulation engine with 3D Slicer's medical visualization pipeline for biomechanical modeling.
* **Supported Inputs:** 3D Slicer MRML scenes, segmented patient anatomy models, SOFA physics parameters.
* **Outputs:** Real-time interactive soft-tissue deformation inside 3D Slicer.
* **Programming Language:** C++ / Python / CMake.
* **Dependencies:** 3D Slicer core, SOFA Framework, VTK, ITK, Qt5.
* **GPU Requirements:** Desktop GPU.
* **Pretrained Weights:** N/A.
* **Dataset Requirements:** 3D Slicer patient volume datasets.
* **Runnable on Machine:** Only within a 3D Slicer desktop installation.
* **Service/API Capability:** Desktop extension.
* **Integration Difficulty:** Incompatible with direct web deployment.
* **Useful Anatomy Atelier Feature:** Conceptual design for medical scan → FEA mesh generation.
* **Recommendation:** **Category C (Reference Only)**.

---

### 10. sofa-framework/sofa
* **Repository:** `https://github.com/sofa-framework/sofa`
* **Local Location:** `external/sofa`
* **License:** LGPL v2.1 / v3 (SOFA Framework Consortium).
* **Actual Purpose:** Comprehensive multi-physics simulation engine dedicated to medical simulation, soft tissue modeling, robotics, and haptic feedback.
* **Supported Inputs:** C++, Python bindings, XML scene definitions (`.scn`), 3D polygonal and volumetric tetrahedral meshes.
* **Outputs:** High-fidelity real-time physics deformation, finite element method (FEM) computations, contact dynamics.
* **Programming Language:** C++ (100k+ lines), Python.
* **Dependencies:** CMake, Boost, Eigen, Qt, CUDA (optional), OpenGL.
* **GPU Requirements:** Heavy desktop CPU/GPU requirements for non-linear FEM solving.
* **Pretrained Weights:** N/A.
* **Dataset Requirements:** Biomechanical parameters (Young's modulus, Poisson ratio).
* **Runnable on Machine:** Native compilation requires extensive C++ development environment and several hours to compile.
* **Service/API Capability:** Desktop GUI and Python bindings.
* **Integration Difficulty:** Unrealistic for web browser execution in a hackathon context.
* **Useful Anatomy Atelier Feature:** Architecture reference for physical deformation models.
* **Recommendation:** **Category D (Reject for Direct Frontend Integration / Classify as Standalone Desktop Extension)**.

---

## Synthesis: Selected Integration Stack

| Repository | Category | Role in Anatomy Atelier | Integration Approach |
| :--- | :---: | :--- | :--- |
| **Hierarchical-Temporal-BP-Seg** | **A** | **Nerve Explorer (Brachial Plexus)** | Local Python inference script + API route + Synchronized 3D C5–T1 anatomy mapping |
| **OHIF / Cornerstone3D** | **A** | **Radiology Lab (`external/ohif` submodule)** | Embedded `dicom-parser@1.8.21` + `dcmjs@0.52.0`, 2×2 Quad MPR Hanging Protocols, Length/Angle/ROI/HU-probe tools, QIDO-RS browser & TID-1500 SR export |
| **Z-Anatomy (`nqwrc/3d-anatomy`)** | **A** | **3D Human Atlas (`external/3d-anatomy` submodule)** | Native Three.js + `three-mesh-bvh` loader streaming 7 Draco GLBs (2,827 structures), Latin TA lexicon, clinical notes, containment hierarchy & depth peel slider |
| **neuroaxis-atlas** | **A** | **Neuroanatomy Explorer** | Native Three.js cranial nerve trajectories, brainstem cross-sections & stroke syndromes |
| **TotalSegmentator** | **A** | **Whole-Body CT/MR Benchmark** | Standard anatomical class dictionary (117 structures) + scan segmentation pipeline bridge |
| **MedSAM2** | **B** | **Promptable 3D Mask Service** | External microservice endpoint with deterministic web fallback |
| **MONAI Label** | **B** | **AI-Assisted Annotation** | Documented service connector pattern |
| **open-anatomy-atlas** | **C** | **Ontology Reference** | FMA / Uberon anatomical terminology standard |
| **DejaVu** | **C** | **Surgical Simulation Reference** | Surgical gesture workflow documentation |
| **SlicerSOFA** | **C** | **Surgical Simulation Reference** | Biomechanical finite element documentation |
| **sofa** | **D** | **Rejected from Web App** | Isolated in `external/sofa` |

---
*Report certified by Anatomy Atelier Core Engineering.*
