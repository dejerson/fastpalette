# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Demo page: a fixed **top nav** bar with the FastPalette brand icon (which
  mirrors the current ramp's 4-swatch composition) and a **Download SVG**
  button.
- Demo page: **SVG export** — one flat, Illustrator/Figma-friendly SVG of the
  current palette. 11 equal square tiles in a curated 2-row layout (3 on top,
  8 on the bottom), left-aligned with uniform 40px spacing and matching outer
  padding. Within each tile the color with the most WCAG AA pairs sits in the
  centered square, which overlaps the two corner swatches so the pairing reads
  at a glance; every fill is an inline `#HEX`, independently editable in both
  apps. Files are named `<color-name>-<hex>-fastpalette.svg` from the
  base/pinned color (color names resolved from a web API when available).

### Changed

- Demo page: restored a real **pin toggle** for the base color — when locked,
  the hex is the source of truth and the ramp is resolved around it via
  `resolveFromColor()`, with the five derived sliders disabled. The pinned
  color is kept in every tile's pool so it appears in as many tiles as
  possible at a random seat, only winning a seat when it ties (never beats) the
  best contrast candidate, with a last-resort guarantee that it lands in at
  least one tile.
- Demo page: palette tiles are dealt with a stronger WCAG contrast bias — top
  rows greedily maximize WCAG AA pairs; each tile's AA-pair count is shown on
  hover.
- Demo page: the auto best-fit anchor slot is always visible — as `(n)` in the
  baseColor label, as a hollow outline on that point in the curve preview and
  as a hollow-ring inset on that swatch in the Base Colors list.
- Demo page: boots from the library's param defaults; the hex field starts as
  the middle swatch of that default ramp; `total` renders first in the pane;
  the exported code snippet shows `generateRandomColorRamp()` with the current
  resolved values and annotates the resolved slot.
- Demo page: rebranded to **FastPalette** across title, meta tags, headings
  and about copy; the About block moves below the Function Call snippet and
  the footer is hidden. The main `<h1>` heading moved into the new top nav.
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
