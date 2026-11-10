"use client";

import React, { useState } from "react";
import { sounds } from "@/app/lib/sound";
import { Comparative3DViewport } from "./Comparative3DViewport";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Split,
} from "lucide-react";

export interface PathologyCase {
  id: string;
  title: string;
  organSystem: string;
  organId: string;
  modality: "3D Mesh" | "CT / HU Volume" | "MRI";
  normalDescription: string;
  abnormalDescription: string;
  pathophysiology: string;
  structuralDelta: {
    feature: string;
    normalValue: string;
    pathologicalValue: string;
    clinicalSignificance: string;
  }[];
  educationalTakeaway: string;
}

export const CURATED_PATHOLOGY_CASES: PathologyCase[] = [
  {
    id: "case-hcm",
    title: "Normal Myocardium vs. Hypertrophic Cardiomyopathy (HCM)",
    organSystem: "Cardiovascular",
    organId: "heart",
    modality: "3D Mesh",
    normalDescription: "Symmetric left ventricular wall thickness (8-11 mm) with normal cavity volume (120-140 mL) and unhindered LV outflow tract.",
    abnormalDescription: "Asymmetric septal hypertrophy (>15 mm) encroaching on the left ventricular outflow tract (LVOT) with systolic anterior motion (SAM) of the mitral valve.",
    pathophysiology: "Autosomal dominant mutation in sarcomeric proteins (MYH7, MYBPC3) causing myocyte disarray, interstitial fibrosis, and dynamic subaortic obstruction.",
    structuralDelta: [
      {
        feature: "Interventricular Septal Thickness",
        normalValue: "9.2 mm",
        pathologicalValue: "22.4 mm (severe asymmetric hypertrophy)",
        clinicalSignificance: "Dynamic pressure gradient across LVOT causing exertional syncope and angina."
      },
      {
        feature: "Left Ventricular End-Diastolic Volume",
        normalValue: "130 mL",
        pathologicalValue: "82 mL (severely restricted)",
        clinicalSignificance: "Diastolic dysfunction with elevated filling pressures."
      },
      {
        feature: "Mitral Valve Motion",
        normalValue: "Normal coaptation without systolic anterior motion",
        pathologicalValue: "Systolic Anterior Motion (SAM) with septal contact",
        clinicalSignificance: "Produces dynamic outflow obstruction and mitral regurgitation."
      }
    ],
    educationalTakeaway: "HCM is the leading cause of sudden cardiac death in young competitive athletes. The structural narrowing of the LVOT worsens with dehydration or increased inotropy."
  },
  {
    id: "case-disc-herniation",
    title: "Normal L4-L5 Lumbar Disc vs. Posterolateral Disc Herniation",
    organSystem: "Skeletal / Nervous",
    organId: "spine",
    modality: "MRI",
    normalDescription: "Intact annulus fibrosus encircling a hydrated nucleus pulposus; widely patent lateral recesses and intervertebral foramina.",
    abnormalDescription: "Rupture of posterior annulus fibrosus with extruded nucleus pulposus fragment compressing the traversing L5 nerve root in the lateral recess.",
    pathophysiology: "Degenerative dehydration of nucleus pulposus and biomechanical axial loading tear radial annular fibers, allowing gelatinous nucleus extrusion into the spinal canal.",
    structuralDelta: [
      {
        feature: "Disc Margin Contour",
        normalValue: "Concave posterior contour matching vertebral endplates",
        pathologicalValue: "7 mm focal posterolateral extrusion into canal",
        clinicalSignificance: "Reduces spinal canal cross-sectional area by 40%."
      },
      {
        feature: "Traversing L5 Nerve Root",
        normalValue: "Surrounded by epidural fat, zero displacement",
        pathologicalValue: "Directly flattened and displaced posteriorly against lamina",
        clinicalSignificance: "Causes classic sciatica, numbness over great toe, and foot drop (weakness of extensor hallucis longus)."
      }
    ],
    educationalTakeaway: "A posterolateral herniation at L4-L5 compresses the traversing L5 nerve root rather than the exiting L4 nerve root because the L4 root has already exited above the disc level."
  },
  {
    id: "case-circle-of-willis-aneurysm",
    title: "Normal Circle of Willis vs. ACom Berry Aneurysm",
    organSystem: "Vascular / Nervous",
    organId: "brain",
    modality: "3D Mesh",
    normalDescription: "Smooth, laminar flow across anterior communicating artery (ACom) and paired A1 segments without focal dilation.",
    abnormalDescription: "8 mm saccular (berry) aneurysm arising at the bifurcation of the anterior communicating artery pointing anterosuperiorly.",
    pathophysiology: "Hemodynamic shear stress at arterial bifurcations combined with focal absence of the internal elastic lamina and tunica media produces outward herniation.",
    structuralDelta: [
      {
        feature: "Arterial Wall Morphology",
        normalValue: "Uniform 1.5 mm diameter without outpouching",
        pathologicalValue: "8.2 x 6.5 mm thin-walled saccular dome",
        clinicalSignificance: "High rupture risk (>1% annually) resulting in catastrophic subarachnoid hemorrhage."
      },
      {
        feature: "Optic Chiasm Relationship",
        normalValue: "Located 5 mm superior to optic chiasm without mass effect",
        pathologicalValue: "Impression on dorsal optic chiasm",
        clinicalSignificance: "Can present with bitemporal hemianopia prior to rupture."
      }
    ],
    educationalTakeaway: "Berry aneurysms are associated with Polycystic Kidney Disease (ADPKD), Marfan syndrome, and smoking. Rupture classically presents with 'the worst headache of life' (thunderclap)."
  }
];

