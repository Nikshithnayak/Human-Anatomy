"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { disposeObject } from "@/app/lib/three/dispose";
import {
  Eye,
  Layers,
  Link2,
  Link2Off,
  Loader2,
  RotateCcw,
  Scissors,
} from "lucide-react";

export interface Comparative3DViewportProps {
  caseId: string;
  normalLabel?: string;
  abnormalLabel?: string;
}

type ViewportSide = "normal" | "abnormal";

interface SideSceneHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  rootGroup: THREE.Group;
  clipPlane: THREE.Plane;
  boxMinY: number;
  boxMaxY: number;
  pulsatingMeshes: { mesh: THREE.Mesh; baseScale: number }[];
  wireframeTargets: { mesh: THREE.Mesh; baseOpacity: number; baseTransparent: boolean }[];
}

const MODEL_FIT_SIZE = 3.2;

function configureLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 1.35));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(4.5, 6.0, 5.5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
  rimLight.position.set(-4.5, 3.0, -4.5);
  scene.add(rimLight);
}

function buildLumbarSpineUnit(side: ViewportSide, clipPlane: THREE.Plane): {
  group: THREE.Group;
  pulsating: { mesh: THREE.Mesh; baseScale: number }[];
  wireTargets: { mesh: THREE.Mesh; baseOpacity: number; baseTransparent: boolean }[];
} {
  const group = new THREE.Group();
  const pulsating: { mesh: THREE.Mesh; baseScale: number }[] = [];
  const wireTargets: { mesh: THREE.Mesh; baseOpacity: number; baseTransparent: boolean }[] = [];

  const isAbnormal = side === "abnormal";
  const discCompression = isAbnormal ? 0.24 : 0;

  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xe6dfd3,
    roughness: 0.62,
    metalness: 0.05,
    side: THREE.DoubleSide,
    clippingPlanes: [clipPlane],
  });

  const makeVertebra = (yCenter: number, name: string) => {
    const vert = new THREE.Group();
    vert.name = name;

    // Cortical vertebral body
    const bodyGeo = new THREE.CylinderGeometry(0.95, 0.98, 0.72, 36, 1, false);
    const body = new THREE.Mesh(bodyGeo, boneMat.clone());
    body.scale.set(1.12, 1, 0.92);
    vert.add(body);
    wireTargets.push({ mesh: body, baseOpacity: 1, baseTransparent: false });

    // Posterior neural arch ring + pedicles
    for (const s of [-1, 1]) {
      const pedicle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.65, 16),
        boneMat.clone(),
      );
      pedicle.rotation.x = Math.PI / 2;
      pedicle.position.set(s * 0.52, 0.04, -0.95);
      vert.add(pedicle);
      wireTargets.push({ mesh: pedicle, baseOpacity: 1, baseTransparent: false });

      const transverse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.12, 0.72, 14),
        boneMat.clone(),
      );
      transverse.rotation.z = Math.PI / 2;
      transverse.position.set(s * 0.92, 0.08, -1.08);
      vert.add(transverse);
      wireTargets.push({ mesh: transverse, baseOpacity: 1, baseTransparent: false });
    }

    // Lamina & Spinous Process
    const lamina = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.14, 14, 28, Math.PI),
      boneMat.clone(),
    );
    lamina.rotation.x = Math.PI / 2;
    lamina.rotation.z = Math.PI;
    lamina.position.set(0, 0.02, -1.16);
    vert.add(lamina);
    wireTargets.push({ mesh: lamina, baseOpacity: 1, baseTransparent: false });

    const spinous = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.42, 0.78),
      boneMat.clone(),
    );
    spinous.rotation.x = -0.22;
    spinous.position.set(0, -0.05, -1.85);
    vert.add(spinous);
    wireTargets.push({ mesh: spinous, baseOpacity: 1, baseTransparent: false });

    vert.position.y = yCenter;
    return vert;
  };

  group.add(makeVertebra(0.68 - discCompression * 0.5, "L4-Vertebra"));
  group.add(makeVertebra(-0.68 + discCompression * 0.5, "L5-Vertebra"));

  // Intervertebral Disc L4-L5
  const discHeight = isAbnormal ? 0.25 : 0.44;
  const annulusMat = new THREE.MeshStandardMaterial({
    color: isAbnormal ? 0x94a3b8 : 0x38bdf8,
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    clippingPlanes: [clipPlane],
  });
  const annulus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.96, 0.98, discHeight, 40),
    annulusMat,
  );
  annulus.scale.set(1.12, 1, 0.92);
  group.add(annulus);
  wireTargets.push({ mesh: annulus, baseOpacity: 0.85, baseTransparent: true });

  // Healthy central nucleus pulposus
  const nucleusMat = new THREE.MeshStandardMaterial({
    color: isAbnormal ? 0xf59e0b : 0x10b981,
    emissive: isAbnormal ? 0x78350f : 0x064e3b,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    clippingPlanes: [clipPlane],
  });
  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 28, 20),
    nucleusMat,
  );
  nucleus.scale.set(1.15, isAbnormal ? 0.34 : 0.48, 0.95);
  group.add(nucleus);

  // Thecal sac / cauda equina column inside spinal canal
  const thecalSac = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.23, 2.35, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0x854d0e,
      emissiveIntensity: 0.22,
      roughness: 0.45,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      clippingPlanes: [clipPlane],
    }),
  );
  thecalSac.position.set(0, 0, -1.08);
  group.add(thecalSac);

  // Bilateral L5 nerve roots exiting lateral recess
  for (const s of [-1, 1]) {
    const isAffectedRoot = isAbnormal && s === -1;
    const points = isAffectedRoot
      ? [
          new THREE.Vector3(-0.16, 0.55, -1.04),
          new THREE.Vector3(-0.38, 0.08, -1.16), // Pushed posteriorly & laterally by disc fragment
          new THREE.Vector3(-0.68, -0.34, -0.95),
          new THREE.Vector3(-1.18, -0.82, -0.58),
        ]
      : [
          new THREE.Vector3(s * 0.16, 0.55, -1.04),
          new THREE.Vector3(s * 0.32, 0.06, -0.98),
          new THREE.Vector3(s * 0.62, -0.36, -0.86),
          new THREE.Vector3(s * 1.16, -0.82, -0.56),
        ];
    const curve = new THREE.CatmullRomCurve3(points);
    const rootMesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 32, isAffectedRoot ? 0.095 : 0.078, 16, false),
      new THREE.MeshStandardMaterial({
        color: isAffectedRoot ? 0xf43f5e : 0xfacc15,
        emissive: isAffectedRoot ? 0xbe123c : 0x713f12,
        emissiveIntensity: isAffectedRoot ? 0.75 : 0.25,
        roughness: 0.35,
        side: THREE.DoubleSide,
        clippingPlanes: [clipPlane],
      }),
    );
    if (isAffectedRoot) {
      // Flattened AP compression of nerve root
      rootMesh.scale.set(1.28, 1, 0.58);
    }
    group.add(rootMesh);
  }

  // Paracentral extruded nucleus fragment compressing left L5 root in Abnormal mode
  if (isAbnormal) {
    const herniation = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 28, 22),
      new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        emissive: 0x9f1239,
        emissiveIntensity: 0.7,
        roughness: 0.25,
        side: THREE.DoubleSide,
        clippingPlanes: [clipPlane],
      }),
    );
    herniation.scale.set(1.05, 0.72, 1.38);
    herniation.position.set(-0.3, 0.02, -0.95);
    group.add(herniation);
    pulsating.push({ mesh: herniation, baseScale: 1 });
  }

  group.rotation.set(0.18, -0.55, 0);
  return { group, pulsating, wireTargets };
}

