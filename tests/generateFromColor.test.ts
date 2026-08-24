import { describe, expect, it } from "vitest";

import {
  generateFromColor,
  hexToRgb,
  resolveFromColor,
  rgbToHsv,
  solveRange,
} from "../src/generateFromColor";
import type { GenerateFromColorOptions } from "../src/generateFromColor";

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb: [number, number, number];
  if (hh < 60) rgb = [c, x, 0];
  else if (hh < 120) rgb = [x, c, 0];
  else if (hh < 180) rgb = [0, c, x];
  else if (hh < 240) rgb = [0, x, c];
  else if (hh < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return rgb.map((v) => Math.round((v + m) * 255)) as [number, number, number];
}

function hslArrayToHex([h, s, l]: [number, number, number]): string {
  return (
    "#" +
    hslToRgb(h, s, l)
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function hexChannels(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

describe("hexToRgb", () => {
  it("parses 6-digit hex with hash", () => {
    expect(hexToRgb("#3F8F8C")).toEqual([63, 143, 140]);
  });

  it("parses 6-digit hex without hash", () => {
    expect(hexToRgb("3F8F8C")).toEqual([63, 143, 140]);
  });

  it("expands 3-digit shorthand", () => {
    expect(hexToRgb("#3f8")).toEqual([51, 255, 136]);
    expect(hexToRgb("FFF")).toEqual([255, 255, 255]);
  });

  it("throws TypeError on invalid input", () => {
    for (const bad of ["", "#", "#12", "#12345", "GGGGGG", "#1234567", "red"]) {
      expect(() => hexToRgb(bad)).toThrow(TypeError);
    }
  });
});

describe("rgbToHsv", () => {
  it("converts primary colors", () => {
    expect(rgbToHsv(255, 0, 0)).toEqual([0, 1, 1]);
    expect(rgbToHsv(0, 255, 0)).toEqual([120, 1, 1]);
    expect(rgbToHsv(0, 0, 255)).toEqual([240, 1, 1]);
  });

  it("converts achromatic colors", () => {
    expect(rgbToHsv(0, 0, 0)).toEqual([0, 0, 0]);
    expect(rgbToHsv(255, 255, 255)).toEqual([0, 0, 1]);
    expect(rgbToHsv(128, 128, 128)[1]).toBe(0);
  });
});

describe("solveRange", () => {
  const samples = Array.from({ length: 21 }, (_, i) => i / 20);

  it("satisfies min + rawT * (max - min) === target", () => {
    for (const rawT of samples) {
      for (const target of samples) {
        const [min, max] = solveRange(rawT, target);
        const solved = min + rawT * (max - min);
        expect(Math.abs(solved - target)).toBeLessThan(1e-12);
      }
    }
  });

  it("always returns ordered ranges inside [0,1]", () => {
    for (const rawT of samples) {
      for (const target of samples) {
        const [min, max] = solveRange(rawT, target);
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(1);
        expect(min).toBeLessThanOrEqual(max);
      }
    }
  });

  it("handles degenerate curve positions", () => {
    expect(solveRange(0, 0.4)).toEqual([0.4, 1]);
    expect(solveRange(1, 0.4)).toEqual([0, 0.4]);
  });
});

describe("resolveFromColor", () => {
  const base: GenerateFromColorOptions = { hex: "#3F8F8C", total: 9 };

  it("resolves an auto anchor within ramp bounds", () => {
    const r = resolveFromColor(base);
    expect(r.anchorIndex).toBeGreaterThanOrEqual(1);
    expect(r.anchorIndex).toBeLessThanOrEqual(9);
  });

  it("honors an explicit anchor", () => {
    expect(resolveFromColor({ ...base, anchor: 3 }).anchorIndex).toBe(3);
    expect(resolveFromColor({ ...base, anchor: 9 }).anchorIndex).toBe(9);
  });

  it("throws RangeError for out-of-range anchor or total", () => {
    expect(() => resolveFromColor({ ...base, anchor: 0 })).toThrow(RangeError);
    expect(() => resolveFromColor({ ...base, anchor: 10 })).toThrow(RangeError);
    expect(() => resolveFromColor({ ...base, total: 0 })).toThrow(RangeError);
  });

  it("throws TypeError for malformed hex", () => {
    expect(() => resolveFromColor({ hex: "nope" })).toThrow(TypeError);
  });

  it("keeps hueCycle accounted for in centerHue", () => {
    // centerHue must shift so the pinned swatch still lands on the input hue.
    // (a middle anchor cancels the shift exactly, hence a non-middle anchor)
    const flat = resolveFromColor({ ...base, hueCycle: 0, anchor: 3 });
    const spun = resolveFromColor({ ...base, hueCycle: 0.5, anchor: 3 });
    expect(spun.centerHue).not.toBeCloseTo(flat.centerHue, 6);
  });
});

describe("generateFromColor pins the exact color", () => {
  const hexes = [
    "#3F8F8C",
    "#FF0000",
    "#123456",
    "#ABCDEF",
    "#F0E68C",
    "#808080",
    "#000000",
    "#FFFFFF",
  ];
  const methods = ["lamé", "arc", "pow"] as const;
  const totals = [5, 9];

  for (const curveMethod of methods) {
    for (const total of totals) {
      it(`matches input hex for ${curveMethod} curves at total ${total}`, () => {
        for (const hex of hexes) {
          for (const anchor of ["auto", Math.floor((total + 1) / 2)] as const) {
            const options: GenerateFromColorOptions = {
              hex,
              total,
              curveMethod,
              anchor,
            };
            const ramp = generateFromColor(options);
            const { anchorIndex } = resolveFromColor(options);

            const pinnedHex = hslArrayToHex(ramp.base[anchorIndex - 1]);
            const expected = hexChannels(hex.toUpperCase());
            const actual = hexChannels(pinnedHex);

            actual.forEach((channel, i) =>
              expect(Math.abs(channel - expected[i])).toBeLessThanOrEqual(1)
            );
          }
        }
      });
    }
  }

  it("returns the same shape as generateRandomColorRamp", () => {
    const ramp = generateFromColor({ hex: "#3F8F8C", total: 7 });
    expect(Object.keys(ramp).sort()).toEqual(["all", "base", "dark", "light"]);
    expect(ramp.base).toHaveLength(7);
    expect(ramp.light.length).toBeGreaterThan(0);
    expect(ramp.dark.length).toBeGreaterThan(0);
    expect(ramp.all).toHaveLength(
      ramp.base.length + ramp.light.length + ramp.dark.length
    );
  });

  it("supports hsv colorModel output", () => {
    const ramp = generateFromColor({
      hex: "#3F8F8C",
      total: 5,
      colorModel: "hsv",
    });
    expect(ramp.base[0]).toHaveLength(3);
  });
});
