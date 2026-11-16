"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import {
  Z_ANATOMY_SYSTEMS,
  computeDepthLayerStates,
  type ZAnatomyContainment,
  type ZAnatomyPreset,
  type ZAnatomySystemId,
} from "@/lib/anatomy/z-anatomy";

// Register three-mesh-bvh acceleration once on Three.js prototypes
let bvhPatched = false;
function ensureBvhSupport() {
  if (bvhPatched) return;
  const geomProto = THREE.BufferGeometry.prototype as THREE.BufferGeometry & {
    computeBoundsTree?: typeof computeBoundsTree;
    disposeBoundsTree?: typeof disposeBoundsTree;
  };
  geomProto.computeBoundsTree = computeBoundsTree;
  geomProto.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  bvhPatched = true;
}

interface StructureRecord {
  node: THREE.Object3D;
  systemId: ZAnatomySystemId;
  parentId: string | null;
  childIds: string[];
  ownMeshes: THREE.Mesh[];
}

export interface ZAnatomySceneProps {
  theme: "light" | "dark";
  activeSystems: ZAnatomySystemId[];
  selectedId: string | null;
  isolatedId: string | null;
  ghostOthers: boolean;
  hiddenIds: string[];
  opacities: Record<string, number>;
  depthPercent: number;
  autoRotate: boolean;
  cameraCommand: { type: "view"; view: "front" | "back" | "left" | "right" | "top"; seq: number } | { type: "preset"; preset: ZAnatomyPreset; seq: number } | { type: "focus"; partId: string; seq: number } | { type: "reset"; seq: number } | null;
  onSelect: (partId: string | null) => void;
  onHover?: (partId: string | null, pos?: { x: number; y: number }) => void;
  onLoadedSystemsChange?: (loaded: ZAnatomySystemId[]) => void;
  onLoadingProgress?: (info: { systemId: ZAnatomySystemId | null; progress: number; message: string }) => void;
  onRegistryUpdate?: (containment: Record<string, ZAnatomyContainment>) => void;
  onError?: (msg: string) => void;
}

const HIGHLIGHT_COLOR = new THREE.Color("#f59e0b");
const HOVER_COLOR = new THREE.Color("#fbbf24");
const GHOST_OPACITY = 0.14;

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

