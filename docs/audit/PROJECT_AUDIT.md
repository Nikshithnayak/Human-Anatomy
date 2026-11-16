# Anatomy Atelier — Project Audit & Feature Overview

**Document:** `docs/audit/PROJECT_AUDIT.md`  
**Maintainer:** Nikshith Nayak  
**Repository:** `https://github.com/Nikshithnayak/Human-Anatomy.git`  
**Project:** Anatomy Atelier — Interactive 3D Human Anatomy, Spatial Learning & Radiology Lab

---

## 1. Executive Summary

Anatomy Atelier is an interactive 3D human anatomy and spatial learning platform built on React 19, Next.js 16 App Router, Three.js (WebGL2), `onnxruntime-web`, and `vinext` (Vite 8 + Cloudflare Workers).

---

## 2. Active Platform Modules

| Module | Category | Primary Code Location | Status | Notes |
|---|---|---|---|---|
| **3D Full-Body Human Atlas** | Anatomy Core | `app/components/atlas/HumanAtlasViewer.tsx`, `scene.tsx`, `ZAnatomyAtlasView.tsx` | **IMPLEMENTED** | Male BodyParts3D (2,234 meshes), Female HRA v1.10 (1,217 meshes), and Z-Anatomy (2,827 meshes across 7 Draco GLBs) with `.bin.gz` streaming, BVH raycasting, radial explosion, depth peel, and live 3D tour. |
| **3D Organ Atelier** | Anatomy Core | `app/components/organ/OrganAtelierWorkspace.tsx`, `app/components/OrganViewer.tsx` | **IMPLEMENTED** | 9 GLB organ specimens with LRU cache (`CACHE_LIMIT = 9`), live physiological motion, cross-section slicing, and 3D spotter quizzes. |
| **Radiology Lab (MPR + OHIF Tools)** | Medical Imaging | `app/components/imaging/ImagingWorkspace.tsx`, `lib/imaging/` | **IMPLEMENTED** | Client-side DICOM Part 10 parsing, HIPAA PHI scrubber, 2×2 Quad MPR, calipers/angle/ROI/HU probe, 3D surface mesh builder, and `dcmjs` TID-1500 SR export. |
| **Normal vs. Abnormal 3D Comparator** | Clinical Anatomy | `app/components/imaging/Comparative3DViewport.tsx`, `NormalVsAbnormalComparator.tsx` | **IMPLEMENTED** | Camera-locked dual Three.js viewports comparing Normal TA2 vs. Heart HCM, L4–L5 Disc Herniation, and Circle of Willis Aneurysm with Axial Cutaway & X-Ray toggle. |
| **Nerve Explorer (Brachial Plexus)** | Neuro / Ultrasound ML | `app/components/nerve/NerveExplorer.tsx`, `lib/imaging/nerve-onnx-runtime.ts` | **IMPLEMENTED** | Browser ONNX (`public/models/brachial-plexus.onnx`) + Python CLI segmentation across 8 ultrasound nerve classes with CSA ($\text{mm}^2$) & flattening ratios plus 3D C4–T1 spine synchronization. |
| **Learning Academy** | Curriculum & Spotters | `app/components/learning/LearningAcademy.tsx`, `lib/backend-data.ts` | **IMPLEMENTED** | Interactive curriculum lessons, board spotters, bookmarks, and notes stored via REST handlers (`/api/lessons`, `/api/quizzes`, `/api/notes`, `/api/bookmarks`). |

---

## 3. ML & Runtime Status

| Model / Library | Source / Integration | Artifact on Disk | Runtime Location | Status |
|---|---|---|---|---|
| **Hierarchical-Temporal-BP-Seg** | `public/models/brachial-plexus.onnx` (18.52 MB) + `external/brachial-plexus/lightning_logs/seq50/checkpoints/last.ckpt` | **YES** | Browser `onnxruntime-web` WASM + `services/nerve_explorer/run_inference.py` | **IMPLEMENTED** |
| **OHIF Viewers (`dicom-parser` + `dcmjs`)** | `external/ohif` + npm packages | **YES** | `lib/imaging/dicom-parser.ts`, `lib/imaging/ohif-bridge.ts`, `app/components/imaging/ImagingWorkspace.tsx` | **IMPLEMENTED** |
| **Z-Anatomy 2,827 Structures** | `external/3d-anatomy` + `public/z-anatomy/models/*.glb` | **YES** | `app/components/atlas/ZAnatomyAtlasView.tsx`, `ZAnatomyScene.tsx` | **IMPLEMENTED** |

---

## 4. Architecture & Verification Guarantees

- Centralized typed client wrapper in `lib/api/api-client.ts` with domain integration modules under `integrations/`.
- Gzip streaming (`.bin.gz` via `DecompressionStream`), manifest caching, time-sliced BVH construction, and shared comparative GLTF decoding across all 3D workspaces.
- End-to-end validation via ESLint (`--max-warnings=0`), `tsc --noEmit`, `vinext build`, and 22 automated tests (`npm run test:build`).

