"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { sounds } from "@/app/lib/sound";
import {
  Activity,
  AlertTriangle,
  Compass,
  Crosshair,
  Eye,
  Layers,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Upload,
  Zap,
} from "lucide-react";
import {
  analyzeNerveSegmentationProbs,
  buildSegmentationOverlayRgba,
} from "@/lib/imaging/nerve-biometrics";
import { runBrachialPlexusOnnxInference } from "@/lib/imaging/nerve-onnx-runtime";

function resolveAtlasNerveId(onnxCode: string): string {
  if (onnxCode === "C7/MT") return "C7";
  if (onnxCode === "C8/LT") return "C8";
  if (onnxCode === "AD") return "MT";
  if (onnxCode === "PD") return "LT";
  return onnxCode;
}

interface SyntheticScanOptions {
  selectedNerveId: string;
  gain: number;
  pathologyMode: "normal" | "erbs_palsy";
  includeAnnotations: boolean;
  showLandmarks: boolean;
  showMasks: boolean;
  needleMode: boolean;
  needlePos: { x: number; y: number };
}

function drawSyntheticBModeFrame(
  ctx: CanvasRenderingContext2D,
  opts: SyntheticScanOptions,
): void {
  const width = 416;
  const height = 416;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Deterministic pseudo-random acoustic speckle grain for reproducible ONNX scans
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let y = 0; y < height; y++) {
    const depthFactor = 1.0 - (y / height) * 0.35;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const noise =
        (nextRand() * 45 + Math.sin(x * 0.15) * 12 + Math.cos(y * 0.12) * 12) *
        (opts.gain / 50) *
        depthFactor;
      const baseVal = Math.min(255, Math.max(10, Math.floor(noise)));

      data[idx] = baseVal;
      data[idx + 1] = baseVal;
      data[idx + 2] = Math.min(255, baseVal + (opts.includeAnnotations ? 5 : 0));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Muscular fascia boundaries (Anterior & Middle Scalene)
  ctx.strokeStyle = opts.includeAnnotations
    ? "rgba(220, 235, 255, 0.4)"
    : "rgba(215, 215, 215, 0.38)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(100, 70);
  ctx.bezierCurveTo(150, 120, 190, 240, 240, 360);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(170, 60);
  ctx.bezierCurveTo(230, 110, 270, 230, 320, 360);
  ctx.stroke();

  // Subclavian Artery lumen
  if (opts.showLandmarks || !opts.includeAnnotations) {
    ctx.fillStyle = "rgba(10, 15, 22, 0.95)";
    ctx.beginPath();
    ctx.arc(285, 345, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = opts.includeAnnotations
      ? "rgba(56, 189, 248, 0.8)"
      : "rgba(220, 220, 220, 0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (opts.includeAnnotations) {
      ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
      ctx.font = "bold 11px system-ui";
      ctx.fillText("SCA (Artery)", 255, 350);
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "italic 11px system-ui";
      ctx.fillText("Anterior Scalene", 60, 140);
      ctx.fillText("Middle Scalene", 280, 160);
    }
  }

  // Hypoechoic Nerve Fascicles
  BRACHIAL_PLEXUS_DATA.forEach((nerve) => {
    const isSelected = nerve.id === opts.selectedNerveId;
    const isDamaged =
      opts.pathologyMode === "erbs_palsy" && (nerve.id === "C5" || nerve.id === "UT");

    ctx.fillStyle =
      opts.includeAnnotations && isDamaged
        ? "rgba(180, 50, 50, 0.7)"
        : "rgba(14, 18, 24, 0.95)";
    ctx.beginPath();
    const swellScale = !opts.includeAnnotations && isDamaged ? 1.25 : 1.0;
    const radiusX = ((nerve.box[2] - nerve.box[0]) / 2) * swellScale;
    const radiusY = ((nerve.box[3] - nerve.box[1]) / 2) * swellScale;
    ctx.ellipse(nerve.center[0], nerve.center[1], radiusX, radiusY, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle =
      opts.includeAnnotations && isDamaged
        ? "rgba(239, 68, 68, 0.9)"
        : "rgba(235, 240, 245, 0.65)";
    ctx.lineWidth = opts.includeAnnotations && isSelected ? 3.5 : 1.5;
    ctx.stroke();

    if (opts.includeAnnotations && opts.showMasks) {
      ctx.fillStyle = `${nerve.color}40`;
      ctx.beginPath();
      ctx.ellipse(nerve.center[0], nerve.center[1], radiusX * 1.05, radiusY * 1.05, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = nerve.color;
      ctx.lineWidth = isSelected ? 3.5 : 1.5;
      ctx.stroke();

      ctx.fillStyle = isSelected ? "#ffffff" : nerve.color;
      ctx.font = isSelected ? "bold 13px system-ui" : "bold 11px system-ui";
      ctx.fillText(nerve.id, nerve.center[0] - 8, nerve.center[1] + 4);
    }
  });

  if (opts.includeAnnotations && opts.needleMode) {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(30, 80);
    ctx.lineTo(opts.needlePos.x, opts.needlePos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(opts.needlePos.x, opts.needlePos.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 11px system-ui";
    ctx.fillText("22G Block Needle", 35, 75);
  }
}

// Structure definition matching native Anatomy Atelier Brachial Plexus
export interface NerveStructure {
  id: string;
  name: string;
  category: "root" | "trunk" | "nerve" | "landmark";
  color: string;
  box: [number, number, number, number]; // [x1, y1, x2, y2]
  center: [number, number];
  threeDCoords: [number, number, number];
  description: string;
  clinicalSignificance: string;
  innervation: string;
  motorDeficit: string;
}

export const BRACHIAL_PLEXUS_DATA: NerveStructure[] = [
  {
    id: "C5",
    name: "C5 Nerve Root",
    category: "root",
    color: "#38bdf8",
    box: [160, 115, 205, 162],
    center: [182, 138],
    threeDCoords: [0.08, 1.48, -0.02],
    description: "Superior-most root in the interscalene groove, exiting between anterior and middle scalene muscles.",
    clinicalSignificance: "Major contributor to upper trunk and axillary/musculocutaneous nerves.",
    innervation: "Deltoid, supraspinatus, infraspinatus, biceps brachii.",
    motorDeficit: "Loss of shoulder abduction (0-15° supraspinatus, 15-90° deltoid) and elbow flexion."
  },
  {
    id: "C6",
    name: "C6 Nerve Root",
    category: "root",
    color: "#4ade80",
    box: [178, 170, 226, 220],
    center: [202, 195],
    threeDCoords: [0.09, 1.45, -0.02],
    description: "Located immediately inferior to C5; often the largest root in the interscalene space.",
    clinicalSignificance: "Confluences with C5 to form the Upper Trunk at Erb's Point.",
    innervation: "Brachioradialis, extensor carpi radialis longus, biceps.",
    motorDeficit: "Diminished brachioradialis reflex; numbness over thumb and radial forearm."
  },
  {
    id: "C7",
    name: "C7 Nerve Root",
    category: "root",
    color: "#facc15",
    box: [204, 230, 252, 282],
    center: [228, 256],
    threeDCoords: [0.10, 1.42, -0.02],
    description: "Emerges from C6-C7 foramen; continues directly as the Middle Trunk.",
    clinicalSignificance: "Key extensor root distributing through the posterior cord to radial nerve.",
    innervation: "Triceps brachii, wrist and finger extensors, pronator teres.",
    motorDeficit: "Triceps reflex depression; weakness of elbow and wrist extension ('wrist drop')."
  },
  {
    id: "C8",
    name: "C8 Nerve Root",
    category: "root",
    color: "#f97316",
    box: [232, 292, 276, 342],
    center: [254, 317],
    threeDCoords: [0.11, 1.39, -0.02],
    description: "Emerges beneath C7 vertebra; passes over neck of 1st rib to join T1.",
    clinicalSignificance: "Forms the Lower Trunk; supplies the flexor compartment and hand intrinsics.",
    innervation: "Flexor digitorum profundus, interossei, thenar/hypothenar muscles.",
    motorDeficit: "Weakness in finger flexors and grip strength; numbness along ulnar border."
  },
  {
    id: "UT",
    name: "Upper Trunk",
    category: "trunk",
    color: "#818cf8",
    box: [168, 135, 224, 212],
    center: [196, 173],
    threeDCoords: [0.12, 1.43, -0.01],
    description: "Formed by C5 + C6 roots at the lateral edge of the scalenus medius (Erb's Point).",
    clinicalSignificance: "Classic site of Erb-Duchenne palsy from birth injury or motorcycle shoulder impact.",
    innervation: "Axillary, musculocutaneous, and suprascapular nerve distributions.",
    motorDeficit: "'Waiter's tip' posture: arm adducted, internally rotated, elbow extended, forearm pronated."
  },
  {
    id: "MT",
    name: "Middle Trunk",
    category: "trunk",
    color: "#a855f7",
    box: [214, 225, 260, 275],
    center: [237, 250],
    threeDCoords: [0.13, 1.40, -0.01],
    description: "Direct anatomical continuation of C7 root across the posterior cervical triangle.",
    clinicalSignificance: "Isolated injury is rare; manifests as predominant C7 distribution deficit.",
    innervation: "Radial nerve distributions to triceps, finger extensors.",
    motorDeficit: "Weakness of elbow extension and wrist extension."
  },
  {
    id: "LT",
    name: "Lower Trunk",
    category: "trunk",
    color: "#fb7185",
    box: [240, 285, 285, 335],
    center: [262, 310],
    threeDCoords: [0.14, 1.37, -0.01],
    description: "Formed by confluence of C8 and T1 anterior rami, coursing posterior to the subclavian artery.",
    clinicalSignificance: "Klumpke's palsy site; thoracic outlet syndrome compression over cervical rib.",
    innervation: "Ulnar nerve, medial cord, intrinsic hand muscles.",
    motorDeficit: "Claw hand deformity, interossei atrophy, severe loss of fine motor grip."
  },
  {
    id: "SSN",
    name: "Suprascapular Nerve",
    category: "nerve",
    color: "#ec4899",
    box: [138, 155, 174, 195],
    center: [156, 175],
    threeDCoords: [0.15, 1.41, -0.03],
    description: "Earliest branch of the upper trunk; courses beneath trapezius to supraspinatus notch.",
    clinicalSignificance: "Vulnerable to entrapment at the transverse scapular ligament.",
    innervation: "Supraspinatus and infraspinatus muscles (rotator cuff).",
    motorDeficit: "Profound external rotation weakness and early shoulder abduction initiation failure."
  }
];

/**
 * Embedded Interactive 3D Cervical Spine & Brachial Plexus Atlas
 */
function BrachialPlexus3DAtlas({
  selectedNerve,
  onSelectNerve,
  focusPulseCount,
  onOpenAtlas,
}: {
  selectedNerve: NerveStructure;
  onSelectNerve: (nerve: NerveStructure) => void;
  focusPulseCount: number;
  onOpenAtlas?: () => void;
  theme?: "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nerveMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const beaconMeshRef = useRef<THREE.Mesh | null>(null);
  const beaconRingRef = useRef<THREE.Mesh | null>(null);
  const slicePlaneRef = useRef<THREE.Mesh | null>(null);
  const onSelectNerveRef = useRef(onSelectNerve);

  useEffect(() => {
    onSelectNerveRef.current = onSelectNerve;
  }, [onSelectNerve]);

  const [autoRotate, setAutoRotate] = useState(false);
  const [showUsPlane, setShowUsPlane] = useState(true);
  const [pulseActive, setPulseActive] = useState(false);

  // Initialize Three.js Scene for 3D Cervical Spine & Brachial Plexus
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animId: number;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 320;

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
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera & Controls centered on C5 coordinate [0.08, 1.48, -0.02]
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.01, 50);
    cameraRef.current = camera;
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.15;
    controls.maxDistance = 3.0;

    const initialTarget = new THREE.Vector3(0.08, 1.43, -0.02);
    controls.target.copy(initialTarget);
    camera.position.set(0.42, 1.62, 0.52);
    camera.lookAt(initialTarget);

    // 1. Studio Lighting - balanced medical illumination
    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.55));

    const keyLight = new THREE.DirectionalLight(0xfffbf5, 1.25);
    keyLight.position.set(1.2, 2.4, 1.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.45);
    fillLight.position.set(-1.2, 1.2, 0.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf1f5f9, 0.55);
    rimLight.position.set(0.0, 2.0, -1.8);
    scene.add(rimLight);

    // 2. Anatomical Cervical Vertebrae (C4, C5, C6, C7, T1)
    const boneMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f2e8,
      roughness: 0.35,
      metalness: 0.05,
    });

    const discMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.25,
      metalness: 0.05,
      transmission: 0.35,
      opacity: 0.85,
      transparent: true,
    });

    const vertebraeData = [
      { id: "C4", y: 1.54, radius: 0.038, height: 0.022, spinousLength: 0.04 },
      { id: "C5", y: 1.48, radius: 0.040, height: 0.023, spinousLength: 0.042 },
      { id: "C6", y: 1.42, radius: 0.042, height: 0.024, spinousLength: 0.045 },
      { id: "C7", y: 1.36, radius: 0.044, height: 0.025, spinousLength: 0.065 }, // Vertebra prominens
      { id: "T1", y: 1.30, radius: 0.048, height: 0.026, spinousLength: 0.070 },
    ];

    vertebraeData.forEach((v, idx) => {
      const vGroup = new THREE.Group();

      // Vertebral Body
      const bodyGeom = new THREE.CylinderGeometry(v.radius, v.radius * 1.05, v.height, 24);
      const bodyMesh = new THREE.Mesh(bodyGeom, boneMaterial);
      vGroup.add(bodyMesh);

      // Spinous Process (pointing posterior, -Z)
      const spinousGeom = new THREE.ConeGeometry(0.012, v.spinousLength, 12);
      const spinousMesh = new THREE.Mesh(spinousGeom, boneMaterial);
      spinousMesh.rotation.x = Math.PI / 2.2;
      spinousMesh.position.set(0, -0.005, -v.radius - v.spinousLength * 0.45);
      vGroup.add(spinousMesh);

      // Transverse Processes (pointing lateral ±X)
      const tpGeom = new THREE.CylinderGeometry(0.008, 0.012, 0.045, 12);
      const tpRight = new THREE.Mesh(tpGeom, boneMaterial);
      tpRight.rotation.z = Math.PI / 2;
      tpRight.position.set(v.radius + 0.018, 0, -0.005);
      vGroup.add(tpRight);

      const tpLeft = new THREE.Mesh(tpGeom, boneMaterial);
      tpLeft.rotation.z = -Math.PI / 2;
      tpLeft.position.set(-v.radius - 0.018, 0, -0.005);
      vGroup.add(tpLeft);

      vGroup.position.set(0, v.y, 0);
      scene.add(vGroup);

      // Intervertebral Disc
      if (idx < vertebraeData.length - 1) {
        const nextV = vertebraeData[idx + 1];
        const discY = (v.y + nextV.y) / 2;
        const discMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(v.radius * 0.98, v.radius * 0.98, 0.009, 24),
          discMaterial
        );
        discMesh.position.set(0, discY, 0);
        scene.add(discMesh);
      }
    });

    // 3. Scalene Muscles (Defining the Interscalene Groove)
    // Anterior Scalene (medial boundary)
    const antScaleneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 1.55, 0.01),
      new THREE.Vector3(0.065, 1.46, 0.00),
      new THREE.Vector3(0.085, 1.34, -0.01),
    ]);
    const antScaleneGeom = new THREE.TubeGeometry(antScaleneCurve, 20, 0.022, 16, false);
    const scaleneMat = new THREE.MeshPhysicalMaterial({
      color: 0x991b1b,
      roughness: 0.4,
      metalness: 0.05,
      opacity: 0.45,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const antScaleneMesh = new THREE.Mesh(antScaleneGeom, scaleneMat);
    scene.add(antScaleneMesh);

    // Middle Scalene (lateral boundary)
    const midScaleneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 1.56, -0.03),
      new THREE.Vector3(0.11, 1.45, -0.04),
      new THREE.Vector3(0.14, 1.33, -0.035),
    ]);
    const midScaleneGeom = new THREE.TubeGeometry(midScaleneCurve, 20, 0.024, 16, false);
    const midScaleneMesh = new THREE.Mesh(midScaleneGeom, scaleneMat);
    scene.add(midScaleneMesh);

    // 4. Subclavian Artery (pulsatile red conduit passing over 1st rib)
    const arteryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, 1.28, 0.02),
      new THREE.Vector3(0.09, 1.32, 0.00),
      new THREE.Vector3(0.15, 1.31, -0.02),
      new THREE.Vector3(0.20, 1.27, -0.04),
    ]);
    const arteryGeom = new THREE.TubeGeometry(arteryCurve, 24, 0.014, 16, false);
    const arteryMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.25,
      metalness: 0.1,
    });
    const arteryMesh = new THREE.Mesh(arteryGeom, arteryMat);
    scene.add(arteryMesh);

    // 5. 1st Rib (ivory bony base)
    const ribCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.03, 1.29, -0.03),
      new THREE.Vector3(0.10, 1.27, -0.01),
      new THREE.Vector3(0.18, 1.25, 0.01),
    ]);
    const ribGeom = new THREE.TubeGeometry(ribCurve, 20, 0.016, 16, false);
    const ribMesh = new THREE.Mesh(ribGeom, boneMaterial);
    scene.add(ribMesh);

    // 6. 3D Brachial Plexus Nerve Network
    const meshesMap = new Map<string, THREE.Mesh>();

    const nerveCurves: Record<string, THREE.Vector3[]> = {
      C5: [
        new THREE.Vector3(0.035, 1.51, -0.005),
        new THREE.Vector3(0.065, 1.49, -0.015),
        new THREE.Vector3(0.080, 1.48, -0.020), // Target coordinate
        new THREE.Vector3(0.105, 1.45, -0.015),
        new THREE.Vector3(0.120, 1.43, -0.010), // Upper trunk confluence
      ],
      C6: [
        new THREE.Vector3(0.038, 1.45, -0.005),
        new THREE.Vector3(0.070, 1.45, -0.015),
        new THREE.Vector3(0.090, 1.45, -0.020),
        new THREE.Vector3(0.108, 1.44, -0.015),
        new THREE.Vector3(0.120, 1.43, -0.010), // Joins C5 at Erb's Point
      ],
      C7: [
        new THREE.Vector3(0.040, 1.39, -0.005),
        new THREE.Vector3(0.075, 1.40, -0.015),
        new THREE.Vector3(0.100, 1.42, -0.020),
        new THREE.Vector3(0.120, 1.41, -0.015),
        new THREE.Vector3(0.130, 1.40, -0.010), // Middle trunk continuation
      ],
      C8: [
        new THREE.Vector3(0.042, 1.33, -0.005),
        new THREE.Vector3(0.080, 1.36, -0.015),
        new THREE.Vector3(0.110, 1.39, -0.020),
        new THREE.Vector3(0.130, 1.38, -0.015),
        new THREE.Vector3(0.140, 1.37, -0.010), // Lower trunk
      ],
      UT: [
        new THREE.Vector3(0.120, 1.43, -0.010),
        new THREE.Vector3(0.140, 1.41, -0.015),
        new THREE.Vector3(0.165, 1.38, -0.020),
        new THREE.Vector3(0.185, 1.35, -0.025),
      ],
      MT: [
        new THREE.Vector3(0.130, 1.40, -0.010),
        new THREE.Vector3(0.150, 1.38, -0.015),
        new THREE.Vector3(0.170, 1.35, -0.020),
      ],
      LT: [
        new THREE.Vector3(0.140, 1.37, -0.010),
        new THREE.Vector3(0.160, 1.35, -0.015),
        new THREE.Vector3(0.180, 1.32, -0.020),
      ],
      SSN: [
        new THREE.Vector3(0.125, 1.42, -0.010),
        new THREE.Vector3(0.140, 1.42, -0.020),
        new THREE.Vector3(0.150, 1.41, -0.030), // Target coordinate
        new THREE.Vector3(0.170, 1.39, -0.045),
        new THREE.Vector3(0.190, 1.37, -0.060),
      ],
    };

    BRACHIAL_PLEXUS_DATA.forEach((nerve) => {
      const points = nerveCurves[nerve.id];
      if (!points) return;

      const curve = new THREE.CatmullRomCurve3(points);
      const geom = new THREE.TubeGeometry(curve, 28, 0.007, 12, false);
      const color = new THREE.Color(nerve.color);

      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.1,
        emissive: color,
        emissiveIntensity: 0.08,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData = { nerveId: nerve.id };
      scene.add(mesh);
      meshesMap.set(nerve.id, mesh);
    });

    nerveMeshesRef.current = meshesMap;

    // 7. 3D Locator Beacon & Glowing Pulse Indicator
    const beaconGeom = new THREE.SphereGeometry(0.008, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    scene.add(beaconMesh);
    beaconMeshRef.current = beaconMesh;

    const ringGeom = new THREE.RingGeometry(0.014, 0.018, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const beaconRing = new THREE.Mesh(ringGeom, ringMat);
    scene.add(beaconRing);
    beaconRingRef.current = beaconRing;

    // 8. 3D Ultrasound Probe Transducer Cut Plane
    const usPlaneGeom = new THREE.PlaneGeometry(0.16, 0.16);
    const usPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const usPlaneMesh = new THREE.Mesh(usPlaneGeom, usPlaneMat);
    usPlaneMesh.rotation.set(Math.PI / 2.3, 0.2, 0.1);
    usPlaneMesh.position.set(0.09, 1.45, -0.02);

    const edges = new THREE.EdgesGeometry(usPlaneGeom);
    const edgeLine = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
    );
    usPlaneMesh.add(edgeLine);
    scene.add(usPlaneMesh);
    slicePlaneRef.current = usPlaneMesh;

    // Raycaster for clicking 3D nerves
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(meshesMap.values());
      const hits = raycaster.intersectObjects(meshes);

      if (hits.length > 0) {
        const hitId = hits[0].object.userData?.nerveId;
        const found = BRACHIAL_PLEXUS_DATA.find((n) => n.id === hitId);
        if (found) {
          sounds.playClick();
          onSelectNerveRef.current(found);
        }
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

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

    // Render loop with beacon pulse animation
    let clock = 0;
    const animate = () => {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      clock += 0.05;

      controls.update();

      // Pulse beacon
      if (beaconRingRef.current) {
        const scale = 1 + Math.sin(clock * 3) * 0.25;
        beaconRingRef.current.scale.set(scale, scale, 1);
        beaconRingRef.current.lookAt(camera.position);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.forceContextLoss();
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, []);

  // Update selection, pulse, and camera target when selectedNerve or focusPulseCount changes
  useEffect(() => {
    const meshesMap = nerveMeshesRef.current;
    const beacon = beaconMeshRef.current;
    const beaconRing = beaconRingRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Update meshes emissive highlight
    BRACHIAL_PLEXUS_DATA.forEach((n) => {
      const mesh = meshesMap.get(n.id);
      if (!mesh) return;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isSelected = n.id === selectedNerve.id;
      mat.emissiveIntensity = isSelected ? 0.95 : 0.08;
    });

    // Update 3D beacon position
    const [bx, by, bz] = selectedNerve.threeDCoords;
    if (beacon && beaconRing) {
      beacon.position.set(bx, by, bz);
      beaconRing.position.set(bx, by, bz);
      const color = new THREE.Color(selectedNerve.color);
      (beacon.material as THREE.MeshBasicMaterial).color = color;
      (beaconRing.material as THREE.MeshBasicMaterial).color = color;
    }

    // Smoothly fly camera to selected 3D coordinate
    if (camera && controls) {
      const targetPos = new THREE.Vector3(bx, by, bz);
      controls.target.copy(targetPos);

      // Camera offset: slightly anterior and superior to view the interscalene groove
      const camPos = new THREE.Vector3(bx + 0.28, by + 0.14, bz + 0.38);
      camera.position.copy(camPos);
      camera.lookAt(targetPos);
      controls.update();
    }

    const startTimer = setTimeout(() => setPulseActive(true), 0);
    const stopTimer = setTimeout(() => setPulseActive(false), 800);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(stopTimer);
    };
  }, [selectedNerve, focusPulseCount]);

  // Toggle Ultrasound Probe Slice Plane
  useEffect(() => {
    if (slicePlaneRef.current) {
      slicePlaneRef.current.visible = showUsPlane;
    }
  }, [showUsPlane]);

  // Auto-rotate toggle
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.5;
    }
  }, [autoRotate]);

  const resetView = () => {
    sounds.playClick();
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const [bx, by, bz] = selectedNerve.threeDCoords;
    controls.target.set(bx, by, bz);
    camera.position.set(bx + 0.32, by + 0.16, bz + 0.44);
    camera.lookAt(bx, by, bz);
    controls.update();
  };

  return (
    <div className="relative w-full h-[320px] rounded-3xl bg-neutral-950 border border-neutral-800 overflow-hidden flex flex-col shadow-inner">
      {/* 3D Top Overlay Bar */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: selectedNerve.color }}
          />
          <div className="p-1 px-2.5 rounded-xl bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md">
            <span>3D Cervical Atlas:</span>
            <span style={{ color: selectedNerve.color }}>{selectedNerve.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowUsPlane(!showUsPlane)}
            className={`p-1.5 px-2 rounded-xl text-[10px] font-bold transition-all border ${
              showUsPlane
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-neutral-900/80 text-neutral-400 border-neutral-800"
            }`}
            title="Toggle Ultrasound Beam Cut Plane"
          >
            US Plane
          </button>

          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-xl text-xs transition-all ${
              autoRotate ? "bg-amber-500 text-white" : "bg-neutral-900/80 text-neutral-300 hover:text-white"
            }`}
            title="Auto Rotate"
          >
            {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          </button>

          <button
            type="button"
            onClick={resetView}
            className="p-1.5 rounded-xl bg-neutral-900/80 text-neutral-300 hover:text-white transition-colors"
            title="Reset View"
          >
            <RotateCcw size={12} />
          </button>

          {onOpenAtlas && (
            <button
              type="button"
              onClick={() => {
                sounds.playCelebration();
                onOpenAtlas();
              }}
              className="p-1.5 px-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all"
              title="Open in Full 3D Human Body Atlas"
            >
              <Compass size={12} />
              <span>Full Atlas</span>
            </button>
          )}
        </div>
      </div>

      {/* Three.js Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Coordinate Badge */}
      <div className="absolute bottom-2.5 left-3 p-2 rounded-xl bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md text-[10px] font-mono text-neutral-300 pointer-events-none flex items-center gap-2 shadow-md">
        <MapPin size={11} style={{ color: selectedNerve.color }} />
        <span>
          3D Coord: [{selectedNerve.threeDCoords.join(", ")}] · Spine: C4–T1
        </span>
        {pulseActive && (
          <span className="text-amber-400 font-bold animate-pulse text-[9px] uppercase">
            ✦ Synced
          </span>
        )}
      </div>

      {/* Floating Orientation Compass Indicator */}
      <div className="absolute bottom-2.5 right-3 text-[9px] text-neutral-500 font-mono pointer-events-none">
        Anterior ➔ | Superior ⬆
      </div>
    </div>
  );
}

export function NerveExplorer({
  onSelect3DStructure,
  onOpenAtlas,
  theme = "light",
}: {
  onSelect3DStructure?: (id: string, coords: [number, number, number]) => void;
  onOpenAtlas?: () => void;
  theme?: "light" | "dark";
}) {
  const [selectedNerveId, setSelectedNerveId] = useState<string>("C5");
  const [showMasks, setShowMasks] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [isLiveSegmenting, setIsLiveSegmenting] = useState(false);
  const [needleMode, setNeedleMode] = useState(false);
  const [needlePos, setNeedlePos] = useState({ x: 90, y: 150 });
  const gain = 65;
  const [depth, setDepth] = useState(3.5);
  const [pathologyMode, setPathologyMode] = useState<"normal" | "erbs_palsy">("normal");
  const [focusPulseCount, setFocusPulseCount] = useState(0);
  const [uploadedScan, setUploadedScan] = useState<{
    img: HTMLImageElement;
    fileName: string;
  } | null>(null);
  const [onnxOutput, setOnnxOutput] = useState<{
    probs: Float32Array;
    inferenceMs: number;
    modelLoadMs: number;
    sourceName: string;
  } | null>(null);
  const [onnxError, setOnnxError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedNerve = useMemo(
    () => BRACHIAL_PLEXUS_DATA.find((n) => n.id === selectedNerveId) || BRACHIAL_PLEXUS_DATA[0],
    [selectedNerveId]
  );

  const onnxSummary = useMemo(() => {
    if (!onnxOutput) return null;
    return analyzeNerveSegmentationProbs(onnxOutput.probs, {
      width: 416,
      height: 416,
      depthCm: depth,
      minClassProb: 0.25,
      minPixelCount: 24,
    });
  }, [onnxOutput, depth]);

  // Render active ultrasound scan + real ONNX or educational overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 416;
    const height = 416;
    canvas.width = width;
    canvas.height = height;

    if (uploadedScan) {
      ctx.drawImage(uploadedScan.img, 0, 0, width, height);
    } else {
      drawSyntheticBModeFrame(ctx, {
        selectedNerveId,
        gain,
        pathologyMode,
        includeAnnotations: !onnxOutput,
        showLandmarks,
        showMasks,
        needleMode,
        needlePos,
      });
    }

    if (onnxOutput && showMasks) {
      const overlayRgba = buildSegmentationOverlayRgba(
        onnxOutput.probs,
        width,
        height,
        0.25,
        145,
      );
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.putImageData(new ImageData(new Uint8ClampedArray(overlayRgba), width, height), 0, 0);
        ctx.drawImage(maskCanvas, 0, 0);
      }
    }

    if (onnxSummary && showLandmarks) {
      for (const cls of onnxSummary.detectedClasses) {
        const [cx, cy] = cls.centroidPx;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(Math.max(4, cx - 22), Math.max(4, cy - 11), 62, 16);
        ctx.strokeStyle = cls.colorHex;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.max(4, cx - 22), Math.max(4, cy - 11), 62, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.fillText(
          `${cls.code} ${cls.csaMm2.toFixed(1)}mm²`,
          Math.max(7, cx - 19),
          Math.max(15, cy),
        );
      }
    }

    if (uploadedScan && needleMode) {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(30, 80);
      ctx.lineTo(needlePos.x, needlePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(needlePos.x, needlePos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [
    selectedNerveId,
    showMasks,
    showLandmarks,
    gain,
    depth,
    pathologyMode,
    needleMode,
    needlePos,
    uploadedScan,
    onnxOutput,
    onnxSummary,
  ]);

  const handleSelectNerve = (nerve: NerveStructure) => {
    sounds.playClick();
    setSelectedNerveId(nerve.id);
    setFocusPulseCount((c) => c + 1);
    if (onSelect3DStructure) {
      onSelect3DStructure(nerve.id, nerve.threeDCoords);
    }
  };

  const handleMapTo3DAtlas = () => {
    sounds.playCelebration();
    setFocusPulseCount((c) => c + 1);
    if (onSelect3DStructure) {
      onSelect3DStructure(selectedNerve.id, selectedNerve.threeDCoords);
    }
  };

  const executeOnnxOnSource = useCallback(
    async (
      source: HTMLImageElement | HTMLCanvasElement,
      sourceName: string,
    ) => {
      setIsLiveSegmenting(true);
      setOnnxError(null);
      try {
        const result = await runBrachialPlexusOnnxInference(source, {
          depthCm: depth,
          minClassProb: 0.25,
          minPixelCount: 24,
        });
        setOnnxOutput({
          probs: result.probs,
          inferenceMs: result.inferenceMs,
          modelLoadMs: result.modelLoadMs,
          sourceName,
        });
        setShowMasks(true);
        if (result.summary.detectedClasses.length > 0) {
          const primaryId = resolveAtlasNerveId(
            result.summary.detectedClasses[0].code,
          );
          const matched = BRACHIAL_PLEXUS_DATA.find((n) => n.id === primaryId);
          if (matched) {
            setSelectedNerveId(matched.id);
            onSelect3DStructure?.(matched.id, matched.threeDCoords);
          }
          sounds.playCelebration();
        }
      } catch (err) {
        setOnnxError(
          err instanceof Error
            ? err.message
            : "ONNX inference failed to load brachial-plexus.onnx.",
        );
      } finally {
        setIsLiveSegmenting(false);
      }
    },
    [depth, onSelect3DStructure],
  );

  const runLiveInference = async () => {
    sounds.playClick();
    if (uploadedScan) {
      await executeOnnxOnSource(uploadedScan.img, uploadedScan.fileName);
      return;
    }
    const cleanCanvas = document.createElement("canvas");
    cleanCanvas.width = 416;
    cleanCanvas.height = 416;
    const ctx = cleanCanvas.getContext("2d");
    if (!ctx) return;
    drawSyntheticBModeFrame(ctx, {
      selectedNerveId,
      gain,
      pathologyMode,
      includeAnnotations: false,
      showLandmarks: false,
      showMasks: false,
      needleMode: false,
      needlePos,
    });
    await executeOnnxOnSource(
      cleanCanvas,
      `Reference B-Mode (${pathologyMode === "erbs_palsy" ? "Erb's Traction" : "Normal"})`,
    );
  };

  const handleUltrasoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setUploadedScan({ img, fileName: file.name });
      void executeOnnxOnSource(img, file.name);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setOnnxError(`Unable to decode ultrasound image "${file.name}".`);
    };
    img.src = url;
    e.target.value = "";
  };

  const handleResetScan = () => {
    sounds.playClick();
    setUploadedScan(null);
    setOnnxOutput(null);
    setOnnxError(null);
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Banner: Native Nerve Explorer */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-emerald-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
            <Zap size={16} />
          </div>
          <div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              Brachial Plexus Ultrasound &amp; 3D Nerve Explorer
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                SegFormer mit_b0 · ONNX
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Real SegFormer+ConvLSTM neural segmentation of uploaded B-mode ultrasound frames (C5, C6, C7/MT, C8/LT, UT, SSN, AD, PD) with quantitative CSA (mm²) &amp; flattening detection.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUltrasoundUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLiveSegmenting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <Upload size={13} />
            <span>Upload Ultrasound Scan</span>
          </button>
          <button
            type="button"
            onClick={runLiveInference}
            disabled={isLiveSegmenting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles size={13} className={isLiveSegmenting ? "animate-spin" : ""} />
            <span>{isLiveSegmenting ? "Running ONNX..." : "Run ONNX Segmentation"}</span>
          </button>
          {(uploadedScan || onnxOutput) && (
            <button
              type="button"
              onClick={handleResetScan}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-all"
            >
              <RotateCcw size={12} />
              <span>Reset Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Dual-View Workspace: Ultrasound (Left) + 3D Anatomical Mapping & Clinical (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Ultrasound Viewport & Imaging Controls */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 text-white shadow-xl relative overflow-hidden">
            {/* Viewport Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono font-bold tracking-wider text-neutral-300">
                  B-MODE ULTRASOUND · 12.0 MHz LINEAR
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                <span>D: {depth.toFixed(1)} cm</span>
                <span>G: {gain}%</span>
                <span>FR: 42 fps</span>
              </div>
            </div>

            {/* Ultrasound Canvas */}
            <div className="relative w-full aspect-square my-3 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onClick={(e) => {
                  if (needleMode) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scaleX = 416 / rect.width;
                    const scaleY = 416 / rect.height;
                    setNeedlePos({
                      x: Math.round((e.clientX - rect.left) * scaleX),
                      y: Math.round((e.clientY - rect.top) * scaleY),
                    });
                    sounds.playClick();
                  }
                }}
                className={`w-full h-full object-contain ${needleMode ? "cursor-crosshair" : "cursor-pointer"}`}
              />

              {/* Ultrasound Depth Scale overlay on right */}
              <div className="absolute right-2 top-4 bottom-4 flex flex-col justify-between items-end text-[9px] font-mono text-neutral-500 pointer-events-none">
                <span>0.0 cm</span>
                <span>1.0 cm</span>
                <span>2.0 cm</span>
                <span>3.0 cm</span>
                <span>{depth.toFixed(1)} cm</span>
              </div>
            </div>

            {/* Viewport Controls */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMasks(!showMasks)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    showMasks ? "bg-amber-500 text-white" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  <Eye size={13} className="inline mr-1" />
                  Seg Masks
                </button>
                <button
                  type="button"
                  onClick={() => setShowLandmarks(!showLandmarks)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    showLandmarks ? "bg-sky-500 text-white" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  <Layers size={13} className="inline mr-1" />
                  Landmarks
                </button>
                <button
                  type="button"
                  onClick={() => setNeedleMode(!needleMode)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    needleMode ? "bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  <Crosshair size={13} className="inline mr-1" />
                  Block Needle
                </button>
              </div>

              {/* Pathology Mode: Normal vs Erb's Palsy */}
              <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setPathologyMode("normal");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    pathologyMode === "normal" ? "bg-neutral-700 text-white" : "text-neutral-400"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setPathologyMode("erbs_palsy");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    pathologyMode === "erbs_palsy" ? "bg-rose-500/30 text-rose-300" : "text-neutral-400"
                  }`}
                >
                  Erb&apos;s Traction
                </button>
              </div>
            </div>
          </div>

          {/* Quick Nerve Structure Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-[11px] font-bold text-neutral-500 mr-1">Select Structure:</span>
            {BRACHIAL_PLEXUS_DATA.map((nerve) => {
              const isSelected = nerve.id === selectedNerveId;
              return (
                <button
                  key={nerve.id}
                  type="button"
                  onClick={() => handleSelectNerve(nerve)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-neutral-900 dark:bg-slate-800 text-white shadow-md scale-105"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                  style={{
                    boxShadow: isSelected ? `0 0 0 2px ${nerve.color}` : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: nerve.color }}
                  />
                  <span>{nerve.id}</span>
                </button>
              );
            })}
          </div>

          {/* Real ONNX Nerve Morphometry & Entrapment Detection Readout */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Activity size={14} className="text-amber-500" />
                <span>Quantitative Nerve Morphometry (ONNX SegFormer)</span>
              </div>
              <label className="flex items-center gap-2 text-[11px] font-mono text-neutral-600 dark:text-neutral-300">
                <span>Depth Calibration: {depth.toFixed(1)} cm</span>
                <input
                  type="range"
                  min={2.0}
                  max={7.0}
                  step={0.5}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  aria-label="Ultrasound scanning depth calibration"
                  className="w-24 accent-amber-500 cursor-pointer"
                />
              </label>
            </div>

            {onnxError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-300">
                {onnxError}
              </div>
            )}

            {!onnxOutput ? (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Upload a linear B-mode ultrasound image (`.png`/`.jpg`/`.webp`) or click <strong>Run ONNX Segmentation</strong> to evaluate Cross-Sectional Area (CSA mm²), fascicular flattening ratio, and swelling/entrapment alerts using the trained <code>brachial-plexus.onnx</code> model.
              </p>
            ) : onnxSummary && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-950 px-3 py-1.5 rounded-lg">
                  <span>Source: {onnxOutput.sourceName}</span>
                  <span>
                    Inference: {onnxOutput.inferenceMs} ms · Scale: {(onnxSummary.mmPerPixel * 1000).toFixed(0)} µm/px
                  </span>
                </div>

                {onnxSummary.primaryAlert && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 flex items-start gap-2 text-[11px] text-rose-800 dark:text-rose-200">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-500" />
                    <span>{onnxSummary.primaryAlert}</span>
                  </div>
                )}

                {onnxSummary.detectedClasses.length === 0 ? (
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500">
                    No high-confidence nerve fascicle detected in frame (foreground threshold &ge; 25% over &ge; 12 px). Upload a linear interscalene/supraclavicular ultrasound scan or increase Gain.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase text-neutral-400 font-bold">
                          <th className="py-1.5 pr-2">Nerve</th>
                          <th className="py-1.5 px-2">Conf</th>
                          <th className="py-1.5 px-2">CSA (mm²)</th>
                          <th className="py-1.5 px-2">Ratio</th>
                          <th className="py-1.5 pl-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {onnxSummary.detectedClasses.map((cls) => {
                          const targetId = resolveAtlasNerveId(cls.code);
                          const match = BRACHIAL_PLEXUS_DATA.find((n) => n.id === targetId);
                          return (
                            <tr
                              key={cls.classId}
                              onClick={() => match && handleSelectNerve(match)}
                              className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                            >
                              <td className="py-1.5 pr-2 font-bold flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: cls.colorHex }}
                                />
                                {cls.code}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-neutral-600 dark:text-neutral-300">
                                {Math.round(cls.peakConfidence * 100)}%
                              </td>
                              <td className="py-1.5 px-2 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                {cls.csaMm2.toFixed(1)}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-neutral-600 dark:text-neutral-300">
                                {cls.flatteningRatio.toFixed(2)}:1
                              </td>
                              <td className="py-1.5 pl-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                                    cls.status === "normal"
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                      : cls.status === "hypoplastic"
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                                  }`}
                                >
                                  {cls.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Anatomical Atlas (Top) + Active Structure Clinical Reasoning (Bottom) */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          {/* Interactive 3D Cervical Spine & Brachial Plexus Atlas */}
          <BrachialPlexus3DAtlas
            selectedNerve={selectedNerve}
            onSelectNerve={handleSelectNerve}
            focusPulseCount={focusPulseCount}
            onOpenAtlas={onOpenAtlas}
            theme={theme}
          />

          {/* Active Structure Clinical Reasoning Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: selectedNerve.color }}
                />
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">
                    {selectedNerve.name}
                  </h3>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Category: {selectedNerve.category.toUpperCase()} · 3D Coordinate: [{selectedNerve.threeDCoords.join(", ")}]
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMapTo3DAtlas}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Crosshair size={13} />
                <span>Map to 3D Atlas</span>
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {selectedNerve.description}
            </p>

            {/* Innervation & Motor Deficit Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 space-y-1">
                <span className="font-bold text-neutral-700 dark:text-neutral-200 block">
                  Muscular Innervation:
                </span>
                <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                  {selectedNerve.innervation}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                <span className="font-bold text-rose-700 dark:text-rose-300 block">
                  Lesion / Deficit:
                </span>
                <p className="text-rose-600 dark:text-rose-400 text-[11px] leading-relaxed">
                  {selectedNerve.motorDeficit}
                </p>
              </div>
            </div>

            {/* Clinical Syndrome Correlation */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                <Stethoscope size={14} />
                <span>Spatial Clinical Insight</span>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 text-[11px] leading-relaxed">
                {selectedNerve.clinicalSignificance}
              </p>
            </div>
          </div>

          {/* Regional Interscalene Anesthesia Protocol Reference */}
          <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
            <h4 className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <ShieldAlert size={14} className="text-amber-500" />
              Interscalene Regional Nerve Block Safety
            </h4>
            <ul className="text-neutral-600 dark:text-neutral-400 text-[11px] space-y-1 list-disc list-inside">
              <li>
                <strong>Target:</strong> Fascial compartment between anterior and middle scalene at C6 level.
              </li>
              <li>
                <strong>Danger Zones:</strong> Vertebral artery (medial), phrenic nerve (anterior surface of anterior scalene), pleura (inferior).
              </li>
              <li>
                <strong>Acoustic Confirmation:</strong> Avoid intraneural injection by verifying donut-like circumferential spread around C5-C6 roots without expansion of the epineurium.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
