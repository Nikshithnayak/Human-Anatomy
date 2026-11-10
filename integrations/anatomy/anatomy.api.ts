import { apiClient } from "@/lib/api/api-client";

export const anatomyApi = {
  checkHealth: async (): Promise<{ status: string; app: string; version: string; timestamp: string }> => {
    return apiClient.get("/api/health");
  },

  fetchAtlasManifest: async (manifestPath: string): Promise<unknown> => {
    return apiClient.get(manifestPath);
  },

  getZAnatomyCatalog: async (): Promise<unknown> => {
    return apiClient.get("/api/anatomy/z-anatomy");
  },
};

