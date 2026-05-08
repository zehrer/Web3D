# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Web3D Designer is a browser-only 3D editor for box-based woodworking design. It has no backend. All storage is browser-local via IndexedDB.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start local dev server (base path /)
npm run build      # TypeScript check + Vite build (base path /Web3D/)
npm test           # run tests once
npm run test:watch # run tests in watch mode
```

Run a single test file:
```bash
npm test -- src/test/geometry.test.ts
```

There is no lint script configured.

## Architecture

### Data Model (`src/types/model.ts`)

`ProjectDocument` is the root type. It contains:
- `parts: PartNode[]` — the 3D objects in the scene
- `groups: GroupNode[]` — optional folder groupings
- `measurements: MeasurementNode[]` — ruler annotations
- `snapSettings`, `cameraState`, `unitPreference`

`PartNode` fields: `objectType`, `profileId`, `size` (Vector3), `position` (Vector3), `rotation` (Vector3 in radians), `color`. The origin of every part is its **lower corner**, so a part at `position (0,0,0)` sits on the floor with no offset.

All sizes and positions are stored in **millimeters** regardless of the user's unit preference. `src/lib/units.ts` handles all display-unit conversion.

Object types: `sheet`, `timber`, `cladding`, `glass`, `rectangle`, `circle`. The `rectangle` and `circle` types are flat shapes (their `size.y` is always `0`). For flat shapes, the resizable axes are `x` and `z` only.

### State Management (`src/store/editorStore.ts`)

A single Zustand vanilla store wraps the entire editor state. Components subscribe via `useEditorStore(selector)`. The store instance is also accessible directly as `editorStore` for imperative access outside React (e.g., in event handlers in `App.tsx`).

**Undo/redo discipline**: The store distinguishes two change modes:
- **Committed changes** (e.g., `setPartGeometry`, `updatePart`): go through `withProjectHistory()`, which deep-clones the current project onto a 50-entry undo stack and clears the redo stack.
- **Transient/preview changes** (e.g., `previewPartGeometry`): update `state.project` directly without touching the history stacks. Used during active drag operations.
- **Finalizing a transient change** (`finalizeTransientChange(snapshotBeforeDrag)`): pushes the pre-drag snapshot onto the undo stack. Drag handlers in `Viewport.tsx` always capture a project snapshot at `onMouseDown` and call this on `onMouseUp`.

### Component Layout

```
App.tsx              — project hydration, autosave (350 ms debounce), project open/delete/import/export
├── Toolbar.tsx      — top bar: project name, save status, file menu (new/open/import/export/delete)
├── ProjectSidebar.tsx — left panel: part/group/measurement tree
├── Viewport.tsx     — 3D canvas + overlaid UI rails
│   └── Scene (inline) — Three.js scene: meshes, TransformControls, resize handles, measurement guides
└── InspectorPanel.tsx — right panel: selected part or measurement properties
```

### Library Modules (`src/lib/`)

| File | Purpose |
|---|---|
| `project.ts` | Factory functions (`createProject`, `createObjectPart`, `cloneProject`). `createProject()` always seeds from `gardenShedDemo.json` with fresh IDs. |
| `profiles.ts` | Hardcoded profile catalogs (`SHEET_PROFILES`, `TIMBER_PROFILES`, etc.) and helpers (`getProfileById`, `applyProfileToSize`, `getResizableAxes`). |
| `persistence.ts` | IndexedDB CRUD (`saveProjectDocument`, `loadProjectDocument`, `listProjectSummaries`). Also tracks the last-opened project ID in `localStorage`. |
| `serialization.ts` | `serializeProject` / `deserializeProject` with version migrations (v1→current, v2→current, v3→current). Current schema version is `4` (`PROJECT_SCHEMA_VERSION` in `project.ts`). |
| `geometry.ts` | Resize-handle math: converts a screen-pixel delta into a world-space size and position change, accounting for part rotation. |
| `snap.ts` | `snapValue(value, increment, enabled)` — rounds to nearest increment. |
| `units.ts` | `toDisplayUnits`, `fromDisplayUnits`, `formatLength`, `clampLength`. |
| `export.ts` | STL export via `STLExporter`, glTF export via `GLTFExporter` (scaled to meters; embeds the raw `ProjectDocument` in `extras.web3dProjectDocument` for round-trip import). `.web3d` format is a JSON envelope wrapping the project. |
| `materialSummary.ts` | Aggregates parts by profile for cut-list / material summaries. |
| `locale.ts` | Picks the default unit preference from `navigator.language`. |

### Serialization and File Formats

- **IndexedDB**: stores the JSON string from `serializeProject(project)` (plain `JSON.stringify`).
- **`.web3d` file**: a JSON envelope `{ format, formatVersion, application, exportedAt, project }`. The import path (`deserializeProjectFile`) also handles importing bare project JSON and glTF files that contain an embedded project.
- **Schema migrations**: `serialization.ts` inspects `parsed.version` and runs the appropriate migration function. When bumping `PROJECT_SCHEMA_VERSION` in `project.ts`, always add a migration function in `serialization.ts`.

### Viewport and 3D Interaction

`Viewport.tsx` contains two parts:
1. The outer `Viewport` React component — handles the UI rail (add menu, tool selector, undo/redo, camera presets, context bar).
2. The inner `Scene` component (rendered inside `<Canvas>`) — renders all `PartNode` meshes, `TransformControls`, resize drag handles, measurement guides, and the ground plane click handler.

Resize dragging is handled entirely with raw `pointermove`/`pointerup` listeners on `window` (not Three.js events), because dragging must continue even if the pointer leaves the canvas. Orbit controls are disabled during any active drag.

The `TransformControls` from `@react-three/drei` is used for move and rotate. The custom resize handle system (spheres at face centers) is used for the resize tool.

### Profiles (Hardcoded Today)

All woodworking profiles (`SHEET_PROFILES`, `TIMBER_PROFILES`, `CLADDING_PROFILES`, `GLASS_PROFILES`, `SHAPE_PROFILES`) are currently hardcoded arrays in `src/lib/profiles.ts`. The design document at `docs/generic-part-concepts.md` describes the planned migration to a user-editable project-local part library. When adding a new standard profile size today, add it to the appropriate array in `profiles.ts` and update `src/types/model.ts` to include the new ID in the corresponding union type.

## Testing

Tests live in `src/test/`. The setup file (`src/test/setup.ts`) uses `fake-indexeddb` to mock IndexedDB and provides a `localStorage` mock. Both are reset between each test via `beforeEach`/`afterEach`.

Tests cover the lib modules (`geometry`, `units`, `snap`, `profiles`, `serialization`, `persistence`, `export`, `materialSummary`, `locale`) and the editor store. The Viewport and UI components are not tested.

## Deployment

Pushes to `main` trigger a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes to the `gh-pages` branch. The Vite base path is `/Web3D/` in production builds and `/` in development. Do not hardcode absolute paths that would break this.