function buildCircleOfWillisOverlay(side: ViewportSide, clipPlane: THREE.Plane): {
  group: THREE.Group;
  pulsating: { mesh: THREE.Mesh; baseScale: number }[];
} {
  const group = new THREE.Group();
  const pulsating: { mesh: THREE.Mesh; baseScale: number }[] = [];
  const isAbnormal = side === "abnormal";

  const vesselMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    side: THREE.DoubleSide,
    clippingPlanes: [clipPlane],
  });

  const addVessel = (pts: [number, number, number][], radius = 0.052) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 14, false), vesselMat);
    group.add(mesh);
  };

  // Basilar trunk & PCAs
  addVessel([
    [0, -0.58, -0.18],
    [0, -0.25, -0.05],
    [0, -0.02, 0.05],
  ], 0.065);
  for (const s of [-1, 1]) {
    // PCA -> PCom -> ICA -> MCA
    addVessel([
      [0, -0.02, 0.05],
      [s * 0.22, -0.02, 0.02],
      [s * 0.42, -0.04, -0.18],
    ], 0.045);
    addVessel([
      [s * 0.2, -0.02, 0.03],
      [s * 0.25, 0.02, 0.22],
      [s * 0.28, 0.05, 0.36],
    ], 0.034);
    // ICA carotid siphon rising to bifurcation
    addVessel([
      [s * 0.36, -0.45, 0.32],
      [s * 0.3, -0.1, 0.35],
      [s * 0.28, 0.06, 0.36],
    ], 0.062);
    // MCA lateral branch
    addVessel([
      [s * 0.28, 0.06, 0.36],
      [s * 0.56, 0.14, 0.32],
      [s * 0.82, 0.24, 0.22],
    ], 0.052);
    // ACA A1 -> A2
    addVessel([
      [s * 0.28, 0.06, 0.36],
      [s * 0.14, 0.08, 0.49],
      [s * 0.07, 0.1, 0.56],
      [s * 0.08, 0.36, 0.62],
      [s * 0.09, 0.62, 0.48],
    ], 0.046);
  }
  // Anterior Communicating Artery (ACom) bridge
  addVessel([
    [-0.08, 0.1, 0.56],
    [0, 0.1, 0.57],
    [0.08, 0.1, 0.56],
  ], 0.04);

  // Optic Chiasm inferior to ACom
  const chiasm = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.06, 0.14),
    new THREE.MeshStandardMaterial({
      color: isAbnormal ? 0xfbbf24 : 0x34d399,
      emissive: isAbnormal ? 0x78350f : 0x065f46,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
      clippingPlanes: [clipPlane],
    }),
  );
  chiasm.position.set(0, -0.02, 0.52);
  group.add(chiasm);

  if (isAbnormal) {
    // 8.2 x 6.5 mm lobulated ACom saccular aneurysm dome with apical daughter bleb
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 28, 22),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.85,
        roughness: 0.22,
        side: THREE.DoubleSide,
        clippingPlanes: [clipPlane],
      }),
    );
    dome.scale.set(1.05, 1.24, 0.98);
    dome.position.set(0.02, 0.14, 0.69);
    group.add(dome);
    pulsating.push({ mesh: dome, baseScale: 1 });

    const bleb = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xea580c,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        side: THREE.DoubleSide,
        clippingPlanes: [clipPlane],
      }),
    );
    bleb.position.set(0.05, 0.25, 0.82);
    group.add(bleb);
  }

  group.position.set(0, -0.25, 0.05);
  return { group, pulsating };
}

