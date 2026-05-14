# Generic Part Concepts

## Implementation Status (2026-05-13)

This document was originally a design exploration. Since then, a concrete refactor toward the **Concept 1** direction is underway. The conceptual sections below are still useful reference; this section captures the actual state of the code and what's left.

### Direction chosen

**Concept 1 first**, with one important addition learned along the way: library entries are **creation-time templates, not live references**. Editing a library material does NOT mutate already-placed parts — woodworking depends on exact cross-sections, and silently shifting joints when stock metadata changes would break the design. So scene parts copy what they need from the library at creation time and stay self-contained afterwards.

The four built-in **types** (`sheet`, `timber`, `cladding`, `glass`) are still object-type discriminators in the code. They have not yet become "families" in the Concept 2 sense, but the surface area where they matter is shrinking each step.

### Mapping of doc vocabulary → code (today)

| Document term | Code today |
|---|---|
| Project Part Definitions | `project.materials` (`MaterialNode[]`) and `project.materialGroups` |
| Scene Object Instance | `PartNode` |
| Reference from instance to definition | `part.materialId: string \| null` |
| Hardcoded global catalog | `SHEET_PROFILES`, `TIMBER_PROFILES`, `CLADDING_PROFILES`, `GLASS_PROFILES`, `SHAPE_PROFILES` in `src/lib/profiles.ts` |
| Family | Still implicit (the `objectType` discriminator) |

### What's implemented

The refactor is happening in small, schema-bump-per-step increments. Schema is currently at **v11**. Each step shipped behind a migration so old saved projects continue to work.

| Step | Schema | Status | What changed |
|---|---|---|---|
| 1 | v7 | ✅ | `PartNode` carries optional self-contained lock fields: `crossSectionWidthMm`, `crossSectionHeightMm`, `thicknessMm`. `extractLockFields(profile)` seeds them at creation, demo loading, and via v6→v7 migration. Purely additive — no behavior change. |
| 2 | — | ✅ | `applyProfileToSize` deleted, replaced by `applyLockToSize(part, size)` reading from the part's own fields. `normalizePartSize` in the store enforces locks at the data layer for every size mutation (drag-resize, inspector edits, programmatic calls). |
| 3 | — | ✅ | `materialSummary` (cut-list) groups by `materialId` (label = `material.name`). Parts without a material fall back to a dimensions-derived label (e.g. `Timber 100 × 100 mm`, `Sheet 18 mm`). The cut-list no longer imports `getProfileById`. |
| 4 | v8 | ✅ | `MaterialNode` gains its own `crossSectionWidthMm` / `crossSectionHeightMm` / `thicknessMm` and a required complete `defaultSize: Vector3Like`. `addObjectFromMaterial`, `buildPreviewPart`, and the Material inspector all read from the material directly — no more `getProfileById(material.profileId)` calls at runtime. |
| 5 | v9 | ✅ | `profileId` dropped from `PartNode` and `MaterialNode`. `setPartProfile` renamed to `setPartMaterial`: the part inspector's dropdown now lists materials of the same `objectType` instead of catalog profiles. Selecting a different material rewrites `materialId`, lock fields, color, then normalizes size. The hardcoded catalog (`SHEET_PROFILES`, `TIMBER_PROFILES`, …) is now seed-only — read by `createInitialMaterials()` and `createObjectPart()`'s default-size lookup, never via stored data. |
| 6 | — | ✅ | `src/lib/collision.ts` provides oriented-box overlap checks. The part Material dropdown previews the new material via `applyMaterialToPart()` and warns when the candidate overlaps neighboring parts, while still allowing an explicit override. |
| 7 | v10 | ✅ | `MaterialNode` and `PartNode` carry generic `lockedAxes`. The material inspector edits all default dimensions and lets users choose which axes are fixed for future placed parts. |
| 8 | v11 | ✅ | The Parts List creates a linear cutting plan from material stock length (`defaultSize.x`), part lengths, and project kerf. |

After Step 6, the hardcoded catalog is no longer load-bearing at runtime. Stored parts and materials are fully self-contained.

### What's still open

| Step | Status | What |
|---|---|---|
| User-editable library | ✅/⏭ | The browser stores a global editable material library shared across projects. Adding from it copies a material into the project for reproducibility. Still missing: first-class "new material" form, group selection/move controls, and future import from a shared GitHub-hosted library. |
| Concept-2 evaluation | ⏭ | The discriminator `objectType` is the last vestige of "types as code". Evaluate whether to formalize as explicit families (`panel`, `beam`, `flat-shape`) or keep type-driven branches in the inspector/renderer. |
| Global Library | ✅/⏭ | A browser-local global library exists. GitHub-hosted import/sync with linked/modified/local-only status is still future work. |

### Behavioral consequences already shipped

