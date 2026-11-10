import { nerveApi } from "./nerve.api";
import type { NerveExplorerApiResponse, NerveInferencePrediction } from "./nerve.types";

export interface NerveInferenceProvider {
  fetchNerveData(): Promise<NerveExplorerApiResponse>;
  getPredictionsForStructure(structureId: string): Promise<NerveInferencePrediction | null>;
}

export class NerveExplorerService implements NerveInferenceProvider {
  private cachedData: NerveExplorerApiResponse | null = null;

  async fetchNerveData(): Promise<NerveExplorerApiResponse> {
    if (this.cachedData) return this.cachedData;
    const data = await nerveApi.getNerveExplorerData();
    this.cachedData = data;
    return data;
  }

  async getPredictionsForStructure(structureId: string): Promise<NerveInferencePrediction | null> {
    const data = await this.fetchNerveData();
    const prediction = data.interscaleneView.samplePredictions.find(
      (p) => p.classId.toLowerCase() === structureId.toLowerCase()
    );
    return prediction || null;
  }
}

export const nerveService = new NerveExplorerService();

