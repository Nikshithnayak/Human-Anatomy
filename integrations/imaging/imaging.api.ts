import { apiClient } from "@/lib/api/api-client";
import type { OhifStatusResponse } from "./imaging.types";

export const imagingApi = {
  getOhifMetadata: async (): Promise<OhifStatusResponse> => {
    return apiClient.get<OhifStatusResponse>("/api/imaging/ohif");
  },
};
