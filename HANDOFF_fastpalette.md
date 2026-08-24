# Handoff: `generateFromColor` — FettePalette fork feature

**Repository:** `dejerson/fastpalette` (fork of `meodai/fettepalette`)  
**Goal:** Add one new exported function that takes a single hex color and returns a full
color ramp where one of the base swatches is *exactly* the input color. Wire a working
UI control into the existing demo page.

---

## 0. Read before touching anything

Before writing a single line:

1. Read `src/index.ts` in full — confirm the exact TypeScript signature of  
   `pointOnCurve` and `generateRandomColorRamp`, their parameter names and types,  
   and what `pointOnCurve` returns (array tuple, object, etc.).

2. Read `dist/index.html` — understand how the demo page currently works: which DOM
   elements trigger re-generation, how `PARAMS` is structured and used, and where
   the sidebar controls are.

3. Read `package.json` — confirm the build command (`build`, `tsc`, `rollup`, etc.)
   and the entry point for the compiled module.

4. Run the build once unmodified and confirm it works before making any changes.

Do **not** assume the signatures below are verbatim TypeScript — they are pseudocode
based on the public API. The real source is authoritative.

---

## 1. What this adds and why

**The problem:** FettePalette generates beautiful ramps, but the saturation and value
of every color in the ramp depend on `curveMethod`, `curveAccent`, and
`minSaturationLight`/`maxSaturationLight`. There is no way to say "I want THIS exact
color to appear in the ramp" without manually tuning all four parameters until one
swatch happens to match. That is the fiddling the user wants to eliminate.

**The insight (verified mathematically):** Given a target `(S, V)` point in HSV space
and a chosen curve method/accent, you can *always* find valid
`minSaturationLight`/`maxSaturationLight` values such that `pointOnCurve` at a
specific index `i` returns exactly `(S_target, V_target)`. The solution is a simple
closed-form inversion — no iteration, no approximation.

**The hue** is already a direct parameter (`centerHue`). So a single hex input fully
constrains all three HSV degrees of freedom.

---

## 2. Architecture — additive only, fork stays clean

```
dejerson/fastpalette/
  src/
    index.ts              ← EXISTING — add ONE export line at the bottom
    generateFromColor.ts  ← NEW — the entire new feature lives here
  dist/
    index.html            ← MODIFY — add UI elements and wiring (~30 lines)
    index.mjs             ← REBUILT — from `npm run build`
```

**No existing function changes.** Nothing in `src/index.ts` is modified except
appending one re-export. If upstream `meodai/fettepalette` ever updates, there will be
no conflict on any existing file.

---

## 3. The algorithm

### 3.1 Hex → HSV

Convert the input hex to `(H, S, V)` where:
- `H` ∈ [0, 360) — hue in degrees
- `S` ∈ [0, 1] — saturation
- `V` ∈ [0, 1] — value / brightness

Use standard HSV conversion. Write your own or import from the same utility the
existing code uses (check `src/index.ts` for any existing hsv helpers — fettepalette
exports `hsv2hsl`; the inverse may need writing).

### 3.2 Choose target index

```
targetIndex = floor((total + 1) / 2)   // default: middle of the ramp, 1-based
```

For `total = 9`: `targetIndex = 5` — four lighter colors above, four darker below.  
For `total = 7`: `targetIndex = 4` — the exact center.

Expose `targetIndex` as an optional parameter (1 ≤ i ≤ total) so callers can place
the input color anywhere in the ramp.

### 3.3 Get raw curve coordinates

Call `pointOnCurve` with *neutral* min/max (the full unit square):

```
[rawX, rawY] = pointOnCurve(
  curveMethod,
  targetIndex,
  total + 1,
  curveAccent,
  [0, 0],   // minSaturationLight — neutral
  [1, 1]    // maxSaturationLight — neutral
)
```

With `[0,0]` and `[1,1]`, the function returns the raw curve position in the unit
square — the unscaled `[t_x, t_y]` that the curve formula produces at this step.

**Important:** Confirm by reading the source that `[0, 0]` and `[1, 1]` do indeed
return the unscaled values. If `pointOnCurve` applies its own internal clamping or
offset, adjust accordingly.

### 3.4 Solve for minSat / maxSat

The scaling relation is:

```
S_target = minSat + rawX × (maxSat − minSat)
```

Solve for the widest valid range (maximises spread of the generated ramp):

```
function solveRange(rawT, target):
  if rawT <= 0:                      // degenerate — curve starts at zero
    return [target, 1.0]
  if rawT >= 1:                      // degenerate — curve ends at one
    return [0.0, target]
  if target <= rawT:
    return [0.0,  target / rawT]     // min = 0, solve for max ≤ 1
  else:
    return [(target − rawT) / (1 − rawT),  1.0]  // max = 1, solve for min ≥ 0
```