export function NormalVsAbnormalComparator({}: {
  theme?: "light" | "dark";
}) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case-hcm");
  const [activeTab, setActiveTab] = useState<"visual" | "table">("visual");

  const currentCase =
    CURATED_PATHOLOGY_CASES.find((c) => c.id === selectedCaseId) ||
    CURATED_PATHOLOGY_CASES[0];

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Banner: Normal vs. Abnormal Comparator */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-teal-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold">
            <Split size={16} />
          </div>
          <div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              Normal vs. Pathological Comparative Anatomy Lab
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-mono text-[10px]">
                Educational Pathology Reference
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Direct structural comparison between healthy reference anatomy and verified pathological specimen models.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {CURATED_PATHOLOGY_CASES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                sounds.playClick();
                setSelectedCaseId(c.id);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                selectedCaseId === c.id
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:text-neutral-900"
              }`}
            >
              {c.organSystem}
            </button>
          ))}
        </div>
      </div>

      {/* Case Header Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            {currentCase.organSystem} · {currentCase.modality}
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white">
            {currentCase.title}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {currentCase.pathophysiology}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("visual");
            }}
            className={`px-3 py-1 rounded-lg transition-colors ${
              activeTab === "visual"
                ? "bg-white dark:bg-slate-900 text-neutral-900 dark:text-white shadow-xs font-bold"
                : "text-neutral-500"
            }`}
          >
            Visual Comparison
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("table");
            }}
            className={`px-3 py-1 rounded-lg transition-colors ${
              activeTab === "table"
                ? "bg-white dark:bg-slate-900 text-neutral-900 dark:text-white shadow-xs font-bold"
                : "text-neutral-500"
            }`}
          >
            Structural Delta Matrix
          </button>
        </div>
      </div>

      {/* Main Comparative Viewport */}
      {activeTab === "visual" ? (
        <div className="space-y-4">
          <Comparative3DViewport
            caseId={currentCase.id}
            normalLabel="Normal Healthy Reference (TA2)"
            abnormalLabel="Pathological Distortion / Lesion"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column Summary: Normal Healthy Reference */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-sm flex flex-col space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={15} />
                <span>Canonical Anatomical Architecture</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {currentCase.normalDescription}
              </p>
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-200">
                <strong>Normal Biomechanics:</strong> Intact tissue compliance, laminar flow dynamics, and anatomical clearance.
              </div>
            </div>

            {/* Right Column Summary: Pathological Specimen */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 shadow-sm flex flex-col space-y-2.5">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold">
                <AlertTriangle size={15} />
                <span>Structural Pathology Manifestation</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {currentCase.abnormalDescription}
              </p>
              <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-900 dark:text-rose-200">
                <strong>Clinical Pathology Impact:</strong> Architectural remodeling, mechanical obstruction, or adjacent neural compression.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Structural Delta Table */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Quantitative Anatomical Delta Matrix
            </h3>
            <span className="text-[11px] text-neutral-400">
              Measurement units calibrated to physical millimeters (mm)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-slate-800/50 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-3">Anatomical Landmark / Feature</th>
                  <th className="p-3 text-emerald-700 dark:text-emerald-400">Normal Reference Value</th>
                  <th className="p-3 text-rose-700 dark:text-rose-400">Pathological Distortion</th>
                  <th className="p-3">Clinical Diagnostic Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {currentCase.structuralDelta.map((delta, i) => (
                  <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-bold text-neutral-900 dark:text-white">
                      {delta.feature}
                    </td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-300">
                      {delta.normalValue}
                    </td>
                    <td className="p-3 text-rose-700 dark:text-rose-300 font-bold">
                      {delta.pathologicalValue}
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 text-[11px]">
                      {delta.clinicalSignificance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Educational Pearls Footer */}
      <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
        <Info size={18} className="text-sky-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Medical Education Pearl:</span> {currentCase.educationalTakeaway}
        </div>
      </div>
    </div>
  );
}

