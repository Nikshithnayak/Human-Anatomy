# Anatomy Atelier — Integration Status Matrix

This document provides a comprehensive technical audit of all external services, AI/ML models, speech pipelines, medical segmentation frameworks, and cloud databases referenced in the Anatomy Atelier platform.

---

## 1. Executive Status Classification

| Integration Area | Component / Service | Implementation Status | Runtime Location | Notes |
|---|---|---|---|---|
| **Peripheral Nerve Segmentation** | Brachial Plexus Ultrasound ML | **IMPLEMENTED (Browser ONNX + Local Python)** | `public/models/brachial-plexus.onnx` (18.52 MB), `lib/imaging/nerve-onnx-runtime.ts`, `services/nerve_explorer/run_inference.py` | Exported from `external/brachial-plexus/lightning_logs/seq50/checkpoints/last.ckpt` (`SegFormer mit_b0` + `ConvLSTM`). Runs real single-frame ultrasound inference via `onnxruntime-web` WASM (and Python `onnxruntime`) across 8 nerve classes (`C5`, `C6`, `C7/MT`, `C8/LT`, `UT`, `SSN`, `AD`, `PD`) with CSA (mm²), axis flattening ratio, and swelling/compression detection. |
| **3D Comparative Pathology** | Synchronized Dual 3D Viewports | **IMPLEMENTED** | `app/components/imaging/Comparative3DViewport.tsx`, `app/components/imaging/NormalVsAbnormalComparator.tsx` | Side-by-side camera-locked Three.js viewports comparing Normal TA2 vs. Pathological lesions (Heart HCM, Brain ACom Aneurysm, L4–L5 Disc Herniation) with Axial Cutaway slider and Translucent X-Ray toggle. |
| **Multiplanar DICOM Reconstruction & OHIF Bridge** | OHIF Viewers (`dicom-parser` + `dcmjs`) & Quad MPR | **IMPLEMENTED** | `lib/imaging/dicom-parser.ts`, `lib/imaging/ohif-bridge.ts`, `external/ohif` | Submodule registered at `external/ohif`. Standards-compliant Part-10 parsing, multi-slice stacking, 2×2 Quad MPR, calibrated Length/Angle/ROI tools, HU probe, QIDO-RS browser, and TID-1500 SR JSON export. |
| **Z-Anatomy 3D Atlas** | `nqwrc/3d-anatomy` (2,827 Structures) | **IMPLEMENTED (Native 3D Atlas)** | `app/components/atlas/ZAnatomyAtlasView.tsx`, `lib/anatomy/z-anatomy.ts`, `external/3d-anatomy` | Submodule registered at `external/3d-anatomy`. Loads 7 Draco-compressed GLBs (`public/z-anatomy/models/`) with `three-mesh-bvh`, Latin lexicon, Wikipedia clinical notes, containment hierarchy, and depth peel slider. |
| **Database Persistence** | Cloudflare D1 | **BOUND (In-Memory Fallback Active)** | `db/index.ts` | Cloudflare D1 binding configured with in-memory singleton stores (`lib/backend-data.ts`) for local and demo deployments. |
| **Simulated / Unused AI Stubs** | MedSAM2 / TotalSegmentator APIs / Socratic Coach / Assistant / Clinical Scribe | **REMOVED** | N/A | Unused simulated endpoints (`/api/assistant`, `/api/segmentation/*`, `/api/clinical-cases/*`) and orphaned Socratic/clinical UI components were completely removed. |

---

## 2. Detailed Subsystem Analysis

### 2.1 Brachial Plexus Ultrasound ML Integration
- **Source Checkpoint**: `external/brachial-plexus/lightning_logs/seq50/checkpoints/last.ckpt`
- **Exported Browser/CLI ONNX Model**: `public/models/brachial-plexus.onnx` (18.52 MB, `scripts/export_brachial_plexus_onnx.py`)
- **Model Architecture**: `SegFormer (mit_b0)` + hierarchical `ConvLSTM` predicting 9 channels (`BG`, `C5`, `C6`, `C7/MT`, `C8/LT`, `UT`, `SSN`, `AD`, `PD`) from `[1, 1, 416, 416]` grayscale B-mode ultrasound frames.
- **Browser Runtime & Morphometry**: `lib/imaging/nerve-onnx-runtime.ts` executes `onnxruntime-web` WASM (`/ort/`); `lib/imaging/nerve-biometrics.ts` derives calibrated Cross-Sectional Area (CSA mm²), major/minor axes, flattening ratio, and swelling/entrapment flags.
- **Python CLI Inference**: `services/nerve_explorer/run_inference.py --image <path>` executes local `onnxruntime` inference using the same ONNX artifact.

### 2.2 Medical Imaging & Segmentation Pipeline
- **Local Parsing**: The DICOM parser reads binary streams directly in JavaScript without relying on external cloud processing.
- **HU Calibration**:
  - Soft tissue window: Width 400, Level 40
  - Bone window: Width 1800, Level 400
  - Lung window: Width 1500, Level -600
  - Brain window: Width 80, Level 40
- **Comparative Pathology**: Direct side-by-side normal vs. abnormal comparison for:
  1. Hypertrophic Cardiomyopathy (HCM) vs. Normal Myocardium
  2. L4-L5 Lumbar Disc Herniation vs. Normal Spinal Column
  3. Anterior Communicating Artery (ACom) Saccular Aneurysm vs. Normal Circle of Willis

### 2.3 Centralized Integration Architecture
All network communication flows through `lib/api/api-client.ts`, which enforces:
- Standardized timeouts (`AbortSignal.timeout`)
- Response validation and JSON deserialization
- Unified `ApiClientError` formatting with HTTP status codes and error messages
- No component-level ad-hoc `fetch()` calls