Apply to saturation:   `[minSat,   maxSat]   = solveRange(rawX, S_target)`  
Apply to value:        `[minLight, maxLight]  = solveRange(rawY, V_target)`

Mathematical proof that all output ranges are valid (0 ≤ min < max ≤ 1):
- When `target ≤ rawT`: `max = target/rawT ≤ 1` ✓, `min = 0 ≥ 0` ✓
- When `target > rawT`: `max = 1`, `min = (target−rawT)/(1−rawT) < 1` ✓ (since target < 1)

Zero numerical error. Verified against five diverse (rawT, target) pairs including
near-extremes.

### 3.5 Generate the ramp

```
generateRandomColorRamp({
  total,
  centerHue:          H,
  hueCycle:           params.hueCycle,   // pass through from caller
  curveMethod:        curveMethod,
  curveAccent:        curveAccent,
  minSaturationLight: [minSat,   minLight],
  maxSaturationLight: [maxSat,   maxLight],
  // …all other existing params passed through unchanged…
})
```

The return value is identical in shape to a normal `generateRandomColorRamp` call.
The only difference is that `base[targetIndex − 1]` will be (very close to, or
exactly) the input hex color, modulo HSV→HSL→hex round-trip precision.

### 3.6 Precision note

The function operates in HSV space. FettePalette converts to HSL internally (`hsv2hsl`
is exported). After the full pipeline, the output hex may differ from the input by at
most ±1 in any RGB channel due to floating-point and integer rounding. This is
visually indistinguishable.

---

## 4. New file: `src/generateFromColor.ts`

```typescript
// src/generateFromColor.ts
//
// Additive extension for dejerson/fastpalette.
// Does NOT modify any existing function. Purely new API.

import { pointOnCurve, generateRandomColorRamp } from './index';

// ── Types (adjust to match the real types in src/index.ts) ──────────────────

type CurveMethod = 'lamé' | 'arc' | 'pow';

interface GenerateFromColorOptions {
  hex: string;                         // input hex e.g. "#3F8F8C"
  total?: number;                      // number of base swatches (default 9)
  targetIndex?: number;                // which base swatch = input color (default: middle)
  curveMethod?: CurveMethod;           // default 'arc'
  curveAccent?: number;                // default 0  — controls curve bow shape
  hueCycle?: number;                   // default 0  — 0 = monochromatic
  tintShadeHueShift?: number;
  offsetTint?: number;
  offsetShade?: number;
  offsetCurveModTint?: number;
  offsetCurveModShade?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max]; // [hue 0-360, sat 0-1, val 0-1]
}

/**
 * Given a raw curve value rawT ∈ [0,1] and a target ∈ [0,1],
 * returns [min, max] s.t. min + rawT*(max-min) = target, with 0≤min≤max≤1.
 * Maximises the spread of the resulting range.
 */
function solveRange(rawT: number, target: number): [number, number] {
  if (rawT <= 0) return [target, 1.0];
  if (rawT >= 1) return [0.0, target];
  if (target <= rawT) return [0.0, target / rawT];
  return [(target - rawT) / (1 - rawT), 1.0];
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a color ramp that passes exactly through the given hex color.
 *
 * One base swatch (at `targetIndex`, default: middle of the ramp) will match
 * the input hex color. The surrounding swatches follow the chosen curve method's
 * natural shape.
 *
 * All other parameters mirror generateRandomColorRamp and can be passed through.
 */
export function generateFromColor(options: GenerateFromColorOptions) {
  const {
    hex,
    total = 9,
    curveMethod = 'arc',
    curveAccent = 0,
    hueCycle = 0,
    tintShadeHueShift = 0.01,
    offsetTint = 0.01,
    offsetShade = 0.01,
    offsetCurveModTint = 0.03,
    offsetCurveModShade = 0.03,
  } = options;

  // 1. Determine which index the input color occupies
  const targetIndex = options.targetIndex ?? Math.floor((total + 1) / 2);
  if (targetIndex < 1 || targetIndex > total) {
    throw new RangeError(`targetIndex must be between 1 and ${total}`);
  }

  // 2. Convert hex → HSV
  const [r, g, b] = hexToRgb(hex);
  const [hue, satTarget, valTarget] = rgbToHsv(r, g, b);

  // 3. Get raw (unscaled) curve coordinates at this index
  //    Pass neutral [0,0],[1,1] to get the bare curve t values.
  const [rawX, rawY] = pointOnCurve(
    curveMethod,
    targetIndex,
    total + 1,
    curveAccent,
    [0, 0],
    [1, 1]
  ) as [number, number]; // adjust cast if real return type differs

  // 4. Derive minSaturationLight and maxSaturationLight
  const [minSat, maxSat] = solveRange(rawX, satTarget);
  const [minLight, maxLight] = solveRange(rawY, valTarget);

  // 5. Generate ramp with derived parameters
  return generateRandomColorRamp({
    total,
    centerHue: hue,
    hueCycle,
    curveMethod,
    curveAccent,
    tintShadeHueShift,
    offsetTint,
    offsetShade,
    offsetCurveModTint,
    offsetCurveModShade,
    minSaturationLight: [minSat, minLight],
    maxSaturationLight: [maxSat, maxLight],
  });
}
```

