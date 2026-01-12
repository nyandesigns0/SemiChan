import { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { Stance } from "./nlp";

export type NodeType = "juror" | "concept" | "designer" | "designerConcept";

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: NodeType;
  label: string;
  size: number;
  meta?: Record<string, unknown>;
  /** Z coordinate for 3D visualization (from PCA reduction) */
  z?: number;
  /** Raw principal component values for N-dimensional visualization */
  pcValues?: number[];
  /** Layer for hierarchical concepts */
  layer?: "primary" | "detail";
  /** Parent primary concept ID for detail nodes */
  parentConceptId?: string;
  /** Child detail concept IDs for primary nodes */
  childConceptIds?: string[];
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  stance?: Stance;
  evidenceIds?: string[];
  kind: "jurorConcept" | "jurorJuror" | "conceptConcept" | "jurorDesignerConcept";
}