function buildHcmSeptalOverlay(side: ViewportSide, clipPlane: THREE.Plane): {
  group: THREE.Group;
  pulsating: { mesh: THREE.Mesh; baseScale: number }[];
} {
  const group = new THREE.Group();
  const pulsating: { mesh: THREE.Mesh; baseScale: number }[] = [];
  const isAbnormal = side === "abnormal";

  // Intraventricular septum & LVOT tract indicator calibrated inside normalized heart GLB space
  const septumRadius = isAbnormal ? 0.24 : 0.105;
  const septum = new THREE.Mesh(
    new THREE.CapsuleGeometry(septumRadius, 0.56, 12, 24),
    new THREE.MeshStandardMaterial({
      color: isAbnormal ? 0xf43f5e : 0x10b981,
      emissive: isAbnormal ? 0x9f1239 : 0x047857,
      emissiveIntensity: isAbnormal ? 0.65 : 0.35,
      transparent: true,
      opacity: isAbnormal ? 0.82 : 0.58,
      roughness: 0.35,
      side: THREE.DoubleSide,
      clippingPlanes: [clipPlane],
    }),
  );
  septum.position.set(0.02, -0.05, 0.1);
  septum.rotation.z = 0.25;
  group.add(septum);
  if (isAbnormal) {
    pulsating.push({ mesh: septum, baseScale: 1 });
  }

  // LVOT outflow stream channel indicator
  const lvotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, -0.42, 0.16),
    new THREE.Vector3(-0.08, -0.08, 0.22),
    new THREE.Vector3(0.04, 0.42, 0.18),
  ]);
  const lvotRadius = isAbnormal ? 0.038 : 0.085;
  const lvot = new THREE.Mesh(
    new THREE.TubeGeometry(lvotCurve, 28, lvotRadius, 14, false),
    new THREE.MeshStandardMaterial({
      color: isAbnormal ? 0xf59e0b : 0x34d399,
      emissive: isAbnormal ? 0xb45309 : 0x059669,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      clippingPlanes: [clipPlane],
    }),
  );
  group.add(lvot);

  return { group, pulsating };
}