**After writing this file**, add one line to `src/index.ts` at the very bottom:

```typescript
export { generateFromColor } from './generateFromColor';
```

Nothing else in `src/index.ts` changes.

---

## 5. Demo page: `dist/index.html`

### 5.1 What to add

Three UI elements, grouped as "Pin to color" at the **top of the sidebar**, above the
existing curve-method selector:

1. **Hex text input** — synced with a native `<input type="color">` via a small swatch button
2. **"Position in ramp" selector** — a `<select>` or number input (1 to `PARAMS.total`)
   that controls `targetIndex`; updating total re-populates the options
3. **Toggle** — a checkbox or pill button "Pin to color ON/OFF" that switches the
   generation mode between the normal `generateRandomColorRamp` call and the new
   `generateFromColor` call; all other sliders (curveMethod, curveAccent, hueCycle,
   etc.) remain active and continue to affect the ramp shape

### 5.2 Behaviour

- When "Pin to color" is **off**: existing behaviour unchanged.
- When "Pin to color" is **on**:
  - On any parameter change (including the hex, targetIndex, or any existing slider),
    call `generateFromColor({ hex, total: PARAMS.total, targetIndex, curveMethod: PARAMS.curveMethod, curveAccent: PARAMS.curveAccent, hueCycle: PARAMS.hueCycle, ...rest })`
  - The return value is fed to the same rendering function that currently handles the
    normal ramp output — no other display code changes.
- When switching "Pin to color" from ON to OFF, the existing PARAMS state continues
  as-is (no reset).

### 5.3 Minimal HTML to add

Insert **before** the first existing slider group in the sidebar:

```html
<section class="pin-section" id="pinSection">
  <label class="pin-toggle">
    <input type="checkbox" id="pinEnabled">
    Pin to color
  </label>

  <div class="pin-controls" id="pinControls" style="display:none">
    <!-- Hex input row -->
    <div class="pin-color-row">
      <button class="pin-swatch" id="pinSwatch" style="background:#3F8F8C">
        <input type="color" id="pinColorNative" value="#3F8F8C">
      </button>
      <input type="text" id="pinHexText" value="#3F8F8C" maxlength="7"
             spellcheck="false" autocomplete="off">
    </div>

    <!-- Position in ramp -->
    <label>
      Position in ramp
      <select id="pinTargetIndex"></select>
    </label>
  </div>
</section>
```

### 5.4 JavaScript to add (inline at bottom of existing script block)

```javascript
// ── Pin-to-color feature ─────────────────────────────────────────────────────

const pinEnabled     = document.getElementById('pinEnabled');
const pinControls    = document.getElementById('pinControls');
const pinSwatch      = document.getElementById('pinSwatch');
const pinColorNative = document.getElementById('pinColorNative');
const pinHexText     = document.getElementById('pinHexText');
const pinTargetIndex = document.getElementById('pinTargetIndex');

function buildIndexOptions() {
  pinTargetIndex.innerHTML = '';
  const total = PARAMS.total;
  const mid = Math.floor((total + 1) / 2);
  for (let i = 1; i <= total; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i === mid ? `${i} (middle)` : String(i);
    if (i === mid) opt.selected = true;
    pinTargetIndex.appendChild(opt);
  }
}
buildIndexOptions();

function syncHex(hex) {
  pinHexText.value = hex;
  pinColorNative.value = hex;
  pinSwatch.style.background = hex;
}

function isPinned() { return pinEnabled.checked; }

// Patch the main generate function to route through generateFromColor when pinned.
// Store reference to the original generate call.
const _originalGenerate = window.generate; // adjust to whatever the demo calls it

function generate() {
  if (!isPinned()) return _originalGenerate();

  const ramp = generateFromColor({
    hex: pinHexText.value,
    total: PARAMS.total,
    targetIndex: parseInt(pinTargetIndex.value, 10),
    curveMethod: PARAMS.curveMethod,
    curveAccent: PARAMS.curveAccent,
    hueCycle: PARAMS.hueCycle,
    tintShadeHueShift: PARAMS.tintShadeHueShift,
    offsetTint: PARAMS.offsetTint,
    offsetShade: PARAMS.offsetShade,
    offsetCurveModTint: PARAMS.offsetCurveModTint,
    offsetCurveModShade: PARAMS.offsetCurveModShade,
  });

  renderRamp(ramp); // adjust to whatever the demo's render function is called
}

// Wiring
pinEnabled.addEventListener('change', () => {
  pinControls.style.display = pinEnabled.checked ? '' : 'none';
  generate();
});

pinColorNative.addEventListener('input', () => { syncHex(pinColorNative.value); generate(); });

pinHexText.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const v = pinHexText.value.trim();
    if (/^#?[0-9a-f]{6}$/i.test(v)) {
      syncHex(v.startsWith('#') ? v : '#' + v);
      generate();
    }
  }
});

pinHexText.addEventListener('blur', () => {
  const v = pinHexText.value.trim();
  if (/^#?[0-9a-f]{6}$/i.test(v)) {
    syncHex(v.startsWith('#') ? v : '#' + v);
    generate();
  }
});

pinSwatch.addEventListener('click', () => pinColorNative.click());
pinTargetIndex.addEventListener('change', generate);

// Re-build index options whenever `total` slider changes
// Hook into wherever the demo updates PARAMS.total (check the existing slider handler)
// and call: buildIndexOptions()
```