- **Renaming a material** updates the cut-list label everywhere. It does NOT change the cross-section of placed parts.
- **Adding a new part from a library material** copies the material's `defaultSize` and lock fields onto the part. The part is then independent.
- **Resize tool / drag handles** for a timber show only the X axis. Sheet/glass shows X and Y. Cube shows all three (no lock).
- **Inspector** hides locked axes entirely instead of showing them as readonly. The redundant readonly "Thickness" and "Cross-section" rows are gone.

### Open behavioral questions deferred until after Step 5

- "Custom timber size" (e.g., a one-off 120×80 part) — currently requires either picking a profile from the catalog or accepting whatever the part has. After Step 5 / Step 6 this becomes a normal "add a new material to the library, then place from it" workflow.
- Multiple parts sharing a single material when their dimensions diverge — currently the cut-list groups them under the material's name (correct: they share stock identity). The dimensions-based grouping is only the fallback for material-less parts.

---

## Goal

Today the model still carries some object-specific semantics:

- `sheet` means "panel-like part with editable length/width and fixed thickness from profile"
- `timber` means "beam-like part with editable length and fixed cross-section from profile"

The question is how to move toward a more generic modeling concept without losing the useful woodworking behavior.

This note compares three concepts and explains whether it makes sense to use concept 1 as a step toward concept 2.

## Current Situation

The current application already behaves partly like a generic-part system:

- parts share a common transform model
- parts share common selection, grouping, export, persistence, and material summary behavior
- differences mostly live in the profile rules and inspector behavior

A major weakness of the current implementation is that many standard profiles are still hardcoded in code.

Example:

- `Timber 100 x 100 mm`
- `Timber 60 x 80 mm`
- `OSB 18 mm`

That means adding a new standard like `Timber 120 x 80 mm` currently requires a code change.

This should be treated as a real architectural problem, not just a temporary inconvenience.
If profiles remain hardcoded, neither concept 1 nor concept 2 is fully achieved.

That means the main architectural question is not "generic or not", but rather:

How much explicit type structure should remain once `sheet` and `timber` become more generic?

There is also a second question:

Where should the standard parts live?

The answer should be:

- not in TypeScript code
- but in a part library model that the user can inspect and edit

## Part Library Requirement

Independently of concept 1 or concept 2, the application should introduce a `Part Library` model.

This library should hold:

- standard timber profiles
- standard sheet profiles
- cladding profiles
- glass profiles
- later other reusable standard parts

Examples:

- `Timber 100 x 100 mm`
- `Timber 120 x 80 mm`
- `OSB 18 mm`
- `Plexiglass 5 mm`

### Why This Matters

Without a part library model:

- new profile sizes require developer work
- users cannot adapt the app to local market standards
- the software stays tied to one hardcoded catalog
- concept 1 becomes less convincing because the "generic" profile system is still closed

### Required Property

The part library should itself be treated as model data.

That means:

- profiles are stored as data, not as hardcoded arrays in code
- profiles can be loaded, saved, edited, imported, and exported
- the user can extend the library without touching the implementation

### Practical Consequence

Once this exists, adding `Timber 120 x 80 mm` should mean:

1. Open the part library.
2. Add a new timber profile.
3. Save it.
4. Use it immediately in the editor.

No code change should be required.

## Global Library vs Project Library

The part library should likely exist at two levels:

1. `Global Library`
2. `Project Library`

This makes sense and fits the design suggestions very well.

### Global Library

The global library contains reusable public definitions.

It could be:

- one library model bundled with the application
- or several library models
- and those models could be stored in GitHub and shared publicly

Examples:

- a standard timber library
- a standard sheet-goods library
- a glazing library
- a cladding library

This level acts as the source catalog.

### Project Library

When a user starts a project, the user selects which library parts should be available in that project.

Those selected definitions are then copied into the project and become part of the project data.

That means the project becomes self-contained.
It does not depend at runtime on whatever the global library may become later.

### Why This Two-Level Model Is Useful

- projects remain reproducible
- public libraries can evolve without silently changing old projects
- users can start from shared standards
- users can still customize locally when needed
- export/import becomes safer because the project already contains its own part definitions

## Suggested Data Separation

Inside a project, there should be a clear distinction between:

1. `Project Part Definitions`
2. `Scene Object Instances`

### Project Part Definitions

These are the local selected parts copied from the global library or created locally by the user.

They are usually not shown as geometry in the 3D scene.
They act as the local library for the current project.

Examples:

- `Timber 100 x 100 mm`
- `OSB 18 mm`
- `Plexiglass 5 mm`

### Scene Object Instances

These are the actual placed objects in the model.

They should reference a project-local part definition ID, not a global library ID.

That is the correct design choice because:

- the project stays self-contained
- local customization becomes possible
- broken dependencies to external libraries are avoided

