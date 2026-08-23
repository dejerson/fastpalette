import {
  ColorModel,
  CurveMethod,
  Vector3,
  generateRandomColorRamp,
  pointOnCurve,
} from "./index";

export type GenerateFromColorCurveMethod = "lamé" | "arc" | "pow";
export type AnchorOption = number | "auto";

export interface GenerateFromColorOptions {
  /** input color as hex string, e.g. "#3F8F8C", "#3f8", "3F8F8C" */
  hex: string;
  /** amount of base swatches in the ramp (default 9) */
  total?: number;
  /** which base swatch (1-based) should be exactly the input color,
   *  or "auto" to pick the slot needing the least distortion of the
   *  saturation/lightness range (default "auto") */
  anchor?: AnchorOption;
  /** method used to draw the curve (default "arc") */
  curveMethod?: GenerateFromColorCurveMethod;
  /** how accentuated the curve is (default 0) */
  curveAccent?: number;
  /** how much the hue changes over the curve, 0: monohue (default 0) */
  hueCycle?: number;
  tintShadeHueShift?: number;
  offsetTint?: number;
  offsetShade?: number;
  offsetCurveModTint?: number;
  offsetCurveModShade?: number;
  /** color model of the returned colors (default "hsl") */
  colorModel?: ColorModel;
}

function parseHexChannel(hex: string): number {
  return parseInt(hex, 16);
}

/**
 * Converts a hex color string to RGB.
 * Accepts "#RGB", "RGB", "#RRGGBB" and "RRGGBB" formats.
 * Throws a TypeError for anything else.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(cleaned)) {
    const expanded = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
    return [
      parseHexChannel(expanded.slice(0, 2)),
      parseHexChannel(expanded.slice(2, 4)),
      parseHexChannel(expanded.slice(4, 6)),
    ];
  }

  if (/^[0-9a-f]{6}$/i.test(cleaned)) {
    return [
      parseHexChannel(cleaned.slice(0, 2)),
      parseHexChannel(cleaned.slice(2, 4)),
      parseHexChannel(cleaned.slice(4, 6)),
    ];
  }

  throw new TypeError(
    `hex parameter is expected to be "#RGB" or "#RRGGBB" but \`${hex}\` given.`
  );
}

/**
 * Converts RGB (0...255 per channel) to HSV.
 * @returns [hue 0...360, saturation 0...1, value 0...1]
 */
export function rgbToHsv(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = ((gn - bn) / d) % 6;
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
    h = (h * 60 + 360) % 360;
  }

  const s = max === 0 ? 0 : d / max;

  return [h, s, max];
}

/**
 * Given a raw curve position rawT ∈ [0,1] and a target ∈ [0,1],
 * finds [min, max] so that min + rawT × (max − min) = target
 * while maximizing the size of the resulting range (0 ≤ min ≤ max ≤ 1).
 */
export function solveRange(rawT: number, target: number): [number, number] {
  if (rawT <= 0) {
    return [target, 1];
  }
  if (rawT >= 1) {
    return [0, target];
  }
  if (target <= rawT) {
    return [0, target / rawT];
  }
  return [(target - rawT) / (1 - rawT), 1];
}

/**
 * How far a solved [min, max] range deviates from the ideal [0, 1] box.
 * 0 means the full unit square is preserved (no distortion at all).
 */
function rangeDeviation(rawT: number, target: number): number {
  const [min, max] = solveRange(rawT, target);
  return Math.max(min, 1 - max);
}

/**
 * Picks the base swatch index (1-based) whose curve position fits the
 * target saturation/value best, meaning the saturation/lightness ranges
 * deviate least from the full [0,1] box. Ties resolve towards the middle
 * of the ramp, then to the lowest index.
 */
export function pickAnchorIndex(
  curveMethod: GenerateFromColorCurveMethod,
  total: number,
  curveAccent: number,
  saturationTarget: number,
  valueTarget: number
): number {
  const middle = Math.floor((total + 1) / 2);
  let bestIndex = middle;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 1; i <= total; i++) {
    const [rawX, rawY] = pointOnCurve(
      curveMethod,
      i,
      total + 1,
      curveAccent,
      [0, 0],
      [1, 1]
    );

    const score = Math.max(
      rangeDeviation(rawX, saturationTarget),
      rangeDeviation(rawY, valueTarget)
    );

    const distanceToMiddle = Math.abs(i - middle);
    const bestDistanceToMiddle = Math.abs(bestIndex - middle);

    const isBetter =
      score < bestScore ||
      (score === bestScore &&
        (distanceToMiddle < bestDistanceToMiddle ||
          (distanceToMiddle === bestDistanceToMiddle && i < bestIndex)));

    if (isBetter) {
      bestIndex = i;
      bestScore = score;
    }
  }

  return bestIndex;
}