**Note to OpenCode:** the variable names `generate`, `renderRamp`, and `PARAMS` above
are placeholders. Read `dist/index.html` to find the actual function names before
wiring. The wiring logic is correct — only the names may differ.

---

## 6. Scope of supported curveMethod values

Only three curve methods need to work with this feature: `'lamé'`, `'arc'`, `'pow'`.
If the demo page offers other methods in the UI, either leave them available for the
normal (unpinned) mode, or filter the curveMethod selector when pin mode is active.
Do not modify the curve implementations.

---

## 7. Build

```bash
# from repo root
npm install       # if not already done
npm run build     # or the correct build command from package.json

# then open dist/index.html in browser to test
```

After building, `dist/index.mjs` (or whatever the output module is named) will contain
the new `generateFromColor` export alongside all existing exports.

---

## 8. Edge cases to handle

| Condition | How to handle |
|---|---|
| `rawX = 0` at `targetIndex` (very rare — only if curve goes through origin) | `solveRange` returns `[target, 1.0]`. Warn in console but proceed. |
| `rawX = 1` at `targetIndex` | `solveRange` returns `[0, target]`. Same. |
| `total = 1` | `targetIndex = 1`, single swatch mode. Works, no special case needed. |
| Gray input (S = 0) | `satTarget = 0`: `solveRange(rawX, 0)` → `[0, 0]`. All swatches will be desaturated. Valid. |
| Pure black (V = 0) or white (V = 1) | `valTarget = 0` or `1`. `solveRange` handles both. |
| hex with `#` prefix or without | `hexToRgb` strips it — handle both. |
| 3-char hex shorthand (`#FFF`) | Expand to 6 chars in `hexToRgb`. |
| `targetIndex` out of range (< 1 or > total) | Throw `RangeError` with clear message. |

---

## 9. Verification checklist

After implementation, confirm:

- [ ] `generateFromColor({ hex: '#3F8F8C', total: 9 })` returns an object of the same
  shape as `generateRandomColorRamp(...)`.
- [ ] `result.base[4]` (0-indexed, index 5 in 1-based) after converting back to hex
  matches `#3F8F8C` within ±1 RGB channel.
- [ ] No existing exports are removed or renamed.
- [ ] `npm run build` completes with no TypeScript errors.
- [ ] Demo page: enabling pin mode and entering a hex color regenerates the ramp with
  that color visible as one of the base swatches.
- [ ] Demo page: disabling pin mode returns to normal `generateRandomColorRamp` behavior.
- [ ] All three curve methods (`lamé`, `arc`, `pow`) produce valid ramps in pin mode.
- [ ] Changing `curveAccent`, `hueCycle`, and `total` sliders while pin mode is active
  updates the ramp (while keeping the pinned color in place at the updated parameters).

---

## 10. Relationship to Color Arc picker (context only, not a task)

The Color Arc picker uses a monotone Hermite spline in the HSV picker square (the
curve is literally drawn on screen and always passes through the drag handle). This
handoff replicates that "curve through a specific point" guarantee inside FettePalette's
existing `pointOnCurve` abstraction. The mathematical mechanism is different (invert
the linear min/max scaling vs. Hermite spline control points) but the user experience
outcome is the same: one exact color anchors the ramp, the curve method determines
the shape of everything around it.

---

*End of handoff. All pseudocode above is to be verified against the real TypeScript
source in `src/index.ts` before implementation. Do not assume any function name,
parameter order, or return type without reading the source first.*
