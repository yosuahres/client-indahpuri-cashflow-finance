/**
 * The documented categorical order, validated as a set against the light chart
 * surface: worst adjacent CVD ΔE 9.1, worst adjacent normal-vision ΔE 19.6.
 * Neighbouring slices differ in hue rather than in lightness, which is what
 * makes them tellable apart at a glance.
 */
export const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const
