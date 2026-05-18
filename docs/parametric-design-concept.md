# Parametric Design Concept

## Goal

Add parametric design without replacing the current direct-modeling workflow.

The editor should still work when every part has plain numeric size, position, and rotation values. Parametric behavior should be an optional layer: users can define variables, bind selected fields to expressions, and let the app update the resolved numeric model.

This matters for woodworking workflows such as:

- shed width / depth / height changes
- repeated spacing between studs or cladding boards
- material stock length updates
- derived dimensions such as `wall_width - 2 * post_width`
- consistent offsets such as overhangs, gaps, and clearances

## Core Principle

Keep the existing `ProjectDocument.parts` geometry numeric.

The 3D viewport, export, material summary, collision checks, and cutting plan should continue to read normal resolved numbers:

- `part.size.x`
- `part.position.y`
- `part.rotation.z`
- `material.defaultSize.x`

Parametric data should sit beside the model and explain where some of those numbers came from.

This avoids a risky rewrite and keeps old projects, exports, and current tools working.

## Proposed Model

Add a parametric section to `ProjectDocument`.

```ts
interface ProjectDocument {
  // existing fields...
  parameters: ParameterDefinition[];
  parameterBindings: ParameterBinding[];
}
```

### Parameters

Parameters are named project variables.

```ts
type ParameterKind = "length" | "angle" | "number" | "boolean";

interface ParameterDefinition {
  id: string;
  name: string;
  kind: ParameterKind;
  value: number | boolean;
  expression?: string;
  description?: string;
}
```

Examples:

- `shed_width = 3000 mm`
- `shed_depth = 2400 mm`
- `post = 100 mm`
- `wall_height = 2200 mm`
- `roof_overhang = 250 mm`
- `stud_spacing = 625 mm`
- `kerf = 3 mm`

The `value` field stores the resolved value. If `expression` exists, the value is calculated from the expression.

### Bindings

Bindings connect an expression to one model field.

```ts
type BindingTargetType = "part" | "material" | "grid" | "cutSettings";

interface ParameterBinding {
  id: string;
  targetType: BindingTargetType;
  targetId: string | null;
  path: string;
  expression: string;
  resolvedValue: number | boolean;
}
```

Examples:

```ts
{
  targetType: "part",
  targetId: "left-wall-rail",
  path: "size.x",
  expression: "shed_width"
}
```

```ts
{
  targetType: "part",
  targetId: "right-post",
  path: "position.x",
  expression: "shed_width - post"
}
```

```ts
{
  targetType: "cutSettings",
  targetId: null,
  path: "kerfMm",
  expression: "kerf"
}
```

The binding resolver writes the computed value back to the normal model field. That means the rest of the app does not need to know whether a value was typed directly or calculated.

## Expression Rules

Use a small safe expression language, not JavaScript `eval`.

First version should support:

- numbers
- parameter names
- `+`, `-`, `*`, `/`
- parentheses
- simple functions: `min`, `max`, `round`, `floor`, `ceil`

Later versions can add:

- `if(condition, a, b)`
- object references such as `part("Left Post").size.x`
- arrays / repeated placements

All length values are stored and evaluated in millimeters. The UI can still display cm, mm, or inches through the existing unit conversion layer.

## Evaluation Flow

1. User edits a parameter or an expression-bound field.
2. Build a dependency graph from parameters and bindings.
3. Detect cycles before writing anything.
4. Evaluate parameters first.
5. Evaluate bindings.
6. Apply resolved values to a cloned project.
7. Normalize the result using existing rules:
   - clamp dimensions
   - apply material axis locks
   - preserve locked axes
   - update history as one committed change
8. Report invalid bindings and keep the last valid geometry if evaluation fails.

Important: dragging a bound field should probably break or update the binding only after an explicit UX decision. Silent overwrites would be confusing.

## Interaction With Materials

The current material design should remain:

- library materials are templates
- used project materials are locked for editing
- parts are self-contained once placed

Parametric design should not make used materials live-update behind the user's back.

Recommended first behavior:

- allow parameters on placed part size/position/rotation
- allow parameters on project settings such as grid size and kerf
- keep used project materials locked
- do not bind global library material fields in the first version

Later, material definitions can become parametric templates:

- `defaultSize.x = stock_length`
- `defaultSize.y = timber_width`
- `defaultSize.z = timber_height`

But changing such a material should still require creating a new project material or explicitly applying the changed material to selected parts.

## Interaction With Locked Axes

Material `lockedAxes` are hard constraints.

