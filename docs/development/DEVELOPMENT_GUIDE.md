# Anatomy Atelier — Development & Deployment Guide

## 1. Prerequisites & Environment Setup

- **Node.js**: `>= 22.13.0` (LTS recommended)
- **Package Manager**: `npm`
- **Operating Systems**: Windows, macOS, Linux
- **Hardware Acceleration**: WebGL 2.0 capable GPU (modern Intel/AMD integrated graphics or NVIDIA discrete GPU).

---

## 2. Local Development Workflow

### 2.1 Installation
Clone the repository and install dependencies:
```bash
git clone --recurse-submodules https://github.com/Nikshithnayak/Human-Anatomy.git
cd Human-Anatomy
npm install
```

### 2.2 Running Development Server
Start the local development server powered by `vinext` (Vite-backed Next.js App Router compiler):
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 2.3 Running the Test Suite
Anatomy Atelier features an extensive test suite executed via the native Node.js test runner (`node --test`):
```bash
npm test
```
This tests:
- HTML server rendering and redirection
- Health check endpoints (`/api/health`)
- Lessons, quizzes, notes, and bookmarks APIs
- DICOM parser magic bytes and coordinate transformations
- Multiplanar reconstruction slice extraction
- Marching cubes 3D isocontour surface mesh generation
- Brachial plexus ultrasound segmentation classes and safety envelope
- TotalSegmentator taxonomy assertions
- Male and female atlas chunk integrity and binary file validation

---

## 3. Production Build & Deployment

### 3.1 Compiling for Production
Compile the client assets, server routes, and edge worker bundles:
```bash
npm run build
```
The build executes across 5 stages:
1. Analyze client references
2. Analyze server references
3. Build React Server Component (RSC) environment
4. Build client bundle and assets
5. Build SSR / edge worker environment

### 3.2 Running the Production Build Locally
Verify the production build locally:
```bash
npx vinext start
```

### 3.3 Deploying to Cloudflare Workers / Pages
Anatomy Atelier is built natively for Cloudflare Workers edge runtime:
```bash
npx wrangler deploy
```

Static assets (such as `public/models/*.bin`, `atlas.json`, and `atlas-female.json`) are automatically cached on Cloudflare Pages global CDN.

