export const LINK_VISUALIZATION = {
  WIDTH: {
    MIN: 2,
    MAX: 8,
    POWER_EXPONENT: 0.8,
    HOVER_SCALE: 1.2,
    BRIDGE_GLOW_SCALE: 1.6,
  },
  OPACITY: {
    MIN: 0.4,
    MAX: 1.0,
    NO_EVIDENCE: 0.1,
    SELECTED_OVERRIDE: 1.0,
  },
  ANIMATION: {
    GLOW_PULSE_SPEED: 2000, // milliseconds per cycle
    GLOW_INTENSITY_MIN: 0.3,
    GLOW_INTENSITY_MAX: 0.9,
  },
  PATTERN: {
    MIN_ZOOM_FOR_BRIDGE: 0.8, // Normalized zoom threshold (0-1) to show bridge glow
    MAX_CAMERA_DISTANCE: 100, // Approximate max camera distance for normalization
    MAX_GLOW_OPACITY: 0.45,
  },
} as const;
