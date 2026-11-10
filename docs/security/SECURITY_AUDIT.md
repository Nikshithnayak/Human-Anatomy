# Anatomy Atelier — Security, Privacy & Data Integrity Audit

## 1. Executive Summary

Anatomy Atelier is architected as an edge-ready, client-side first medical education and spatial imaging platform. This document outlines the security controls, HIPAA/GDPR compliance measures, data isolation policies, and credential audits enforced across the application.

---

## 2. Protected Health Information (PHI) & Medical Data Handling

### 2.1 Client-Side De-Identification
- **Zero-Cloud DICOM Ingestion**: In the Radiology Lab (`/radiology`), DICOM files loaded by users are parsed **entirely client-side** in the browser using WebAssembly and WebGL buffers.
- **HIPAA Safe Harbor Compliance**: The DICOM parser (`lib/imaging/dicom-parser.ts`) automatically strips or sanitizes Protected Health Information (PHI) metadata tags (Patient Name `(0010,0010)`, Patient ID `(0010,0020)`, Date of Birth `(0010,0030)`) before slice extraction or 3D mesh generation.
- **No Unintended Telemetry**: Diagnostic volumes and MPR slices are never uploaded to remote servers without explicit user-initiated export.

### 2.2 Session Scope Isolation
- All patient DICOM volumes, MPR slices, and ultrasound segmentation buffers stay strictly inside active client memory in the browser without persisting raw patient scans server-side.

---

## 3. Credential & Secret Audit

- **Hardcoded API Keys**: Confirmed **ZERO** exposed API keys or secret tokens committed to source code.
- **Environment Variables**: Edge runtime uses environment bindings configured at deployment time via Cloudflare Wrangler.

---

## 4. Input Validation & Error Handling

- **Centralized API Client**: `lib/api/api-client.ts` intercepts all edge API calls:
  - Enforces strict timeout boundaries (`AbortSignal.timeout`) to prevent hung requests.
  - Validates HTTP response codes and normalizes errors into typed `ApiClientError` exceptions.
  - Prevents injection attacks by validating URL schemas and query parameters.
- **REST Endpoints**: All Next.js App Router API handlers (`/api/*`) validate request payloads and return structured HTTP 400 Bad Request responses with informative error messages upon encountering malformed input.

---

## 5. WebGL & GPU Resource Safety

- **Context Loss Recovery**: `scene.tsx` listens for the `webglcontextlost` event, preventing browser crashes and notifying users with a clean recovery prompt.
- **Memory Leak Prevention**: All Three.js geometries (`BufferGeometry`), materials (`Material`), textures (`DataTexture`), and PMREM render targets are systematically traversed and disposed of on component unmount via dedicated cleanup routines.

