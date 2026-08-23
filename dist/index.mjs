// src/generateFromColor.ts
function parseHexChannel(hex) {
  return parseInt(hex, 16);
}
function hexToRgb(hex) {
  const cleaned = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(cleaned)) {
    const expanded = cleaned.split("").map((c) => c + c).join("");
    return [
      parseHexChannel(expanded.slice(0, 2)),
      parseHexChannel(expanded.slice(2, 4)),
      parseHexChannel(expanded.slice(4, 6))
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(cleaned)) {
    return [
      parseHexChannel(cleaned.slice(0, 2)),
      parseHexChannel(cleaned.slice(2, 4)),
      parseHexChannel(cleaned.slice(4, 6))
    ];
  }
  throw new TypeError(`hex parameter is expected to be "#RGB" or "#RRGGBB" but \`${hex}\` given.`);
}
function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = (gn - bn) / d % 6;
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
function solveRange(rawT, target) {
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
function rangeDeviation(rawT, target) {
  const [min, max] = solveRange(rawT, target);
  return Math.max(min, 1 - max);
}
function pickAnchorIndex(curveMethod, total, curveAccent, saturationTarget, valueTarget) {
  const middle = Math.floor((total + 1) / 2);
  let bestIndex = middle;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 1; i <= total; i++) {
    const [rawX, rawY] = pointOnCurve(curveMethod, i, total + 1, curveAccent, [0, 0], [1, 1]);
    const score = Math.max(rangeDeviation(rawX, saturationTarget), rangeDeviation(rawY, valueTarget));
    const distanceToMiddle = Math.abs(i - middle);
    const bestDistanceToMiddle = Math.abs(bestIndex - middle);
    const isBetter = score < bestScore || score === bestScore && (distanceToMiddle < bestDistanceToMiddle || distanceToMiddle === bestDistanceToMiddle && i < bestIndex);
    if (isBetter) {
      bestIndex = i;
      bestScore = score;
    }
  }
  return bestIndex;
}
function resolveFromColor(options) {
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
    colorModel = "hsl"
  } = options;
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`total must be an integer of 1 or more.`);
  }
  const [r, g, b] = hexToRgb(hex);
  const [hue, saturationTarget, valueTarget] = rgbToHsv(r, g, b);
  let anchorIndex;
  if (anchor === "auto") {
    anchorIndex = pickAnchorIndex(curveMethod, total, curveAccent, saturationTarget, valueTarget);
  } else {
    if (!Number.isInteger(anchor) || anchor < 1 || anchor > total) {
      throw new RangeError(`anchor must be "auto" or between 1 and ${total}.`);
    }
    anchorIndex = anchor;
  }
  const [rawX, rawY] = pointOnCurve(curveMethod, anchorIndex, total + 1, curveAccent, [0, 0], [1, 1]);
  const [minSaturation, maxSaturation] = solveRange(rawX, saturationTarget);
  const [minLight, maxLight] = solveRange(rawY, valueTarget);
  const centerHue = (360 + (hue + 180 * hueCycle - anchorIndex * (360 / (total + 1)) * hueCycle) % 360) % 360;
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
    maxSaturationLight: [maxSaturation, maxLight]
  };
}
function generateFromColor(options) {
  const resolution = resolveFromColor(options);
  return generateRandomColorRamp({
    total: options.total ?? 9,
    centerHue: resolution.centerHue,
    hueCycle: resolution.hueCycle,
    offsetTint: resolution.offsetTint,
    offsetShade: resolution.offsetShade,
    curveAccent: resolution.curveAccent,
    tintShadeHueShift: resolution.tintShadeHueShift,
    curveMethod: resolution.curveMethod,
    offsetCurveModTint: resolution.offsetCurveModTint,
    offsetCurveModShade: resolution.offsetCurveModShade,
    minSaturationLight: resolution.minSaturationLight,
    maxSaturationLight: resolution.maxSaturationLight,
    colorModel: resolution.colorModel
  });
}