const glbBufferCache = new Map<string, Promise<ArrayBuffer>>();
function fetchGlbBufferCached(url: string): Promise<ArrayBuffer> {
  const existing = glbBufferCache.get(url);
  if (existing) return existing;
  const pending = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch ${url} (${r.status})`);
      return r.arrayBuffer();
    })
    .catch((err) => {
      glbBufferCache.delete(url);
      throw err;
    });
  glbBufferCache.set(url, pending);
  return pending;
}

export const Comparative3DViewport: React.FC<Comparative3DViewportProps> = ({
  caseId,
  normalLabel = "Canonical Reference",
  abnormalLabel = "Pathological Specimen",
}) => {
  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const handlesRef = useRef<{ normal: SideSceneHandle | null; abnormal: SideSceneHandle | null }>({
    normal: null,
    abnormal: null,
  });

  const [syncCameras, setSyncCameras] = useState(true);
  const [cutawayOverride, setCutawayOverride] = useState<{ caseId: string; value: number } | null>(null);
  const [xrayOverride, setXrayOverride] = useState<{ caseId: string; value: boolean } | null>(null);
  const [loadingCount, setLoadingCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const defaultXray = caseId === "case-circle-of-willis-aneurysm" || caseId === "case-hcm";
  const xrayMode = xrayOverride?.caseId === caseId ? xrayOverride.value : defaultXray;
  const cutawayPct = cutawayOverride?.caseId === caseId ? cutawayOverride.value : 100;

  const syncCamerasRef = useRef(syncCameras);
  useEffect(() => {
    syncCamerasRef.current = syncCameras;
  }, [syncCameras]);

  useEffect(() => {
    const leftEl = leftContainerRef.current;
    const rightEl = rightContainerRef.current;
    if (!leftEl || !rightEl) return;

    let cancelled = false;
    let rafId = 0;
    let isSyncing = false;

    const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    let sharedParsedModel: Promise<THREE.Group> | null = null;
    const loadSideModel = async (url: string): Promise<THREE.Group> => {
      if (!sharedParsedModel) {
        sharedParsedModel = fetchGlbBufferCached(url)
          .then((buf) => gltfLoader.parseAsync(buf.slice(0), "/models/"))
          .then((gltf) => gltf.scene);
      }
      const root = await sharedParsedModel;
      return root.clone(true);
    };

    const createViewportSide = async (
      container: HTMLDivElement,
      side: ViewportSide,
    ): Promise<SideSceneHandle | null> => {
      const width = Math.max(container.clientWidth, 240);
      const height = Math.max(container.clientHeight, 260);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        setWebglUnavailable(true);
        return null;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.localClippingEnabled = true;
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      configureLighting(scene);

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
      if (caseId === "case-disc-herniation") {
        camera.position.set(2.3, 1.35, -3.1);
      } else if (caseId === "case-circle-of-willis-aneurysm") {
        camera.position.set(1.6, -0.35, 3.6);
      } else {
        camera.position.set(0.95, 0.35, 4.1);
      }

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 1.6;
      controls.maxDistance = 10;
      controls.target.set(0, 0, 0);

      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
      const pulsatingMeshes: { mesh: THREE.Mesh; baseScale: number }[] = [];
      const wireframeTargets: { mesh: THREE.Mesh; baseOpacity: number; baseTransparent: boolean }[] = [];

      if (caseId === "case-hcm" || caseId === "case-circle-of-willis-aneurysm") {
        setLoadingCount((c) => c + 1);
        const url = caseId === "case-hcm" ? "/models/heart.glb" : "/models/brain.glb";
        try {
          const model = await loadSideModel(url);
          if (cancelled) {
            disposeObject(model);
            renderer.dispose();
            return null;
          }
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const scale = MODEL_FIT_SIZE / Math.max(size.x, size.y, size.z, 0.001);
          model.scale.setScalar(scale);
          model.position.copy(center.multiplyScalar(-scale));

          model.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            const cloned = mats.map((m) => {
              const mat = m.clone();
              mat.side = THREE.DoubleSide;
              mat.clippingPlanes = [clipPlane];
              if (caseId === "case-circle-of-willis-aneurysm") {
                mat.transparent = true;
                mat.opacity = 0.28;
                mat.depthWrite = false;
              }
              return mat;
            });
            child.material = cloned.length === 1 ? cloned[0] : cloned;
            const primary = cloned[0] as THREE.MeshStandardMaterial;
            wireframeTargets.push({
              mesh: child,
              baseOpacity: primary.opacity ?? 1,
              baseTransparent: Boolean(primary.transparent),
            });
          });

          rootGroup.add(model);

          if (caseId === "case-hcm") {
            const overlay = buildHcmSeptalOverlay(side, clipPlane);
            rootGroup.add(overlay.group);
            pulsatingMeshes.push(...overlay.pulsating);
          } else {
            const overlay = buildCircleOfWillisOverlay(side, clipPlane);
            rootGroup.add(overlay.group);
            pulsatingMeshes.push(...overlay.pulsating);
          }
        } catch (err) {
          setLoadError(err instanceof Error ? err.message : "Failed to load 3D anatomy asset.");
        } finally {
          setLoadingCount((c) => Math.max(0, c - 1));
        }
      } else {
        const spine = buildLumbarSpineUnit(side, clipPlane);
        rootGroup.add(spine.group);
        pulsatingMeshes.push(...spine.pulsating);
        wireframeTargets.push(...spine.wireTargets);
      }

      const finalBox = new THREE.Box3().setFromObject(rootGroup);
      const boxMinY = Number.isFinite(finalBox.min.y) ? finalBox.min.y : -1.8;
      const boxMaxY = Number.isFinite(finalBox.max.y) ? finalBox.max.y : 1.8;

      const handle: SideSceneHandle = {
        renderer,
        scene,
        camera,
        controls,
        rootGroup,
        clipPlane,
        boxMinY,
        boxMaxY,
        pulsatingMeshes,
        wireframeTargets,
      };
      return handle;
    };

    const syncPair = (sourceSide: ViewportSide) => {
      if (!syncCamerasRef.current || isSyncing) return;
      const src = handlesRef.current[sourceSide];
      const dst = handlesRef.current[sourceSide === "normal" ? "abnormal" : "normal"];
      if (!src || !dst) return;
      isSyncing = true;
      dst.camera.position.copy(src.camera.position);
      dst.camera.quaternion.copy(src.camera.quaternion);
      dst.controls.target.copy(src.controls.target);
      dst.controls.update();
      isSyncing = false;
    };

    const init = async () => {
      setLoadError(null);
      const [normalHandle, abnormalHandle] = await Promise.all([
        createViewportSide(leftEl, "normal"),
        createViewportSide(rightEl, "abnormal"),
      ]);
      if (cancelled) {
        for (const h of [normalHandle, abnormalHandle]) {
          if (!h) continue;
          h.controls.dispose();
          disposeObject(h.scene);
          h.renderer.dispose();
        }
        return;
      }

      handlesRef.current = { normal: normalHandle, abnormal: abnormalHandle };

      normalHandle?.controls.addEventListener("change", () => syncPair("normal"));
      abnormalHandle?.controls.addEventListener("change", () => syncPair("abnormal"));

      const startMs = performance.now();
      const renderLoop = () => {
        if (cancelled) return;
        const t = (performance.now() - startMs) * 0.001;
        for (const h of [handlesRef.current.normal, handlesRef.current.abnormal]) {
          if (!h) continue;
          for (const item of h.pulsatingMeshes) {
            const pulse = item.baseScale * (1 + 0.055 * Math.sin(t * 3.2));
            item.mesh.scale.setScalar(pulse);
          }
          h.controls.update();
          h.renderer.render(h.scene, h.camera);
        }
        rafId = requestAnimationFrame(renderLoop);
      };
      renderLoop();
    };

    void init();

    const resizeObserver = new ResizeObserver(() => {
      for (const [el, handle] of [
        [leftEl, handlesRef.current.normal],
        [rightEl, handlesRef.current.abnormal],
      ] as const) {
        if (!el || !handle) continue;
        const w = Math.max(el.clientWidth, 200);
        const h = Math.max(el.clientHeight, 220);
        handle.camera.aspect = w / h;
        handle.camera.updateProjectionMatrix();
        handle.renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(leftEl);
    resizeObserver.observe(rightEl);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      for (const h of [handlesRef.current.normal, handlesRef.current.abnormal]) {
        if (!h) continue;
        h.controls.dispose();
        disposeObject(h.scene);
        h.renderer.forceContextLoss();
        h.renderer.dispose();
      }
      handlesRef.current = { normal: null, abnormal: null };
    };
  }, [caseId]);

  // Apply Cutaway Y-Plane & X-Ray surface translucency dynamically without recreating WebGL contexts
  useEffect(() => {
    for (const h of [handlesRef.current.normal, handlesRef.current.abnormal]) {
      if (!h) continue;
      const ratio = cutawayPct / 100;
      const thresholdY =
        ratio >= 0.99
          ? 25
          : h.boxMinY + (h.boxMaxY - h.boxMinY) * ratio;
      h.clipPlane.constant = thresholdY;

      for (const target of h.wireframeTargets) {
        const mats = Array.isArray(target.mesh.material)
          ? target.mesh.material
          : [target.mesh.material];
        for (const m of mats) {
          if (!("opacity" in m)) continue;
          const std = m as THREE.MeshStandardMaterial;
          if (xrayMode) {
            std.transparent = true;
            std.opacity = caseId === "case-circle-of-willis-aneurysm" ? 0.22 : 0.34;
            std.depthWrite = false;
          } else {
            std.transparent = target.baseTransparent;
            std.opacity = target.baseOpacity;
            std.depthWrite = !target.baseTransparent;
          }
          std.needsUpdate = true;
        }
      }
    }
  }, [cutawayPct, xrayMode, caseId, loadingCount]);

  const handleResetView = () => {
    for (const h of [handlesRef.current.normal, handlesRef.current.abnormal]) {
      if (!h) continue;
      h.controls.target.set(0, 0, 0);
      if (caseId === "case-disc-herniation") {
        h.camera.position.set(2.3, 1.35, -3.1);
      } else if (caseId === "case-circle-of-willis-aneurysm") {
        h.camera.position.set(1.6, -0.35, 3.6);
      } else {
        h.camera.position.set(0.95, 0.35, 4.1);
      }
      h.controls.update();
    }
    setCutawayOverride({ caseId, value: 100 });
  };

  if (webglUnavailable) {
    return (
      <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200">
        WebGL is unavailable in this environment — switch to the Structural Delta Matrix tab to inspect quantitative morphological differences.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Synchronized 3D Viewport Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-slate-900 border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSyncCameras((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors border ${
              syncCameras
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
            }`}
          >
            {syncCameras ? <Link2 size={13} /> : <Link2Off size={13} />}
            {syncCameras ? "Camera Sync Locked" : "Independent Orbit"}
          </button>

          <button
            type="button"
            onClick={() => setXrayOverride({ caseId, value: !xrayMode })}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors border ${
              xrayMode
                ? "bg-cyan-600 text-white border-cyan-500"
                : "bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
            }`}
          >
            <Eye size={13} />
            {xrayMode ? "Translucent X-Ray ON" : "Opaque Surface"}
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 flex items-center gap-1"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2.5 min-w-[210px]">
          <Scissors size={13} className="text-indigo-500 shrink-0" />
          <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
            Axial Cutaway ({cutawayPct}%)
          </span>
          <input
            type="range"
            min={20}
            max={100}
            value={cutawayPct}
            onChange={(e) => setCutawayOverride({ caseId, value: Number(e.target.value) })}
            aria-label="Axial cutaway clipping plane"
            className="w-28 accent-indigo-600 cursor-pointer"
          />
        </div>
      </div>

      {loadError && (
        <div className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-300">
          Asset notice: {loadError}
        </div>
      )}

      {/* Synchronized Dual 3D WebGL Viewports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-slate-950 border border-emerald-500/35 overflow-hidden relative shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                {normalLabel}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1">
              <Layers size={11} /> Drag to Orbit
            </span>
          </div>
          <div ref={leftContainerRef} className="w-full h-72 relative cursor-grab active:cursor-grabbing" />
          <div
            aria-hidden={loadingCount <= 0}
            className={`absolute inset-0 top-9 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-slate-300 pointer-events-none transition-opacity duration-200 ${
              loadingCount > 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <Loader2 size={15} className="animate-spin text-emerald-400" />
            Loading 3D Mesh...
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-rose-500/35 overflow-hidden relative shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                {abnormalLabel}
              </span>
            </div>
            <span className="text-[10px] font-mono text-rose-400/90 flex items-center gap-1">
              <Layers size={11} /> Synchronized Lesion
            </span>
          </div>
          <div ref={rightContainerRef} className="w-full h-72 relative cursor-grab active:cursor-grabbing" />
          <div
            aria-hidden={loadingCount <= 0}
            className={`absolute inset-0 top-9 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-slate-300 pointer-events-none transition-opacity duration-200 ${
              loadingCount > 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <Loader2 size={15} className="animate-spin text-rose-400" />
            Loading 3D Lesion...
          </div>
        </div>
      </div>
    </div>
  );
};

