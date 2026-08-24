# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
