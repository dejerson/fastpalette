# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Demo page: Pin-to-Color mode is replaced by an always-on **baseColor**
  control at the top of Settings — there is no toggle anymore. The hex field
  and the five derived sliders (`centerHue`, `minSaturation`, `minLight`,
  `maxSaturation`, `maxLight`) stay in two-way sync: typing a hex re-solves
  the sliders via `resolveFromColor()`, while dragging a slider redraws and
  mirrors the color at the anchor slot into the hex field without ever moving
  the sliders themselves.
- Demo page: the auto best-fit anchor slot is always visible — as `(n)` in the
  baseColor label, as a hollow outline on that point in the curve preview and
  as a hollow-ring inset on that swatch in the Base Colors list.
- Demo page: boots from the library's param defaults; the hex field starts as
  the middle swatch of that default ramp; `total` renders first in the pane;
  the exported code snippet shows `generateRandomColorRamp()` with the current
  resolved values and annotates the resolved slot.
- Demo page: rebranded to **FastPalette** across title, meta tags, headings
  and about copy; the About block moves below the Function Call snippet and
  the footer is hidden.
- Demo page: native scrollbars are replaced with JS-drawn overlay thumbs on
  both the page and the settings sidebar — 6px pills that fade out while idle,
  brighten on hover, are draggable, and flip light once the page scrolls into
  the dark names/footer zone.
- Demo page: option-type settings (e.g. curve method) render as a segmented
  row of buttons with a pressed state instead of a `<select>` dropdown.

### Internal

- Agent guardrails: `.archive/` is a hidden dot-directory outside gitignore and
  out of bounds for coding agents, and `.opencode/opencode.json` hard-denies
  OpenCode reads *and* edits under `.archive/**`. macOS `.DS_Store` files are
  ignored.

## [3.4.0] - 2026-08-24

### Added

- `generateFromColor()` — generates a color ramp that contains exactly one given
  hex color as one of its base swatches, by closed-form inversion of the curve's
  min/max scaling. Supports `anchor: number | "auto"` (auto picks the slot that
  distorts the saturation/lightness ranges least) and stays exact for any
  `hueCycle` via `centerHue` inversion. Only the `'lamé'`, `'arc'` and `'pow'`
  curve methods are supported.
- `resolveFromColor()` — same options, returns the derived parameters
  (`anchorIndex`, `centerHue`, solved `minSaturationLight`/`maxSaturationLight`)
  without generating a ramp.
- Vitest suite (`npm test`) covering hex/HSV helpers, the `solveRange` math
  grid, anchor validation and exact pinned-color output across curve methods,
  ramp sizes and anchors.

### Changed

- Demo page: Pin-to-Color UI (toggle, hex input, position selector with auto
  best-fit, live meta readout, code snippet export).
- Demo-only: `total` slider capped at 3…12; sub-0.01 slider steps coarsened to
  0.01; derived sliders hidden while pin mode is active; curve preview uses the
  solved boxes in pin mode; palette sample tiles dealt with a WCAG contrast bias.

### Internal

- TypeScript build config sets `"types": []` so vitest's transitive `@types/chai`
  does not break `tsc --build`.