export default function ZAnatomyScene({
  theme,
  activeSystems,
  selectedId,
  isolatedId,
  ghostOthers,
  hiddenIds,
  opacities,
  depthPercent,
  autoRotate,
  cameraCommand,
  onSelect,
  onHover,
  onLoadedSystemsChange,
  onLoadingProgress,
  onRegistryUpdate,
  onError,
}: ZAnatomySceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    invalidate: () => void;
    modelRoots: Map<ZAnatomySystemId, THREE.Group>;
    structures: Map<string, StructureRecord>;
    inFlight: Map<ZAnatomySystemId, Promise<void>>;
    loadedSystems: Set<ZAnatomySystemId>;
    ghostVariants: WeakMap<THREE.Material, THREE.Material>;
    hoveredId: string | null;
    isCentered: boolean;
  } | null>(null);

  // Latest callbacks in refs to avoid tearing down WebGL context
  const callbacksRef = useRef({
    onSelect,
    onHover,
    onLoadedSystemsChange,
    onLoadingProgress,
    onRegistryUpdate,
    onError,
  });
  useEffect(() => {
    callbacksRef.current = {
      onSelect,
      onHover,
      onLoadedSystemsChange,
      onLoadingProgress,
      onRegistryUpdate,
      onError,
    };
  }, [onSelect, onHover, onLoadedSystemsChange, onLoadingProgress, onRegistryUpdate, onError]);

  // Keep latest reactive visibility props accessible to event handlers
  const stateRef = useRef({
    selectedId,
    isolatedId,
    ghostOthers,
    hiddenIds,
    opacities,
    depthPercent,
    activeSystems,
  });
  useEffect(() => {
    stateRef.current = {
      selectedId,
      isolatedId,
      ghostOthers,
      hiddenIds,
      opacities,
      depthPercent,
      activeSystems,
    };
  }, [selectedId, isolatedId, ghostOthers, hiddenIds, opacities, depthPercent, activeSystems]);

  const initialThemeRef = useRef(theme);

  // Initialize Three.js WebGL scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    ensureBvhSupport();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialThemeRef.current === "dark" ? 0x0b0e14 : 0xf4f0ea);

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.01, 100);
    camera.position.set(0, 0.9, 2.65);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    // Balanced anatomical studio lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.48);
    const keyLight = new THREE.DirectionalLight(0xfffaf0, 0.9);
    keyLight.position.set(3.5, 5.0, 4.5);
    const fillLight = new THREE.DirectionalLight(0xcbe0ff, 0.36);
    fillLight.position.set(-4.0, 2.5, -2.5);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
    rimLight.position.set(0, -2.0, -4.5);
    const hemi = new THREE.HemisphereLight(0xd8e8ff, 0x3b2f28, 0.26);
    scene.add(ambient, keyLight, fillLight, rimLight, hemi);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.04;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.minPolarAngle = Math.PI * 0.04;
    controls.target.set(0, 0.86, 0);
    controls.update();

    let needsRender = true;
    let settleFrames = 6;
    let rafId = 0;

    const invalidate = () => {
      needsRender = true;
      settleFrames = Math.max(settleFrames, 2);
    };

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const moving = controls.update();
      if (moving || controls.autoRotate) {
        settleFrames = Math.max(settleFrames, 2);
      }
      if (!needsRender && settleFrames <= 0) return;
      if (settleFrames > 0) settleFrames--;
      needsRender = false;
      renderer.render(scene, camera);
    };
    tick();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      invalidate();
    });
    resizeObserver.observe(container);

    const modelRoots = new Map<ZAnatomySystemId, THREE.Group>();
    const structures = new Map<string, StructureRecord>();
    const inFlight = new Map<ZAnatomySystemId, Promise<void>>();
    const loadedSystems = new Set<ZAnatomySystemId>();
    const ghostVariants = new WeakMap<THREE.Material, THREE.Material>();

    sceneRefs.current = {
      scene,
      camera,
      renderer,
      controls,
      invalidate,
      modelRoots,
      structures,
      inFlight,
      loadedSystems,
      ghostVariants,
      hoveredId: null,
      isCentered: false,
    };

    // Raycasting setup (BVH firstHitOnly)
    const raycaster = new THREE.Raycaster();
    (raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
    const pointer = new THREE.Vector2();
    let pointerDown: { x: number; y: number } | null = null;
    let orbiting = false;

    const onControlStart = () => {
      orbiting = true;
      invalidate();
    };
    const onControlEnd = () => {
      orbiting = false;
      invalidate();
    };
    controls.addEventListener("start", onControlStart);
    controls.addEventListener("end", onControlEnd);

    const pickPartAt = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const roots = Array.from(modelRoots.values()).filter((g) => g.visible);
      if (roots.length === 0) return null;

      const hits = raycaster.intersectObjects(roots, true);
      for (const hit of hits) {
        if (!hit.object.visible) continue;
        let curr: THREE.Object3D | null = hit.object;
        while (curr) {
          if (typeof curr.userData?.partId === "string") {
            return curr.userData.partId;
          }
          curr = curr.parent;
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) {
        pointerDown = null;
        return;
      }
      pointerDown = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (orbiting || !sceneRefs.current) return;
      const partId = pickPartAt(e.clientX, e.clientY);
      renderer.domElement.style.cursor = partId ? "pointer" : "grab";
      if (partId !== sceneRefs.current.hoveredId) {
        sceneRefs.current.hoveredId = partId;
        applyVisualMaterials();
      }
      callbacksRef.current.onHover?.(partId, { x: e.clientX, y: e.clientY });
    };

    const onClick = (e: MouseEvent) => {
      if (pointerDown) {
        const dx = e.clientX - pointerDown.x;
        const dy = e.clientY - pointerDown.y;
        pointerDown = null;
        if (Math.hypot(dx, dy) > 6) return;
      }
      const partId = pickPartAt(e.clientX, e.clientY);
      callbacksRef.current.onSelect(partId);
    };

    const onDblClick = (e: MouseEvent) => {
      const partId = pickPartAt(e.clientX, e.clientY);
      if (!partId || !sceneRefs.current) return;
      callbacksRef.current.onSelect(partId);
      focusStructure(partId);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblClick);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/z-anatomy/draco/");
    dracoLoader.preload();

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    function applyVisualMaterials() {
      const ctx = sceneRefs.current;
      if (!ctx) return;
      const {
        selectedId: selId,
        isolatedId: isoId,
        ghostOthers: ghost,
        hiddenIds: hidden,
        opacities: opMap,
        depthPercent: depthPct,
        activeSystems: actSys,
      } = stateRef.current;

      const hiddenSet = new Set(hidden);
      const activeSet = new Set(actSys);
      const depthMap = computeDepthLayerStates(depthPct, Array.from(ctx.loadedSystems));

      // Compute visible subtree if isolated
      let isoSet: Set<string> | null = null;
      if (isoId && ctx.structures.has(isoId)) {
        isoSet = new Set<string>();
        const walk = (id: string) => {
          isoSet!.add(id);
          ctx.structures.get(id)?.childIds.forEach(walk);
        };
        walk(isoId);
      }

      const ghostVariantOf = (mat: THREE.Material): THREE.Material => {
        let g = ctx.ghostVariants.get(mat);
        if (!g) {
          g = mat.clone();
          g.transparent = true;
          g.opacity = GHOST_OPACITY;
          g.depthWrite = false;
          ctx.ghostVariants.set(mat, g);
        }
        return g;
      };

      ctx.modelRoots.forEach((group, sysId) => {
        const depthRule = depthMap[sysId];
        const depthVisible = depthPct > 0 && depthRule ? depthRule.visible : true;
        group.visible = activeSet.has(sysId) && depthVisible;
      });

      ctx.structures.forEach((rec, partId) => {
        const isSysVisible = activeSet.has(rec.systemId);
        const depthRule = depthMap[rec.systemId];
        const depthOpacity = depthPct > 0 && depthRule ? depthRule.opacity : 1;
        const partOpacity = opMap[partId];

        const isSelected = selId === partId;
        const isHovered = ctx.hoveredId === partId && !isSelected;

        let visible = isSysVisible && !hiddenSet.has(partId) && (depthPct === 0 || (depthRule ? depthRule.visible : true));
        if (isoSet && !isoSet.has(partId)) {
          visible = ghost;
        }

        const isGhosted = Boolean(isoSet && !isoSet.has(partId) && ghost);

        rec.ownMeshes.forEach((mesh) => {
          mesh.visible = visible;
          const base = mesh.userData.baseMaterial as THREE.Material | THREE.Material[] | undefined;
          if (!base) return;

          const effectiveOpacity =
            typeof partOpacity === "number" ? partOpacity : depthOpacity < 0.99 ? depthOpacity : 1;

          // Release owned cloned material if returning to pure resting state
          if (!isSelected && !isHovered && !isGhosted && effectiveOpacity >= 0.99) {
            if (mesh.userData.ownsMaterial) {
              materialsOf(mesh).forEach((m) => m.dispose());
              mesh.userData.ownsMaterial = false;
            }
            mesh.material = base;
            return;
          }

          if (isGhosted && !isSelected && !isHovered) {
            if (mesh.userData.ownsMaterial) {
              materialsOf(mesh).forEach((m) => m.dispose());
              mesh.userData.ownsMaterial = false;
            }
            mesh.material = Array.isArray(base) ? base.map(ghostVariantOf) : ghostVariantOf(base);
            mesh.renderOrder = 1;
            return;
          }

          if (!mesh.userData.ownsMaterial) {
            mesh.material = Array.isArray(base)
              ? base.map((m) => m.clone())
              : base.clone();
            mesh.userData.ownsMaterial = true;
          }

          materialsOf(mesh).forEach((m, idx) => {
            const srcMat = Array.isArray(base) ? base[idx] : base;
            const std = m as THREE.MeshStandardMaterial;
            const srcStd = srcMat as THREE.MeshStandardMaterial;

            if (effectiveOpacity < 0.99) {
              m.transparent = true;
              m.opacity = effectiveOpacity;
              m.depthWrite = effectiveOpacity > 0.85;
              mesh.renderOrder = 2;
            } else {
              m.transparent = srcMat.transparent;
              m.opacity = srcMat.opacity;
              m.depthWrite = srcMat.depthWrite;
              mesh.renderOrder = srcMat.transparent ? 1 : 0;
            }

            if (std && "emissive" in std) {
              if (isSelected) {
                std.emissive.copy(HIGHLIGHT_COLOR);
                std.emissiveIntensity = 0.52;
              } else if (isHovered) {
                std.emissive.copy(HOVER_COLOR);
                std.emissiveIntensity = 0.3;
              } else if (srcStd && "emissive" in srcStd) {
                std.emissive.copy(srcStd.emissive);
                std.emissiveIntensity = srcStd.emissiveIntensity ?? 0;
              }
            }
            m.needsUpdate = true;
          });
        });
      });

      ctx.invalidate();
    }

    function focusStructure(partId: string) {
      const ctx = sceneRefs.current;
      if (!ctx) return;
      const rec = ctx.structures.get(partId);
      if (!rec) return;

      const box = new THREE.Box3();
      let hasBox = false;
      const walk = (id: string) => {
        const entry = ctx.structures.get(id);
        if (!entry) return;
        entry.ownMeshes.forEach((m) => {
          box.expandByObject(m);
          hasBox = true;
        });
        entry.childIds.forEach(walk);
      };
      walk(partId);
      if (!hasBox || box.isEmpty()) return;

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.05);
      const distance = Math.max(maxDim * 2.4, 0.28);
      const dir = new THREE.Vector3().subVectors(ctx.camera.position, ctx.controls.target).normalize();
      if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);

      ctx.camera.position.copy(center).add(dir.multiplyScalar(distance));
      ctx.controls.target.copy(center);
      ctx.controls.update();
      ctx.invalidate();
    }

    // Store helper closures on ref element for subsequent effect updates
    (container as HTMLDivElement & {
      __applyVisuals?: () => void;
      __focusPart?: (id: string) => void;
      __gltfLoader?: GLTFLoader;
    }).__applyVisuals = applyVisualMaterials;
    (container as HTMLDivElement & { __focusPart?: (id: string) => void }).__focusPart = focusStructure;
    (container as HTMLDivElement & { __gltfLoader?: GLTFLoader }).__gltfLoader = gltfLoader;

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener("start", onControlStart);
      controls.removeEventListener("end", onControlEnd);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDblClick);
      controls.dispose();

      const uniqueMaterials = new Set<THREE.Material>();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          const geom = mesh.geometry as THREE.BufferGeometry & { disposeBoundsTree?: () => void };
          geom.disposeBoundsTree?.();
          geom.dispose();
          materialsOf(mesh).forEach((m) => uniqueMaterials.add(m));
          if (mesh.userData.baseMaterial) {
            const bm = mesh.userData.baseMaterial as THREE.Material | THREE.Material[];
            (Array.isArray(bm) ? bm : [bm]).forEach((m) => uniqueMaterials.add(m));
          }
        }
      });
      uniqueMaterials.forEach((m) => m.dispose());
      scene.clear();
      dracoLoader.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      sceneRefs.current = null;
    };
  }, []);

  // Theme background update without resetting camera
  useEffect(() => {
    const ctx = sceneRefs.current;
    if (!ctx) return;
    ctx.scene.background = new THREE.Color(theme === "dark" ? 0x0b0e14 : 0xf4f0ea);
    ctx.invalidate();
  }, [theme]);

  // Auto-rotate control sync
  useEffect(() => {
    const ctx = sceneRefs.current;
    if (!ctx) return;
    ctx.controls.autoRotate = autoRotate;
    ctx.controls.autoRotateSpeed = 1.4;
    ctx.invalidate();
  }, [autoRotate]);

  // Lazy load newly activated systems on demand
  useEffect(() => {
    const container = containerRef.current as
      | (HTMLDivElement & { __applyVisuals?: () => void; __gltfLoader?: GLTFLoader })
      | null;
    const ctx = sceneRefs.current;
    if (!container || !ctx || !container.__gltfLoader) return;

    const loader = container.__gltfLoader;
    let cancelled = false;

    const findAncestorPartId = (node: THREE.Object3D | null): string | null => {
      let cur = node;
      while (cur) {
        if (typeof cur.userData?.partId === "string") return cur.userData.partId;
        cur = cur.parent;
      }
      return null;
    };

    const pendingSystems = activeSystems.filter((sys) => !ctx.loadedSystems.has(sys));
    const systemProgress = new Map<ZAnatomySystemId, number>(
      pendingSystems.map((sys) => [sys, 0]),
    );
    let maxEmittedProgress = 0;

    const emitOverallProgress = (systemId: ZAnatomySystemId | null, message: string) => {
      if (cancelled || pendingSystems.length === 0) return;
      let sum = 0;
      for (const sys of pendingSystems) {
        sum += systemProgress.get(sys) ?? 0;
      }
      const next = Math.max(maxEmittedProgress, Math.min(99, Math.round(sum / pendingSystems.length)));
      maxEmittedProgress = next;
      callbacksRef.current.onLoadingProgress?.({ systemId, progress: next, message });
    };

    const yieldFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const loadSystem = async (systemId: ZAnatomySystemId) => {
      if (ctx.loadedSystems.has(systemId)) {
        container.__applyVisuals?.();
        return;
      }
      const sysMeta = Z_ANATOMY_SYSTEMS.find((s) => s.id === systemId);
      if (ctx.inFlight.has(systemId)) {
        await ctx.inFlight.get(systemId);
        systemProgress.set(systemId, 100);
        emitOverallProgress(systemId, `Loaded ${sysMeta?.name ?? systemId}`);
        container.__applyVisuals?.();
        return;
      }
      systemProgress.set(systemId, 6);
      emitOverallProgress(
        systemId,
        `Streaming ${sysMeta?.name ?? systemId} (${sysMeta?.sizeLabel ?? "GLB"})...`,
      );

      const promise = (async () => {
        try {
          const gltf = await loader.loadAsync(`/z-anatomy/models/${systemId}.glb`, (xhr) => {
            if (cancelled) return;
            const pct = xhr.lengthComputable
              ? Math.max(8, Math.min(92, Math.round((xhr.loaded / xhr.total) * 100)))
              : 55;
            systemProgress.set(systemId, pct);
            emitOverallProgress(systemId, `Streaming ${sysMeta?.name ?? systemId}...`);
          });

          if (cancelled || !sceneRefs.current) return;

          const model = gltf.scene;
          const nodes: THREE.Object3D[] = [];
          const bvhQueue: Array<
            THREE.BufferGeometry & {
              boundsTree?: unknown;
              computeBoundsTree?: () => void;
            }
          > = [];

          model.traverse((child) => {
            const partId = child.userData?.za_name as string | undefined;
            if (!partId) return;

            child.userData.partId = partId;
            child.userData.system = systemId;

            const parentId = findAncestorPartId(child.parent);
            nodes.push(child);

            ctx.structures.set(partId, {
              node: child,
              systemId,
              parentId,
              childIds: [],
              ownMeshes: [],
            });

            if (parentId) {
              const parentRec = ctx.structures.get(parentId);
              if (parentRec && !parentRec.childIds.includes(partId)) {
                parentRec.childIds.push(partId);
              }
            }
          });

          // Flatten nested child structures while preserving world transforms
          model.updateMatrixWorld(true);
          nodes.forEach((node) => {
            const rec = ctx.structures.get(node.userData.partId);
            if (rec?.parentId) {
              model.attach(node);
            }
          });

          model.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            if (!mesh.userData.baseMaterial && mesh.material) {
              mesh.userData.baseMaterial = mesh.material;
            }
            const geom = mesh.geometry as THREE.BufferGeometry & {
              boundsTree?: unknown;
              computeBoundsTree?: () => void;
            };
            if (geom && !geom.boundsTree && typeof geom.computeBoundsTree === "function") {
              bvhQueue.push(geom);
            }
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.frustumCulled = true;

            const ownerId = findAncestorPartId(mesh);
            if (ownerId) {
              ctx.structures.get(ownerId)?.ownMeshes.push(mesh);
            }
          });

          ctx.scene.add(model);
          ctx.modelRoots.set(systemId, model);
          ctx.loadedSystems.add(systemId);

          if (!ctx.isCentered) {
            const box = new THREE.Box3().setFromObject(model);
            if (!box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              ctx.camera.position.set(center.x, center.y, center.z + maxDim * 1.48);
              ctx.controls.target.copy(center);
              ctx.controls.update();
              ctx.isCentered = true;
            }
          }

          const containment: Record<string, ZAnatomyContainment> = {};
          ctx.structures.forEach((rec, id) => {
            containment[id] = { parentId: rec.parentId, childIds: rec.childIds };
          });

          // Surface meshes on screen immediately before time-slicing BVH build
          container.__applyVisuals?.();
          const maybeCompile = (
            ctx.renderer as THREE.WebGLRenderer & {
              compileAsync?: (s: THREE.Scene, c: THREE.Camera) => Promise<void>;
            }
          ).compileAsync;
          if (typeof maybeCompile === "function") {
            void maybeCompile.call(ctx.renderer, ctx.scene, ctx.camera).catch(() => {});
          }

          callbacksRef.current.onRegistryUpdate?.(containment);
          callbacksRef.current.onLoadedSystemsChange?.(Array.from(ctx.loadedSystems));
          systemProgress.set(systemId, 100);

          // Time-slice BVH tree construction (~6ms budgets) so 2,800+ part meshes never freeze orbit/UI
          if (bvhQueue.length > 0) {
            let sliceStart = performance.now();
            for (const geom of bvhQueue) {
              if (cancelled || !sceneRefs.current) return;
              geom.computeBoundsTree?.();
              if (performance.now() - sliceStart > 6) {
                await yieldFrame();
                sliceStart = performance.now();
              }
            }
          }
        } catch (err) {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : `Failed loading ${systemId}.glb`;
            callbacksRef.current.onError?.(message);
          }
        }
      })().finally(() => {
        ctx.inFlight.delete(systemId);
      });

      ctx.inFlight.set(systemId, promise);
      await promise;
    };

    const runLoads = async () => {
      if (pendingSystems.length === 0) {
        container.__applyVisuals?.();
        callbacksRef.current.onLoadingProgress?.({
          systemId: null,
          progress: 100,
          message: "Ready",
        });
        return;
      }
      let cursor = 0;
      const concurrency = Math.min(3, pendingSystems.length);
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          while (!cancelled && cursor < pendingSystems.length) {
            const sys = pendingSystems[cursor++];
            await loadSystem(sys);
          }
        }),
      );
      if (!cancelled) {
        container.__applyVisuals?.();
        callbacksRef.current.onLoadingProgress?.({
          systemId: null,
          progress: 100,
          message: "Ready",
        });
      }
    };

    void runLoads();

    return () => {
      cancelled = true;
    };
  }, [activeSystems]);

  // Apply visibility / selection / ghost / opacity / depth updates
  useEffect(() => {
    const container = containerRef.current as (HTMLDivElement & { __applyVisuals?: () => void }) | null;
    container?.__applyVisuals?.();
  }, [activeSystems, selectedId, isolatedId, ghostOthers, hiddenIds, opacities, depthPercent]);

  // Camera commands (presets, views, focus, reset)
  useEffect(() => {
    if (!cameraCommand) return;
    const container = containerRef.current as (HTMLDivElement & { __focusPart?: (id: string) => void }) | null;
    const ctx = sceneRefs.current;
    if (!ctx) return;

    if (cameraCommand.type === "focus") {
      container?.__focusPart?.(cameraCommand.partId);
      return;
    }

    if (cameraCommand.type === "preset") {
      ctx.camera.position.set(...cameraCommand.preset.cameraPos);
      ctx.controls.target.set(...cameraCommand.preset.cameraTarget);
      ctx.controls.update();
      ctx.invalidate();
      return;
    }

    const box = new THREE.Box3();
    let hasVisible = false;
    ctx.modelRoots.forEach((group) => {
      if (group.visible) {
        box.expandByObject(group);
        hasVisible = true;
      }
    });
    if (!hasVisible || box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.48;

    const dir = new THREE.Vector3(0, 0, 1);
    if (cameraCommand.type === "view") {
      if (cameraCommand.view === "back") dir.set(0, 0, -1);
      else if (cameraCommand.view === "left") dir.set(-1, 0, 0);
      else if (cameraCommand.view === "right") dir.set(1, 0, 0);
      else if (cameraCommand.view === "top") dir.set(0, 1, 0.12).normalize();
    }

    ctx.camera.position.copy(center).add(dir.multiplyScalar(dist));
    ctx.controls.target.copy(center);
    ctx.controls.update();
    ctx.invalidate();
  }, [cameraCommand]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
      aria-label="Z-Anatomy 2,827-structure 3D interactive canvas"
    />
  );
}

