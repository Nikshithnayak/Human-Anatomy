import { imagingApi } from "./imaging.api";
import type { OhifStatusResponse } from "./imaging.types";

export class ImagingService {
  async getOhifStatus(): Promise<OhifStatusResponse> {
    return imagingApi.getOhifMetadata();
  }
}

export const imagingService = new ImagingService();
