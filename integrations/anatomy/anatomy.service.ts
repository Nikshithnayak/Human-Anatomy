import { anatomyApi } from "./anatomy.api";
import { getAnatomicalRelationships } from "@/lib/anatomy/relationships";
import type { StructureRelationshipProfile } from "./anatomy.types";

export interface AnatomyDataProvider {
  getRelationships(structureIdOrName: string): StructureRelationshipProfile | null;
  verifySystemHealth(): Promise<boolean>;
}

export class AnatomyService implements AnatomyDataProvider {
  getRelationships(structureIdOrName: string): StructureRelationshipProfile | null {
    return getAnatomicalRelationships(structureIdOrName);
  }

  async verifySystemHealth(): Promise<boolean> {
    try {
      const res = await anatomyApi.checkHealth();
      return res.status === "ok";
    } catch {
      return false;
    }
  }

  async getZAnatomyCatalog(): Promise<unknown> {
    return anatomyApi.getZAnatomyCatalog();
  }
}

export const anatomyService = new AnatomyService();