// src/index.ts
var easingFunctions = {
  linear: (x) => x,
  easeInSine: (x, accentuation = 0) => 1 - Math.cos(x * Math.PI / 2 + accentuation * Math.PI / 2),
  easeOutSine: (x, accentuation = 0) => Math.sin(x * Math.PI / 2 + accentuation * Math.PI / 2),
  easeInOutSine: (x, accentuation = 0) => -(Math.cos(Math.PI * (x + accentuation) / (1 + 2 * accentuation)) - 1) / 2,
  easeInQuad: (x, accentuation = 0) => x * x + accentuation * x * (1 - x),
  easeOutQuad: (x, accentuation = 0) => 1 - (1 - x) * (1 - x) - accentuation * x * (1 - x),
  easeInOutQuad: (x, accentuation = 0) => x < 0.5 ? 2 * x * x + accentuation * x * (1 - 2 * x) : 1 - Math.pow(-2 * x + 2, 2) / 2 - accentuation * (2 * x - 1) * (1 - Math.pow(-2 * x + 2, 2) / 2),
  easeInCubic: (x, accentuation = 0) => x * x * x + accentuation * x * x * (1 - x),
  easeOutCubic: (x, accentuation = 0) => 1 - Math.pow(1 - x, 3) - accentuation * Math.pow(1 - x, 2) * (1 - x),
  easeInOutCubic: (x, accentuation = 0) => x < 0.5 ? 4 * x * x * x + accentuation * x * x * (1 - 2 * x) : 1 - Math.pow(-2 * x + 2, 3) / 2 - accentuation * Math.pow(-2 * x + 2, 2) * (2 * x - 1) / 2,
  easeInQuart: (x, accentuation = 0) => x * x * x * x + accentuation * x * x * x * (1 - x),
  easeOutQuart: (x, accentuation = 0) => 1 - Math.pow(1 - x, 4) - accentuation * Math.pow(1 - x, 3) * (1 - x),
  easeInOutQuart: (x, accentuation = 0) => x < 0.5 ? 8 * x * x * x * x + accentuation * x * x * x * (1 - 2 * x) : 1 - Math.pow(-2 * x + 2, 4) / 2 - accentuation * Math.pow(-2 * x + 2, 3) * (2 * x - 1) / 2,
  easeInQuint: (x, accentuation = 0) => x * x * x * x * x + accentuation * x * x * x * x * (1 - x),
  easeOutQuint: (x, accentuation = 0) => 1 - Math.pow(1 - x, 5) - accentuation * Math.pow(1 - x, 4) * (1 - x),
  easeInOutQuint: (x, accentuation = 0) => x < 0.5 ? 16 * x * x * x * x * x + accentuation * x * x * x * x * (1 - 2 * x) : 1 - Math.pow(-2 * x + 2, 5) / 2 - accentuation * Math.pow(-2 * x + 2, 4) * (2 * x - 1) / 2,
  easeInExpo: (x, accentuation = 0) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)) + accentuation * Math.pow(2, 10 * (x - 1)),
  easeOutExpo: (x, accentuation = 0) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)) - accentuation * (1 - Math.pow(2, -10 * x)),
  easeInOutExpo: (x, accentuation = 0) => {
    if (x === 0) {
      return 0;
    }
    if (x === 1) {
      return 1;
    }
    if (x < 0.5) {
      return Math.pow(2, 20 * x - 10) / 2 + accentuation * Math.pow(2, 20 * x - 10) / 2;
    }
    return (2 - Math.pow(2, -20 * x + 10)) / 2 - accentuation * (2 - Math.pow(2, -20 * x + 10)) / 2;
  },
  easeInCirc: (x, accentuation = 0) => 1 - Math.sqrt(1 - Math.pow(x, 2)) + accentuation * Math.sqrt(1 - Math.pow(x, 2)),
  easeOutCirc: (x, accentuation = 0) => Math.sqrt(1 - Math.pow(x - 1, 2)) - accentuation * Math.sqrt(1 - Math.pow(x - 1, 2)),
  easeInOutCirc: (x, accentuation = 0) => {
    if (x < 0.5) {
      return (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2 + accentuation * (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2;
    }
    return (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2 - accentuation * (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
  },
  random: () => Math.random()
};
var easingFunctionsKeys = Object.keys(easingFunctions);
var hsv2hsl = (h, s, v, l = v - v * s / 2, m = Math.min(l, 1 - l)) => [h, m ? (v - l) / m : 0, l];
var hsv2hsx = (h, s, v, mode) => mode === "hsl" ? hsv2hsl(h, s, v) : [h, s, v];
var pointOnCurve = (curveMethod, i, total, curveAccent, min = [0, 0], max = [1, 1]) => {
  const limit = Math.PI / 2;
  const slice = limit / total;
  const percentile = i / total;
  let x = 0, y = 0;
  if (curveMethod === "lam\xE9") {
    const t = percentile * limit;
    const exp = 2 / (2 + 20 * curveAccent);
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    x = Math.sign(cosT) * Math.abs(cosT) ** exp;
    y = Math.sign(sinT) * Math.abs(sinT) ** exp;
  } else if (curveMethod === "arc") {
    y = Math.cos(-Math.PI / 2 + i * slice + curveAccent);
    x = Math.sin(Math.PI / 2 + i * slice - curveAccent);
  } else if (curveMethod === "pow") {
    x = Math.pow(1 - percentile, 1 - curveAccent);
    y = Math.pow(percentile, 1 - curveAccent);
  } else if (curveMethod === "powY") {
    x = Math.pow(1 - percentile, curveAccent);
    y = Math.pow(percentile, 1 - curveAccent);
  } else if (curveMethod === "powX") {
    x = Math.pow(percentile, curveAccent);
    y = Math.pow(percentile, 1 - curveAccent);
  } else if (typeof curveMethod === "function") {
    const modifiedPositions = curveMethod(percentile, curveAccent);
    x = modifiedPositions[0];
    y = modifiedPositions[1];
  } else if (easingFunctionsKeys.includes(curveMethod)) {
    x = percentile;
    y = 1 - easingFunctions[curveMethod](percentile, curveAccent * -1) || 0;
  } else {
    throw new Error(`pointOnCurve() curveAccent parameter is expected to be "lam\xE9" | "arc" | "pow" | "powY" | "powX" or a function but \`${curveMethod}\` given.`);
  }
  x = min[0] + Math.min(Math.max(x, 0), 1) * (max[0] - min[0]);
  y = min[1] + Math.min(Math.max(y, 0), 1) * (max[1] - min[1]);
  return [x, y];
};
function generateRandomColorRamp({
  total = 3,
  centerHue = 0,
  hueCycle = 0.3,
  offsetTint = 0.1,
  offsetShade = 0.1,
  curveAccent = 0,
  tintShadeHueShift = 0.1,
  curveMethod = "arc",
  offsetCurveModTint = 0.03,
  offsetCurveModShade = 0.03,
  minSaturationLight = [0, 0],
  maxSaturationLight = [1, 1],
  colorModel = "hsl"
} = {}) {
  const baseColors = [];
  const lightColors = [];
  const darkColors = [];
  for (let i = 1; i < total + 1; i++) {
    const [x, y] = pointOnCurve(curveMethod, i, total + 1, curveAccent, minSaturationLight, maxSaturationLight);
    const h = (360 + (-180 * hueCycle + (centerHue + i * (360 / (total + 1)) * hueCycle))) % 360;
    const hsl = hsv2hsx(h, x, y, colorModel);
    baseColors.push(hsl);
    const [xl, yl] = pointOnCurve(curveMethod, i, total + 1, curveAccent + offsetCurveModTint, minSaturationLight, maxSaturationLight);
    const hslLight = hsv2hsx(h, xl, yl, colorModel);
    lightColors.push([
      (h + 360 * tintShadeHueShift) % 360,
      hslLight[1] - offsetTint,
      hslLight[2] + offsetTint
    ]);
    const [xd, yd] = pointOnCurve(curveMethod, i, total + 1, curveAccent - offsetCurveModShade, minSaturationLight, maxSaturationLight);
    const hslDark = hsv2hsx(h, xd, yd, colorModel);
    darkColors.push([
      (360 + (h - 360 * tintShadeHueShift)) % 360,
      hslDark[1] - offsetShade,
      hslDark[2] - offsetShade
    ]);
  }
  return {
    light: lightColors,
    dark: darkColors,
    base: baseColors,
    all: [...lightColors, ...baseColors, ...darkColors]
  };
}
var colorModsCSS = {
  oklch: (color) => [color[2], color[1] * 0.4, color[0]],
  lch: (color) => [color[2] * 100, color[1] * 150, color[0]],
  hsl: (color) => [color[0], color[1] * 100 + "%", color[2] * 100 + "%"]
};
var colorToCSS = (color, mode = "oklch") => `${mode}(${colorModsCSS[mode](color).join(" ")})`;
var generateRandomColorRampParams = {
  curveMethod: {
    default: "lam\xE9",
    props: {
      options: ["lam\xE9", "arc", "pow", "powY", "powX", ...easingFunctionsKeys]
    }
  },
  curveAccent: {
    default: 0,
    props: { min: -0.095, max: 1, step: 1e-3 }
  },
  total: {
    default: 9,
    props: { min: 3, max: 35, step: 1 }
  },
  centerHue: {
    default: 0,
    props: { min: 0, max: 360, step: 0.1 }
  },
  hueCycle: {
    default: 0.3,
    props: { min: -1.25, max: 1.5, step: 1e-3 }
  },
  offsetTint: {
    default: 0.01,
    props: { min: 0, max: 0.4, step: 1e-3 }
  },
  offsetShade: {
    default: 0.01,
    props: { min: 0, max: 0.4, step: 1e-3 }
  },
  tintShadeHueShift: {
    default: 0.01,
    props: { min: 0, max: 1, step: 1e-3 }
  },
  offsetCurveModTint: {
    default: 0.03,
    props: { min: 0, max: 0.4, step: 1e-4 }
  },
  offsetCurveModShade: {
    default: 0.03,
    props: { min: 0, max: 0.4, step: 1e-4 }
  },
  minSaturation: {
    default: 0,
    props: { min: -0.25, max: 1, step: 1e-3 }
  },
  minLight: {
    default: 0,
    props: { min: -0.25, max: 1, step: 1e-3 }
  },
  maxSaturation: {
    default: 1,
    props: { min: 0, max: 1, step: 1e-3 }
  },
  maxLight: {
    default: 1,
    props: { min: 0, max: 1, step: 1e-3 }
  }
};
export {
  colorToCSS,
  easingFunctions,
  generateFromColor,
  generateRandomColorRamp,
  generateRandomColorRampParams,
  hsv2hsl,
  hsv2hsx,
  pointOnCurve,
  resolveFromColor
};
