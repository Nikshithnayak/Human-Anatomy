export interface BrachialPlexusClass {
  id: string;
  name: string;
  threeJsConceptId: string;
  coordinates3D: [number, number, number];
  clinicalPathology: string;
}

export interface UltrasoundLandmark {
  id: string;
  name: string;
  type: "muscular" | "vascular" | "neural";
  echogenicity: string;
}

export interface NerveInferencePrediction {
  classId: string;
  confidence: number;
  box: [number, number, number, number];
  center: [number, number];
}

export interface NerveExplorerApiResponse {
  status: string;
  model: {
    name: string;
    architecture: string;
    parameters: string;
    license: string;
    authors: string;
    checkpointFound: boolean;
    checkpointFile: string;
    executionMode: string;
  };
  supportedClasses: BrachialPlexusClass[];
  landmarks: UltrasoundLandmark[];
  interscaleneView: {
    modality: string;
    plane: string;
    samplePredictions: NerveInferencePrediction[];
  };
  educationalNotice: string;
}

