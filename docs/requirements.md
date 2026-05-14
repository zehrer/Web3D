# Requirements

This document captures recent product decisions that are not derivable from the code itself. Update it whenever a behavioural decision is made that future contributors would not be able to infer.

## Material Library

### Folder names
The four built-in material groups use short, plain labels:

- **Sheet**
- **Timber**
- **Cladding**
- **Glass**

These are the values of `OBJECT_TYPE_LABELS` in `src/lib/profiles.ts`. Old projects that stored the previous names (`Sheet Goods`, `Structural Timber`, `Rhombus Cladding`) are renamed on load by the v5→v6 migration in `src/lib/serialization.ts`.

### "Add from library" menu behaviour
Clicking a group in the rail's library menu adds a part directly using the **last used material** from that group. If no material has been picked yet for that group, the **first material** in the group is used. The menu does not expand to show a per-material submenu — material selection will move to a dedicated library UI later (planned: shared GitHub-hosted library).

The "last used material per group" state is tracked locally in the `Viewport` component (`lastUsedMaterialByGroup`). It is not persisted across reloads.

### Material preview
Selecting a material in the Material tab shows **only** that material at its default size, drawn at world origin `(0, 0, 0)`. The actual design parts and measurements are hidden while a material is selected — the preview is meant to show what a raw piece looks like, not to filter the scene. Deselecting the material restores the design.

## Default Profiles