If a part has `lockedAxes.y = true`, a binding to `size.y` should be rejected or shown as disabled. This matches the current material behavior: timber length can change, but cross-section dimensions stay fixed unless the user changes material.

For a typical timber:

- `size.x` can be bound to a variable or expression
- `size.y` is fixed by material
- `size.z` is fixed by material

For a sheet:

- `size.x` and `size.y` can be bound
- `size.z` is fixed by material thickness

For a cube or generic part:

- all dimensions can be bound unless explicitly locked

## User Interface Concept

### Variables Panel

Add a `Variables` view near the Parts List / Material Library area.

Columns:

- name
- value
- unit/kind
- expression
- used by count

Actions:

- add variable
- duplicate variable
- delete unused variable
- rename variable
- show dependents

### Inspector Field Binding

Numeric fields get a small `fx` button.

States:

- plain number: user edits the value directly
- bound value: field shows resolved value plus expression
- invalid binding: field is highlighted and shows the error
- locked field: no binding control, because the material owns that dimension

The inspector should always show the resolved value. The expression editor can open inline or in a compact popover.

### Dependency Feedback

When a variable is selected, affected parts should be highlighted in the scene and in the project tree.

This is important because parametric models become hard to understand if users cannot see what a variable controls.

## Implementation Phases

### Phase 1: Project Variables

Add project-level variables only.

Scope:

- schema migration adds empty `parameters` and `parameterBindings`
- variable CRUD in store
- safe expression parser/evaluator
- tests for arithmetic, units, invalid expressions, and cycle detection
- no UI binding yet except a simple variable table

This phase proves the data model and evaluator.

### Phase 2: Bind Part Fields

Allow bindings on selected numeric part fields:

- `size.x/y/z` when not locked
- `position.x/y/z`
- `rotation.x/y/z`

Scope:

- inspector `fx` controls
- evaluator writes resolved values to part fields
- undo/redo treats parameter edits as one project change
- dragging a bound field shows a clear decision: update expression, break binding, or cancel

### Phase 3: Project Setting Bindings

Bind project settings:

- `gridSettings.size`
- `gridSettings.originX`
- `gridSettings.originZ`
- `cutSettings.kerfMm`

This lets the cutting plan and workspace respond to the same variables as the model.

### Phase 4: Patterns And Repetition

Add parametric generated parts.

Example:

- create studs along a wall from `wall_width`, `stud_spacing`, and `post_width`
- create cladding boards from `wall_height`, `board_width`, and `gap`

This is a larger feature because it changes object topology, not just numbers. It should come after field bindings are stable.

### Phase 5: Parametric Templates

Allow saved templates such as:

- wall frame
- roof frame
- shelf unit
- table

Templates would contain parameters, parts, and bindings. Inserting a template creates normal project parts plus local parameters.

## Risks And Decisions

### Naming

Parameter names need validation:

- must be unique
- should use simple identifiers like `shed_width`
- display labels can be friendlier later

### Units

Expressions should use project display units only at the UI edge. Internally, all length math remains millimeters.

Open question: should users be able to write `2.4m`, `240cm`, or `96in` inside expressions? This is useful, but it makes parsing and display more complex. It should be a later addition.

### Cycles

Cycles must be blocked:

- `a = b + 10`
- `b = a + 10`

The UI should show the cycle instead of partially applying values.

### Bound Field Editing

When a user drags or types into a bound field, the app needs a clear rule.

Recommended first rule:

- direct numeric edit on a bound field asks whether to remove the binding
- parameter changes remain the normal way to update bound geometry

### Generated Geometry

Changing the number of parts is much harder than changing numeric fields.

Example:

- wall width changes from 2000 to 3000
- stud count changes from 4 to 6

This should not be part of the first implementation. Start with stable objects whose dimensions and positions can change.

## Recommended First Milestone

Implement a minimal but solid parametric core:

1. Add `parameters` and `parameterBindings` to `ProjectDocument`.
2. Add migrations for old projects.
3. Add a safe expression evaluator with dependency tracking.
4. Add store actions for variable CRUD and expression evaluation.
5. Add tests for evaluation, cycles, invalid expressions, undo/redo, and serialization.
6. Add a simple Variables panel.
7. Add `fx` bindings for part `size.x`, `position.x`, and project `cutSettings.kerfMm`.

This gives real value quickly:

- one variable can drive common dimensions
- Parts List and cutting plan can react to a shared stock/kerf value
- the existing direct-modeling system remains intact
- later pattern generation has a clean foundation
