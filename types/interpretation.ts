export interface InterpretationMeta {
  title?: string;
  subtitle?: string;
  sentences?: number | null;
  jurors?: number | null;
  conceptsFinalK?: number | null;
  exportTimestamp?: string | null;
  buildId?: string | null;
  healthScorePct?: number | null;
  stance?: InterpretationStanceCounts;
}

export interface InterpretationStanceCounts {
  praise?: StanceDatum;
  critique?: StanceDatum;
  suggestion?: StanceDatum;
  neutral?: StanceDatum;
}

export interface StanceDatum {
  count?: number | null;
  pct?: number | null;
}

export interface AxisInterpretation {
  id: string;
  title: string;
  variancePct: number;
  varianceLabel?: string;
  poles: {
    low: string;
    high: string;
  };
  extremes?: {
    lowConceptId?: string | null;
    highConceptId?: string | null;
  };
  reward: string[];
  punish: string[];
  quote: string;
}

export interface ConceptInterpretation {
  id: string;
  title: string;
  count: number;
  sharePct: number;
  shareLabel?: string;
  ownersCount?: number;
  ownersKnown?: string[];
  stanceHint?: string | null;
  evidence: string;
  terms?: string[];
  designTakeaway: string;
}

export interface JurorInterpretation {
  id: string;
  name: string;
  sentences: number;
  topConceptIds: string[];
  values: string[];
  redLines: string[];
  designFor: string[];
  termHints?: string[];
}

export interface ActionStep {
  text: string;
  anchors: string[];
  tie: string;
}

export interface StrategyArchitecture {
  shadowOrganizer: string[];
  temporalLight: string[];
  sectionDepth: string[];
  restraintExpression: string[];
}

export interface StrategyRepresentation {
  poeticLayer: string;
  analyticalLayer: string;
  narrativeLayer: string;
  confidenceNote: string;
}

export interface InterpretationNarrative {
  takeaways: string[];
  primaryRisk: string;
  primaryAdvantage: string;
  doList: string[];
  dontList: string[];
  actionSteps: ActionStep[];
  architecture?: StrategyArchitecture;
  representation?: StrategyRepresentation;
}

export interface InterpretationReport {
  meta: InterpretationMeta;
  axes: AxisInterpretation[];
  concepts: ConceptInterpretation[];
  jurors: JurorInterpretation[];
  interpretation: InterpretationNarrative;
  params?: Record<string, unknown>;
}
