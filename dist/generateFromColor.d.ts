import { ColorModel, Vector3 } from "./index";
export declare type GenerateFromColorCurveMethod = "lamé" | "arc" | "pow";
export declare type AnchorOption = number | "auto";
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
/**
 * Converts a hex color string to RGB.
 * Accepts "#RGB", "RGB", "#RRGGBB" and "RRGGBB" formats.
 * Throws a TypeError for anything else.
 */
export declare function hexToRgb(hex: string): [number, number, number];
/**
 * Converts RGB (0...255 per channel) to HSV.
 * @returns [hue 0...360, saturation 0...1, value 0...1]
 */
export declare function rgbToHsv(r: number, g: number, b: number): [number, number, number];
/**
 * Given a raw curve position rawT ∈ [0,1] and a target ∈ [0,1],
 * finds [min, max] so that min + rawT × (max − min) = target
 * while maximizing the size of the resulting range (0 ≤ min ≤ max ≤ 1).
 */
export declare function solveRange(rawT: number, target: number): [number, number];
/**
 * Picks the base swatch index (1-based) whose curve position fits the
 * target saturation/value best, meaning the saturation/lightness ranges
 * deviate least from the full [0,1] box. Ties resolve towards the middle
 * of the ramp, then to the lowest index.
 */
export declare function pickAnchorIndex(curveMethod: GenerateFromColorCurveMethod, total: number, curveAccent: number, saturationTarget: number, valueTarget: number): number;
/**
 * Computes all parameters a generateRandomColorRamp() call needs so that
 * the base swatch at the resolved anchor index is exactly the input color.
 * Useful for inspecting the derived values without generating the ramp.
 */
export declare function resolveFromColor(options: GenerateFromColorOptions): {
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
};
/**
 * Generates a color ramp that passes exactly through the given hex color.
 *
 * One base swatch (resolved from `anchor`, default "auto") will match the
 * input hex color precisely. The surrounding swatches follow the chosen
 * curve method's natural shape. The return shape is identical to
 * generateRandomColorRamp().
 */
export declare function generateFromColor(options: GenerateFromColorOptions): {
    light: Vector3[];
    dark: Vector3[];
    base: Vector3[];
    all: Vector3[];
};
