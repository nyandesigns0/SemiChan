export interface AnchorAxis {
  id: string;
  name: string;
  negativePole: {
    label: string;
    seedPhrases: string[];
  };
  positivePole: {
    label: string;
    seedPhrases: string[];
  };
  negativeVector?: Float64Array;
  positiveVector?: Float64Array;
  axisVector?: Float64Array;
}

export interface AnchorAxesConfig {
  axes: AnchorAxis[];
  version: string;
}