## Link Back to the Global Library

Project part definitions may optionally keep metadata about where they came from in the global library.

For example:

- `sourceLibraryId`
- `sourcePartId`
- `sourceVersion`
- `linkStatus`

### Suggested Link Status

- `linked`
- `modified`
- `local-only`

Meaning:

- `linked`: still identical to the imported global definition
- `modified`: originally came from a global library, but the local project version was changed
- `local-only`: created directly inside the project and has no global source

### Important Behavior

If the user changes the local project part definition, the link to the original global definition should no longer be treated as authoritative.

So the design should assume:

- local edit breaks strict equivalence
- the definition remains in the project
- the source reference may still be kept for traceability
- but the status changes from `linked` to `modified`

That matches your suggestion exactly and is a good design.

## Consequence for the UI

This implies three user-visible layers:

1. global/public libraries
2. project-local part definitions
3. scene objects

The usual workflow would be:

1. Open or choose a library.
2. Select standard parts for the project.
3. Copy them into the project library.
4. Model scene objects using those project-local definitions.
5. Optionally customize project-local definitions.

Usually only scene objects appear in the 3D scene.
Project-local part definitions are edited in a separate library-oriented UI.

## Concept 1: Generic Part With Profiles

### Core Idea

Replace object-specific semantics with one general `Part` model and let profiles describe the constraints.

Example:

- a part always has `size`, `position`, `rotation`, `color`
- a part may have `partDefinitionId`
- the selected profile defines which dimensions are fixed, suggested, or editable
- the selected definition comes from a part library, not from hardcoded code lists

Examples of part definitions:

- `OSB 18 mm`
- `Plywood 21 mm`
- `Timber 100 x 100 mm`
- `Timber 60 x 80 mm`
- `Plexiglass 5 mm`
- `No profile`

### How It Would Work

A single part editor exists, but the chosen definition changes the rules:

- sheet definition: thickness locked, length/width editable
- timber definition: cross-section locked, length editable
- unprofiled part: all dimensions editable

This means "sheet" and "timber" are no longer top-level object categories in the data model. They become profile behavior.

In a proper concept 1 implementation, the profile system must be open-ended.
Otherwise the app still has hidden hardcoded categories.

### Strengths

- minimal conceptual jump from the current app
- simpler user story: "everything is a part"
- smaller refactor because the current system already relies heavily on profiles
- easy to add more definitions without adding more object families
- once backed by a library model, users can add new standard sizes without code changes

### Weaknesses

- part behavior becomes implicit and profile-driven
- inspector logic can become harder to reason about if many profiles introduce different editing rules
- profile metadata may slowly become a hidden type system
- if the profile list stays hardcoded, the system remains developer-controlled rather than model-driven

### Main Risk

If many different profile behaviors appear over time, concept 1 can turn into concept 2 accidentally, but without the structure being explicit.

That typically shows up as many profile flags like:

- `locksThickness`
- `locksCrossSection`
- `isFlat`
- `supportsPattern`
- `supportsTransparency`
- `editableAxes`

At that point the code is still called "generic", but behavior is really organized by hidden families.

## Concept 2: Generic Part + Explicit Families

### Core Idea

Keep one generic part model, but introduce a small number of explicit part families.

Example:

- `panel`
- `beam`
- `flat-shape`
- later maybe `round-stock`, `angle`, `tube`, `membrane`

Each part still uses profiles, but the family defines the high-level behavior while the profile fills in dimensions and defaults.

In concept 2, those profiles should also come from the same editable part library model.

More precisely:

- scene object references `projectPartDefinitionId`
- project part definition references optional global library source
- family defines behavior
- part definition provides dimensions, defaults, naming, and source link

### How It Would Work

A part might look like this conceptually:

- `family: "beam"`
- `profileId: "timber-100x100"`
- `size.x = length`

Or:

- `family: "panel"`
- `profileId: "osb3-18"`
- `size.x = length`
- `size.y = width`
- `size.z = thickness`

Profiles stay important, but they no longer carry the whole semantic burden.

### Strengths

- behavior is explicit and easier to reason about
- cleaner long-term scaling when more woodworking objects arrive
- easier to build specialized inspectors and future tools by family
- avoids profile metadata becoming an ad-hoc type system
- still allows user-extensible standards because profiles are data, not code

### Weaknesses

- slightly larger redesign than concept 1
- user-facing language must distinguish between family and profile
- adds one more modeling layer
- requires clear ownership between family definitions and library profile definitions

### Main Benefit

Concept 2 gives you a stable architectural vocabulary:

- family defines behavior
- profile defines standard dimensions/material defaults
- instance stores the actual object in the scene

That separation tends to age better.

## Concept 3: Fully Free Part + Presets

### Core Idea

Everything is just a free cuboid or free shape.
Presets only provide starting values.