- 100×100 mm structural timber has a default length of **2500 mm** (smallest stock length in the user's source).
- Other timber sizes still default to 2000 mm.

These live in `TIMBER_PROFILES` in `src/lib/profiles.ts`.

## Demo Project

New projects start empty. The "Garden Shed Demo" only appears on first launch and is the source for `src/data/gardenShedDemo.json`. The demo file may be updated freely; only `groups`, `parts`, `measurements`, `snapSettings`, `cameraState`, and `name` are read by `createDemoProject` — material groups and materials are always generated fresh by `createInitialMaterials`.

## Grid / Workspace

The ground grid is configurable per project via `gridSettings`:

- `size` — total side length of the square grid, in mm (default 6000).
- `originX` — distance in mm from the **left edge** of the grid to where the world origin `(0,0,0)` sits (default 0 → origin at the corner). Set to `size / 2` to centre the origin on the grid.
- `originZ` — same as `originX` for the front edge.

These three fields are exposed in the **Settings** menu (top toolbar) below the snap settings. They are stored on the `ProjectDocument` and undo/redo-aware.

## Camera Presets

The right-rail camera buttons (perspective and top) are **dynamic**: they compute a bounding box from all visible parts and pick a camera distance large enough to fit the design in view with a small margin. If the project has no parts, they fall back to the grid settings.

The four supported presets are: `perspective`, `top`, `front`, `right`. All four use the same fitting logic.

## Export Filenames

Exported `.web3d` files are prefixed with a `YYMMDDHHMM` timestamp, e.g. `2605121804_garden-shed-demo.web3d`. Other export formats (STL, glTF, USDZ) do not currently use a timestamp prefix.

## Planned: Profiles-Out-of-Code Refactor

The hardcoded profile catalog in `src/lib/profiles.ts` is the next architectural step to remove. Decision principles:

- **Library material = creation-time template, not a live reference.** Editing a library entry (e.g. renaming "Timber 100×100" or changing its default cross-section) does NOT mutate existing parts. Existing parts retain the dimensions they were built with. Real woodworking projects depend on exact cross-sections — quietly updating placed parts would shift joints and stacking and silently break the design.
- **Parts become self-contained.** `PartNode` keeps everything it needs to render and behave correctly: `size`, `position`, `rotation`, `color`, `objectType`. The cross-section lock currently computed via `applyProfileToSize` and `getProfileById` moves onto the part itself (e.g., `crossSectionWidthMm`/`crossSectionHeightMm` for timber, `thicknessMm` for sheet/glass). `profileId` is dropped from `PartNode`.
- **`materialId` stays as a tag.** It groups parts in the cut-list (the library material's *name* becomes the label). A part with no `materialId` falls back to a label generated from its own dimensions.
- **Changing a part's cross-section becomes an explicit operation.** "Change Profile" on a selected part rewrites its locked dimensions, with a warning if the change would cause overlaps with neighbors.

## Planned: Inspector Polish

User noted other CAD tools have nicer property inspectors (presets, grouping, visual cues for locked axes, smart steppers, drag-to-adjust scrubbers, etc.). Revisit the inspector once the profiles-out-of-code refactor lands and we have a cleaner data model to expose.

**Principle confirmed (2026-05-13):** locked dimensions are hidden from the inspector entirely — not shown as readonly fields. If a part has `thicknessMm`, its Z is hidden in the size editor; if a part has `crossSectionWidthMm`/`Height`, those axes are hidden. The hidden axes are still enforced at the data layer by `applyLockToSize`. Currently this is done with per-type branches in `InspectorPanel.tsx`; should fall out naturally from the generic-part refactor.

## Recommended Next Step: User-Editable Material Library

After Step 5 of the refactor, the data path supports user-created materials end-to-end (lock fields, color, default size all live on `MaterialNode`). The remaining gap is the **UI** — there's no way for a user to create a new material like "Timber 120 × 80 mm" without editing code. This is the recommended next step because:

1. It unblocks the original motivation for the whole refactor (custom timber sizes, local market standards).
2. It gives the planned Step 6 ("Change Cross-Section" warning) something useful to be triggered by — without user-creatable materials the only triggers are the seeded 18 entries.
3. It's incremental: the data shape and migrations stay untouched. Schema does **not** need to bump.

### Scope

- "Add Material" button on the Material sidebar (likely on each group's row, similar to "Add Folder").
- Form with: name, group, object type (timber/cladding/sheet/glass), color, default size X/Y/Z, lock fields (the appropriate ones for the chosen type — cross-section for timber/cladding, thickness for sheet/glass).
- New action `addMaterial(...)` in the editor store; undo/redo-aware via `withProjectHistory`.
- Optional: "Create from selected part" — seed the form from the selected part's dimensions.

### Out of scope for this step

- Editing existing materials' lock fields after creation. (Renaming, color, default size are already editable; lock fields are not, and changing them retroactively would violate the "library = template, not live reference" principle without an explicit per-part propagation flow.)
- Importing materials from a Global Library (a separate planned item).

## Planned: Y-up / Z-up Display Toggle

Internally the model and Three.js scene are **y-up** (Y is vertical). Many CAD tools (SketchUp, Blender, AutoCAD) use **z-up** convention. Add a setting (Settings menu, next to Display units) to switch between the two — but **purely as a presentation layer**:

- Stored data does NOT change. A part at `position: {x:0, y:100, z:0}` stays the same.
- The 3D scene does NOT re-orient — same camera presets, same gizmos.
- Only the **labels and the order of axes in the UI** change: in z-up mode, the inspector shows `Z` where it currently shows `Y`, and `Y` where it currently shows `Z`. Snap fields, grid origin (`originX`/`originZ`), VectorFields, and the axis arrows all flip their labels accordingly.

Cleanest implementation will probably be a small helper layer (e.g. `axisLabels(upAxis)` → `{ horiz1, vert, horiz2 }`) that every UI consumer reads from. The setting itself stores `upAxis: "y" | "z"` on the `ProjectDocument` (with `"y"` as the default for back-compat).

## Planned: Overlap / Collision Detection

The app has no overlap detection today — two parts can occupy the same volume without any indication. Useful in several flows:

- Cut-list / material summary could flag overlapping pieces (manufacturing bug).
- Move/resize gizmos could warn during drag.
- "Change Profile" (above) is the first real consumer of the warning.

Treat as a shared service so each consumer doesn't reimplement the math.

## Schema Versions

Current `PROJECT_SCHEMA_VERSION` is **9**. Bumps must add a corresponding `migrateProjectVnToCurrent` function in `src/lib/serialization.ts` and chain it through any older migrations.

| Version | Change |
|---|---|
| 1 | Initial — thickness presets |
| 2 | Object profiles instead of thickness presets |
| 3 | Group support (`groupId` on parts) |
| 4 | Measurement nodes |
| 5 | Material library (`materialGroups`, `materials`, `materialId` on parts) |
| 6 | Grid settings (`gridSettings` on `ProjectDocument`); renames legacy material group labels |
| 7 | Step 1 of profiles-out-of-code refactor: parts carry `crossSectionWidthMm` / `crossSectionHeightMm` / `thicknessMm` (additive, no behavior change yet) |
| 8 | Step 4 of refactor: materials carry their own lock fields and a complete `defaultSize`; runtime no longer calls `getProfileById(material.profileId)` |
| 9 | Step 5 of refactor: `profileId` dropped from `PartNode` and `MaterialNode`. Inspector dropdown switches from profiles → materials of same `objectType`. The hardcoded catalog is now seed-only. |

## Refactor progress (profiles-out-of-code)

- **Step 1** ✅ Schema v7: parts carry self-contained lock fields.
- **Step 2** ✅ Lock enforcement reads from the part. `applyProfileToSize` removed; replaced by `applyLockToSize(part, size)` in `src/lib/profiles.ts`. `normalizePartSize` in the store applies the lock after clamping, so drag-resize, inspector edits, and programmatic `setPartGeometry` calls all respect the part-owned lock. `setPartProfile` writes the new profile's lock fields onto the part instead of merely re-running `applyProfileToSize`.
- **Step 3** ✅ Cut-list groups by `materialId`. The material's `name` becomes the label; parts without a material (or pointing at a deleted one) fall back to a dimensions-derived label (e.g. `Timber 100 × 100 mm`, `Sheet 18 mm`). `getProfileById` is no longer used in `materialSummary.ts`. Items carry `partIds` so consumers don't recompute keys.
- **Step 4** ✅ Materials carry their own lock fields and a complete `defaultSize`. v7→v8 migration populates both from each material's `profileId`. `addObjectFromMaterial`, `buildPreviewPart`, and `MaterialInspector` no longer call `getProfileById(material.profileId)`. The "Profile" readonly row in the material inspector (which duplicated the material's underlying type info) is gone.
- **Step 5** ✅ `profileId` dropped from `PartNode` and `MaterialNode` (schema v9). `setPartProfile` renamed to `setPartMaterial`: the part inspector's dropdown now lists materials of the same `objectType` instead of catalog profiles. Selecting a different material rewrites the part's `materialId`, lock fields, and color, then normalizes the size against the new locks. The hardcoded catalog in `src/lib/profiles.ts` is now seed-only — read by `createInitialMaterials()` and `createObjectPart()`'s default-size lookup, never via stored part/material data. `getProfileById` no longer imported by `editorStore.ts` or `InspectorPanel.tsx`.
- **Step 6** ⏭ "Change Cross-Section" warning when the user picks a new material whose dimensions would cause the part to overlap with neighbors. First consumer of the planned overlap-detection service.
