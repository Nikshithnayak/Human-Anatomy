"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  type ReconstructionResult,
  type ReconstructedStructureMesh,
  type ShadingPreset,
  createAnatomicalMaterial,
} from "@/lib/imaging/surface-reconstruction";
import type { MedicalVolume, VolumePlane } from "@/lib/imaging/volume-model";
import { sounds } from "@/app/lib/sound";
import {
  Activity,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
  Sun,
  Tag,
  Volume2,
} from "lucide-react";

interface PatientSpecific3DViewerProps {
  volume: MedicalVolume;
  reconstruction: ReconstructionResult;
  activePlane: VolumePlane;
  sliceIndices: {
    axial: number;
    coronal: number;
    sagittal: number;
  };
  onSliceChange: (plane: VolumePlane, sliceIndex: number) => void;
  onPlaneChange?: (plane: VolumePlane) => void;
  theme?: "light" | "dark";
}

type CameraViewAngle = "oblique" | "anterior" | "lateral" | "posterior" | "superior";

export function PatientSpecific3DViewer({
  volume,
  reconstruction,
  activePlane,
  sliceIndices,
  onSliceChange,
  onPlaneChange,
  theme = "light",
}: PatientSpecific3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const slicePlaneMeshRef = useRef<THREE.Mesh | null>(null);
  const meshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));

  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [isolatedStructureId, setIsolatedStructureId] = useState<string | null>(null);
  const [enableClipping, setEnableClipping] = useState(false);
  const [shadingPreset, setShadingPreset] = useState<ShadingPreset>("photorealistic");
  const [cameraAngle, setCameraAngle] = useState<CameraViewAngle>("oblique");

  const [structureVisibility, setStructureVisibility] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    reconstruction.structures.forEach((s) => {
      init[s.structure.id] = true;
    });
    return init;
  });

  const selectedStructure = reconstruction.structures.find(
    (s) => s.structure.id === selectedStructureId
  );

  // Initialize High-End Medical 3D Three.js Studio Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animId: number;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.localClippingEnabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";
    scene.background = null;

    // Camera & Controls
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    cameraRef.current = camera;
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.4;
    controls.maxDistance = 18;

    // Center camera on reconstructed anatomical bounds
    const center = new THREE.Vector3();
    reconstruction.combinedBounds.getCenter(center);
    controls.target.copy(center);

    const size = new THREE.Vector3();
    reconstruction.combinedBounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1.2);
    const dist = maxDim * 2.3;

    camera.position.set(center.x + dist * 0.65, center.y + dist * 0.45, center.z + dist * 0.85);
    camera.lookAt(center);

    // 1. Balanced Medical Studio Illumination
    // Ambient / Fill sky tone
    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.55));

    // Key Light: Soft surgical directional light
    const keyLight = new THREE.DirectionalLight(0xfffbf5, 1.25);
    keyLight.position.set(center.x + dist * 0.9, center.y + dist * 1.4, center.z + dist * 1.1);
    scene.add(keyLight);

    // Fill Light: Soft neutral fill from opposite lateral side
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.45);
    fillLight.position.set(center.x - dist * 1.0, center.y + dist * 0.5, center.z + dist * 0.7);
    scene.add(fillLight);

    // Rim / Silhouette Backlight: Subtle silhouette separation from behind
    const rimLight = new THREE.DirectionalLight(0xf1f5f9, 0.55);
    rimLight.position.set(center.x, center.y + dist * 0.8, center.z - dist * 1.4);
    scene.add(rimLight);

    // Under-bounce light to soften visceral shadows
    const bounceLight = new THREE.DirectionalLight(0xf8fafc, 0.30);
    bounceLight.position.set(center.x, center.y - dist * 1.2, center.z + dist * 0.4);
    scene.add(bounceLight);

    // 2. High-Tech Anatomical Stage Plinth with Concentric Range Rings
    const platformY = reconstruction.combinedBounds.min.y - 0.04;
    const plinthRadius = Math.max(maxDim * 0.9, 1.2);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(plinthRadius, plinthRadius * 1.04, 0.03, 64),
      new THREE.MeshStandardMaterial({
        color: isDark ? 0x0f172a : 0xf1f5f9,
        roughness: 0.6,
        metalness: 0.1,
      })
    );
    platform.position.set(center.x, platformY, center.z);
    scene.add(platform);

    // Concentric guide rings on the plinth
    const ringGeom = new THREE.RingGeometry(plinthRadius * 0.4, plinthRadius * 0.41, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(center.x, platformY + 0.016, center.z);
    scene.add(ringMesh);

    // 3. Add Reconstructed Structure Meshes with Physical Materials
    const meshesMap = new Map<string, THREE.Mesh>();
    reconstruction.structures.forEach((struct) => {
      const mesh = struct.mesh.clone();
      scene.add(mesh);
      meshesMap.set(struct.structure.id, mesh);
    });
    meshesMapRef.current = meshesMap;

    // 4. Interactive 3D Slice Reference Plane
    const planeSpan = maxDim * 1.4;
    const planeGeom = new THREE.PlaneGeometry(planeSpan, planeSpan);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slicePlaneMesh = new THREE.Mesh(planeGeom, planeMat);
    slicePlaneMesh.renderOrder = 5;

    // Plane outline frame with glowing amber stroke
    const edges = new THREE.EdgesGeometry(planeGeom);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
    });
    const frame = new THREE.LineSegments(edges, lineMat);
    slicePlaneMesh.add(frame);

    scene.add(slicePlaneMesh);
    slicePlaneMeshRef.current = slicePlaneMesh;

    // 5. Raycaster for 3D Structure Selection & Slice Sync
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(meshesMap.values());
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const hitMesh = hit.object as THREE.Mesh;
        const structId = hitMesh.userData?.structureId;
        if (structId) {
          sounds.playClick();
          setSelectedStructureId(structId);

          // Synchronize slice to the clicked point in 3D!
          const hitPoint = hit.point;
          const scale = reconstruction.scaleMmToScene;
          const mx = hitPoint.x / scale;
          const mz = hitPoint.y / scale;
          const my = -hitPoint.z / scale;

          const [vx, vy, vz] = volume.millimetersToVoxel(mx, my, mz);
          if (activePlane === "axial") onSliceChange("axial", vz);
          else if (activePlane === "coronal") onSliceChange("coronal", vy);
          else onSliceChange("sagittal", vx);
        }
      }
    };

    renderer.domElement.addEventListener("click", handlePointerDown);

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed || !entries[0]) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Render loop
    const animate = () => {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("click", handlePointerDown);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, [reconstruction, volume]);

  // Synchronize 3D Slice Reference Plane Position & Orientation
  useEffect(() => {
    const planeMesh = slicePlaneMeshRef.current;
    if (!planeMesh) return;

    const scale = reconstruction.scaleMmToScene;
    const center = new THREE.Vector3();
    reconstruction.combinedBounds.getCenter(center);

    const [physX, physY, physZ] = volume.voxelToMillimeters(
      sliceIndices.sagittal,
      sliceIndices.coronal,
      sliceIndices.axial
    );

    const clipPlane = clipPlaneRef.current;

    if (activePlane === "axial") {
      planeMesh.rotation.set(Math.PI / 2, 0, 0);
      const sceneY = physZ * scale;
      planeMesh.position.set(center.x, sceneY, center.z);
      // Normal pointing down along Y for axial cross section
      clipPlane.normal.set(0, -1, 0);
      clipPlane.constant = sceneY;
    } else if (activePlane === "coronal") {
      planeMesh.rotation.set(0, 0, 0);
      const sceneZ = -physY * scale;
      planeMesh.position.set(center.x, center.y, sceneZ);
      clipPlane.normal.set(0, 0, -1);
      clipPlane.constant = sceneZ;
    } else {
      planeMesh.rotation.set(0, Math.PI / 2, 0);
      const sceneX = physX * scale;
      planeMesh.position.set(sceneX, center.y, center.z);
      clipPlane.normal.set(-1, 0, 0);
      clipPlane.constant = sceneX;
    }
  }, [activePlane, sliceIndices, volume, reconstruction]);

  // Update Shading Preset & Clipping Planes
  useEffect(() => {
    const meshesMap = meshesMapRef.current;
    const clipPlanes = enableClipping ? [clipPlaneRef.current] : [];

    reconstruction.structures.forEach((s) => {
      const mesh = meshesMap.get(s.structure.id);
      if (!mesh) return;

      const mat = createAnatomicalMaterial(s.structure, shadingPreset);
      mat.clippingPlanes = clipPlanes;
      mat.clipShadows = true;

      const isSelected = selectedStructureId === s.structure.id;
      if (isSelected) {
        if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
          mat.emissive.set(0x38bdf8);
          (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
        }
      }

      mesh.material = mat;
    });
  }, [shadingPreset, enableClipping, selectedStructureId, reconstruction]);

  // Update Mesh Visibility and Isolation
  useEffect(() => {
    const meshesMap = meshesMapRef.current;
    reconstruction.structures.forEach((s) => {
      const mesh = meshesMap.get(s.structure.id);
      if (!mesh) return;

      const isVisible = structureVisibility[s.structure.id] ?? true;
      const isIsolated = isolatedStructureId === null || isolatedStructureId === s.structure.id;
      mesh.visible = isVisible && isIsolated;
    });
  }, [structureVisibility, isolatedStructureId, reconstruction]);

  // Auto-rotate toggle
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.2;
    }
  }, [autoRotate]);

  const setViewAngle = (angle: CameraViewAngle) => {
    sounds.playClick();
    setCameraAngle(angle);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const center = new THREE.Vector3();
    reconstruction.combinedBounds.getCenter(center);
    controls.target.copy(center);

    const size = new THREE.Vector3();
    reconstruction.combinedBounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1.2);
    const dist = maxDim * 2.3;

    if (angle === "anterior") {
      // Front AP view
      camera.position.set(center.x, center.y, center.z + dist);
    } else if (angle === "lateral") {
      // Lateral right view
      camera.position.set(center.x + dist, center.y, center.z);
    } else if (angle === "posterior") {
      // Back PA view
      camera.position.set(center.x, center.y, center.z - dist);
    } else if (angle === "superior") {
      // Top axial view
      camera.position.set(center.x, center.y + dist, center.z + 0.01);
    } else {
      // Oblique 3D perspective
      camera.position.set(center.x + dist * 0.65, center.y + dist * 0.45, center.z + dist * 0.85);
    }
    camera.lookAt(center);
    controls.update();
  };

  const toggleVisibility = (id: string) => {
    sounds.playClick();
    setStructureVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleIsolate = (id: string) => {
    sounds.playClick();
    setIsolatedStructureId((prev) => (prev === id ? null : id));
  };

  const resetCamera = () => {
    sounds.playClick();
    setViewAngle("oblique");
  };

  return (
    <div className="flex flex-col h-full rounded-3xl bg-neutral-900 border border-neutral-800 text-white overflow-hidden shadow-2xl relative">
      {/* Top 3D Mode Header & Cinematic Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-950/80 border-b border-neutral-800 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-cyan-500 text-white flex items-center justify-center shadow-md">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Patient-Specific 3D Reconstruction</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                {reconstruction.structures.length} Meshes Reconstructed
              </span>
            </div>
            <div className="text-[10px] text-neutral-400">
              {reconstruction.totalTriangles.toLocaleString()} Polygons • Laplacian Smoothed • Physical Shaders
            </div>
          </div>
        </div>

        {/* View & Shading Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shading Presets Toggle */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShadingPreset("photorealistic");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                shadingPreset === "photorealistic"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Photorealistic Organic Shading"
            >
              <Sun size={12} />
              <span>Organic 3D</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShadingPreset("glass");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                shadingPreset === "glass"
                  ? "bg-cyan-500 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Radiologic CT Glass Mode"
            >
              <Sparkles size={12} />
              <span>CT Glass</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setShadingPreset("density");
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                shadingPreset === "density"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Density Heatmap Glow"
            >
              <Flame size={12} />
              <span>Heatmap</span>
            </button>
          </div>

          {/* Real-time Slice Cut Toggle */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setEnableClipping((prev) => !prev);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              enableClipping
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700/60"
            }`}
            title="Slice Cutting Plane (cross-sectional interior view)"
          >
            <Scissors size={13} className={enableClipping ? "text-amber-400" : ""} />
            <span className="hidden sm:inline">Slice Cut</span>
          </button>

          {/* Auto Rotate */}
          <button
            type="button"
            onClick={() => setAutoRotate((r) => !r)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoRotate ? "bg-amber-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            }`}
            title="Auto Rotate 360°"
          >
            {autoRotate ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Reset Camera */}
          <button
            type="button"
            onClick={resetCamera}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Reset Camera View"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative flex-1 min-h-[480px] bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Camera Orientation Quick-Bar */}
        <div className="absolute top-4 left-4 flex items-center gap-1 p-1 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 shadow-2xl backdrop-blur-md text-[11px] z-10">
          <span className="text-[10px] font-bold text-neutral-400 px-2 uppercase tracking-wider">
            View:
          </span>
          <button
            type="button"
            onClick={() => setViewAngle("anterior")}
            className={`px-2 py-1 rounded-xl font-bold transition-all ${
              cameraAngle === "anterior" ? "bg-cyan-500 text-white" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            AP (Front)
          </button>
          <button
            type="button"
            onClick={() => setViewAngle("lateral")}
            className={`px-2 py-1 rounded-xl font-bold transition-all ${
              cameraAngle === "lateral" ? "bg-cyan-500 text-white" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Lateral
          </button>
          <button
            type="button"
            onClick={() => setViewAngle("posterior")}
            className={`px-2 py-1 rounded-xl font-bold transition-all ${
              cameraAngle === "posterior" ? "bg-cyan-500 text-white" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            PA (Back)
          </button>
          <button
            type="button"
            onClick={() => setViewAngle("superior")}
            className={`px-2 py-1 rounded-xl font-bold transition-all ${
              cameraAngle === "superior" ? "bg-cyan-500 text-white" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Axial
          </button>
          <button
            type="button"
            onClick={() => setViewAngle("oblique")}
            className={`px-2 py-1 rounded-xl font-bold transition-all ${
              cameraAngle === "oblique" ? "bg-amber-500 text-white" : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            3D Oblique
          </button>
        </div>

        {/* Synchronized Slice Indicator Floating HUD */}
        <div className="absolute bottom-4 left-4 p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 shadow-2xl backdrop-blur-md text-xs space-y-1.5 pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Active 3D Reference Plane:
            </span>
          </div>
          <div className="text-amber-400 font-mono text-xs font-semibold">
            {activePlane.toUpperCase()} Slice{" "}
            {activePlane === "axial"
              ? sliceIndices.axial + 1
              : activePlane === "coronal"
              ? sliceIndices.coronal + 1
              : sliceIndices.sagittal + 1}
          </div>
          <p className="text-[10px] text-neutral-400 max-w-[220px] leading-tight">
            Click any 3D organ surface to synchronize the 2D cross-sectional slice viewer in real time.
          </p>
        </div>

        {/* Selected Structure Inspector Drawer */}
        {selectedStructure && (
          <div className="absolute bottom-4 left-64 p-4 rounded-2xl bg-neutral-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs animate-in fade-in slide-in-from-bottom-2 z-10">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedStructure.structure.colorHex }}
                />
                <span className="font-bold text-white text-xs">
                  {selectedStructure.structure.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStructureId(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-neutral-300 font-mono text-[11px]">
              <div><span className="text-neutral-500">System:</span> {selectedStructure.structure.system}</div>
              <div><span className="text-neutral-500">Volume:</span> <strong className="text-amber-400">{selectedStructure.volumeCc.toLocaleString()} cc</strong></div>
              <div><span className="text-neutral-500">FMA Concept:</span> {selectedStructure.structure.fmaConceptId || "Assigned"}</div>
              <div className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
                {selectedStructure.structure.description}
              </div>
            </div>
          </div>
        )}

        {/* Reconstructed Structure List Right Panel */}
        <div className="absolute top-4 right-4 w-64 p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 shadow-2xl backdrop-blur-md space-y-3 max-h-[85%] overflow-y-auto z-10">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Anatomy Layers
            </span>
            {isolatedStructureId && (
              <button
                type="button"
                onClick={() => setIsolatedStructureId(null)}
                className="text-[10px] text-amber-400 font-semibold hover:underline"
              >
                Show All
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {reconstruction.structures.map((s) => {
              const isVisible = structureVisibility[s.structure.id] ?? true;
              const isSelected = selectedStructureId === s.structure.id;
              const isIsolated = isolatedStructureId === s.structure.id;

              return (
                <div
                  key={s.structure.id}
                  onClick={() => setSelectedStructureId(s.structure.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "border-amber-400 bg-amber-500/15"
                      : "border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.structure.colorHex }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {s.structure.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {s.volumeCc > 0 ? `${s.volumeCc} cc` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleIsolate(s.structure.id);
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                        isIsolated
                          ? "bg-amber-500 text-black"
                          : "text-neutral-500 hover:text-white"
                      }`}
                      title={isIsolated ? "De-isolate" : "Isolate"}
                    >
                      ISO
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(s.structure.id);
                      }}
                      className="p-1 text-neutral-400 hover:text-white rounded"
                      title={isVisible ? "Hide" : "Show"}
                    >
                      {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
