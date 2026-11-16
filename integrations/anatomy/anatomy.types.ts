import type { SystemId, Sex } from "@/app/components/atlas/anatomy";

export type AnatomicalRelationshipType =
  | "origin"
  | "insertion"
  | "innervation"
  | "blood_supply"
  | "venous_drainage"
  | "neighbor"
  | "parent_of"
  | "part_of";

export interface AnatomicalRelationship {
  id: string;
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  type: AnatomicalRelationshipType;
  description: string;
  clinicalRelevance?: string;
}

export interface StructureRelationshipProfile {
  structureId: string;
  structureName: string;
  system: SystemId;
  latinName?: string;
  relationships: AnatomicalRelationship[];
}

