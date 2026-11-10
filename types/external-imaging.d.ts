declare module "dcmjs" {
  export interface DicomDatasetMap {
    [key: string]: unknown;
  }

  const dcmjs: {
    data: {
      DicomMessage: {
        readFile(arrayBuffer: ArrayBuffer, options?: Record<string, unknown>): {
          meta: Record<string, unknown>;
          dict: Record<string, { vr?: string; Value?: unknown[] }>;
        };
      };
      DicomMetaDictionary: {
        naturalizeDataset(dataset: Record<string, unknown>): Record<string, unknown>;
        denaturalizeDataset(dataset: Record<string, unknown>): Record<string, unknown>;
        uid(): string;
      };
      datasetToDict(dataset: Record<string, unknown>): unknown;
    };
    sr: Record<string, unknown>;
    adapters: Record<string, unknown>;
    DICOMWEB: Record<string, unknown>;
    utilities: {
      orientation: Record<string, unknown>;
      [key: string]: unknown;
    };
    anonymizer: Record<string, unknown>;
    constants: Record<string, unknown>;
  };

  export default dcmjs;
}