Example:

- user adds a generic part
- chooses preset `Timber 100 x 100`
- app fills dimensions
- user may freely override anything afterward

### Strengths

- maximum flexibility
- simplest conceptual model in theory

### Weaknesses

- weak validation
- weak material semantics
- harder to produce reliable summaries, cut lists, or domain-specific tooling
- users can easily create invalid "timber" and "sheet" objects

For this application, concept 3 is likely too loose.

## Concept 1 vs Concept 2

This is the practical difference:

- concept 1 says: profiles define behavior
- concept 2 says: families define behavior, profiles define standard sizes

So the difference is not about whether parts are generic.
Both are generic.
The real difference is where the semantic rules live.

The part library question is separate:

- in both concept 1 and concept 2, library entries should be editable model data
- the difference is only whether behavior lives mostly in profile metadata or mostly in family definitions
- in both concept 1 and concept 2, scene objects should reference project-local definitions, not global library entries

### In Concept 1

Rules live mostly in profile metadata.

Example:

- profile says thickness is fixed
- profile says cross-section is fixed
- profile says object behaves like a panel

### In Concept 2

Rules live mostly in the family.

Example:

- family `panel` means two planar dimensions plus fixed/derived thickness behavior
- family `beam` means one main length plus profile cross-section
- profile just says `18 mm OSB` or `100 x 100 timber`

That is why concept 2 is usually cleaner once the object library grows.

## Can Concept 1 Be a Step Toward Concept 2?

Yes, that can make sense.

In fact, it is probably the lowest-risk path if the goal is to keep momentum while reducing churn.

### Why It Makes Sense

Concept 1 lets you unify the current implementation first:

- one generic part type
- shared profile system
- first version of a real part library
- shared inspector shell
- shared persistence/export model

That already removes much of the special-casing.
Once that is stable, you can look at the actual profile behaviors that emerged and formalize them into families.

### Good Transition Path

Phase 1:

- introduce one generic `Part`
- move hardcoded profile definitions into a library model
- introduce project-local part definitions
- make scene objects reference project-local definition IDs
- keep current sheet/timber behavior as profile-driven constraints
- standardize inspector configuration around dimension rules

Phase 2:

- identify repeated profile behavior patterns
- extract them into explicit families like `panel` and `beam`
- move behavior rules from profiles into family definitions
- keep optional source links from project-local definitions back to global libraries

Phase 3:

- keep profiles mainly for dimensions, defaults, and material naming
- keep the part library user-editable
- optionally add sync/update workflows from global library to project library

### The Important Condition

Concept 1 only works as a transition step if you keep the profile rule model disciplined.

That means:

- avoid many one-off boolean flags
- keep behavior metadata structured
- document which rules are temporary and likely to become family rules later

If concept 1 is implemented carelessly, it becomes a messy long-term state rather than a good intermediate step.

## Recommended Direction

For this project, the best path is likely:

1. Move to concept 1 first.
2. Keep the profile behavior model small and explicit.
3. Reassess once more object categories exist.
4. Introduce concept 2 only when repeated families are clearly visible.

This is pragmatic because:

- it minimizes immediate refactoring
- it matches the current architecture
- it leaves the door open for a stronger long-term model
- it solves the hardcoded-profile problem early instead of carrying it forward

## Practical Heuristic

Stay with concept 1 while the system can still be explained as:

"A part plus a profile with a few constraint rules."

Move toward concept 2 when the explanation becomes:

"Some profiles really behave like beams, some like panels, some like flat shapes, and the app keeps branching on those behaviors everywhere."

That is the signal that the hidden families should become explicit families.

## Short Recommendation

If the goal is near-term progress, use concept 1 now.

If the object library grows beyond sheets, beams, cladding, glass, and simple flat shapes, concept 2 will likely become the better long-term architecture.

In both cases, the profile catalog should become a user-editable part library as early as possible.

## Suggested Next Version

No, this should not be changed all at once.

The next version should focus on the minimum structural step that unlocks the future design.

### Recommended Scope for the Next Version

1. Introduce `Project Part Definitions` into the project model.
2. Make scene objects reference `projectPartDefinitionId`.
3. Convert the current hardcoded sheet/timber/cladding/glass presets into initial library data.
4. Keep behavior otherwise mostly unchanged.

This would already solve the most important architectural problem:

- hardcoded standards move out of code
- projects become self-contained
- later changes toward concept 2 remain possible

### What Should Wait

These items can come later:

- public/global GitHub-backed library management
- sync/update workflows from global to local definitions
- explicit family refactor
- advanced library editor UI

### Short Recommendation

The next version should not try to solve:

- generic part model
- family model
- global library sync
- full library UI

all in one release.

Instead, it should first introduce the project-local definition layer.

That is the cleanest next step because it supports both concept 1 and concept 2.
