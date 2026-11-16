import { apiClient } from "@/lib/api/api-client";
import type { NerveExplorerApiResponse } from "./nerve.types";

export const nerveApi = {
  getNerveExplorerData: async (): Promise<NerveExplorerApiResponse> => {
    return apiClient.get<NerveExplorerApiResponse>("/api/nerve-explorer");
  },
};