/**
 * Computes all parameters a generateRandomColorRamp() call needs so that
 * the base swatch at the resolved anchor index is exactly the input color.
 * Useful for inspecting the derived values without generating the ramp.
 */
export function resolveFromColor(options: GenerateFromColorOptions): {
  anchorIndex: number;
  hue: number;
  centerHue: number;
  curveMethod: GenerateFromColorCurveMethod;
  curveAccent: number;
  hueCycle: number;
  tintShadeHueShift: number;
  offsetTint: number;
  offsetShade: number;
  offsetCurveModTint: number;
  offsetCurveModShade: number;
  colorModel: ColorModel;
  minSaturationLight: [number, number];
  maxSaturationLight: [number, number];
} {
  const {
    hex,
    total = 9,
    anchor = "auto",
    curveMethod = "arc",
    curveAccent = 0,
    hueCycle = 0,
    tintShadeHueShift = 0.01,
    offsetTint = 0.01,
    offsetShade = 0.01,
    offsetCurveModTint = 0.03,
    offsetCurveModShade = 0.03,
    colorModel = "hsl",
  } = options;

  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`total must be an integer of 1 or more.`);
  }

  const [r, g, b] = hexToRgb(hex);
  const [hue, saturationTarget, valueTarget] = rgbToHsv(r, g, b);

  let anchorIndex: number;
  if (anchor === "auto") {
    anchorIndex = pickAnchorIndex(
      curveMethod,
      total,
      curveAccent,
      saturationTarget,
      valueTarget
    );
  } else {
    if (!Number.isInteger(anchor) || anchor < 1 || anchor > total) {
      throw new RangeError(`anchor must be "auto" or between 1 and ${total}.`);
    }
    anchorIndex = anchor;
  }

  const [rawX, rawY] = pointOnCurve(
    curveMethod,
    anchorIndex,
    total + 1,
    curveAccent,
    [0, 0],
    [1, 1]
  );

  const [minSaturation, maxSaturation] = solveRange(rawX, saturationTarget);
  const [minLight, maxLight] = solveRange(rawY, valueTarget);

  // invert h = -180·hueCycle + centerHue + i·(360/(total+1))·hueCycle
  // so the swatch at anchorIndex lands exactly on the input hue
  const centerHue =
    (360 +
      ((hue + 180 * hueCycle - anchorIndex * (360 / (total + 1)) * hueCycle) %
        360)) %
    360;

  return {
    anchorIndex,
    hue,
    centerHue,
    curveMethod,
    curveAccent,
    hueCycle,
    tintShadeHueShift,
    offsetTint,
    offsetShade,
    offsetCurveModTint,
    offsetCurveModShade,
    colorModel,
    minSaturationLight: [minSaturation, minLight],
    maxSaturationLight: [maxSaturation, maxLight],
  };
}

/**
 * Generates a color ramp that passes exactly through the given hex color.
 *
 * One base swatch (resolved from `anchor`, default "auto") will match the
 * input hex color precisely. The surrounding swatches follow the chosen
 * curve method's natural shape. The return shape is identical to
 * generateRandomColorRamp().
 */
export function generateFromColor(options: GenerateFromColorOptions): {
  light: Vector3[];
  dark: Vector3[];
  base: Vector3[];
  all: Vector3[];
} {
  const resolution = resolveFromColor(options);

  return generateRandomColorRamp({
    total: options.total ?? 9,
    centerHue: resolution.centerHue,
    hueCycle: resolution.hueCycle,
    offsetTint: resolution.offsetTint,
    offsetShade: resolution.offsetShade,
    curveAccent: resolution.curveAccent,
    tintShadeHueShift: resolution.tintShadeHueShift,
    curveMethod: resolution.curveMethod as CurveMethod,
    offsetCurveModTint: resolution.offsetCurveModTint,
    offsetCurveModShade: resolution.offsetCurveModShade,
    minSaturationLight: resolution.minSaturationLight,
    maxSaturationLight: resolution.maxSaturationLight,
    colorModel: resolution.colorModel,
  });
}
