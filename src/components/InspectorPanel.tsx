import { THICKNESS_PRESETS, MATERIAL_LABELS } from "../lib/materials";
import { fromDisplayUnits, toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { getSelectedPart, updateVector, useEditorStore } from "../store/editorStore";
import type { MaterialKind, ThicknessPreset, UnitPreference, Vector3Like } from "../types/model";

function numericOrNull(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function FieldRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="field__input"
        type="number"
        step="0.1"
        value={Number(value.toFixed(2))}
        onChange={(event) => {
          const nextValue = numericOrNull(event.target.value);
          if (nextValue !== null) {
            onChange(nextValue);
          }
        }}
      />
    </label>
  );
}

function VectorFields({
  label,
  vector,
  unitPreference,
  convertFromMm = true,
  onChange,
}: {
  label: string;
  vector: Vector3Like;
  unitPreference: UnitPreference;
  convertFromMm?: boolean;
  onChange: (vector: Vector3Like) => void;
}) {
  const suffix = convertFromMm ? UNIT_DEFINITIONS[unitPreference].shortLabel : "deg";

  return (
    <div className="field-group">
      <span className="field-group__label">
        {label} <small>{suffix}</small>
      </span>
      <div className="field-group__grid">
        {(["x", "y", "z"] as const).map((axis) => (
          <FieldRow
            key={axis}
            label={axis.toUpperCase()}
            value={convertFromMm ? toDisplayUnits(vector[axis], unitPreference) : vector[axis]}
            onChange={(nextValue) =>
              onChange(
                updateVector(
                  vector,
                  axis,
                  convertFromMm ? fromDisplayUnits(nextValue, unitPreference) : nextValue,
                ),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

export function InspectorPanel() {
  const state = useEditorStore((store) => store);
  const selectedPart = getSelectedPart(state);
  const unitPreference = state.project.unitPreference;
  const updateUnitPreference = state.updateUnitPreference;
  const updateSnapSettings = state.updateSnapSettings;
  const setPartGeometry = state.setPartGeometry;
  const setPartMaterial = state.setPartMaterial;
  const setPartThicknessPreset = state.setPartThicknessPreset;

  return (
    <aside className="inspector">
      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">Units</span>
          <span className="panel-card__meta">Locale aware</span>
        </div>

        <label className="field">
          <span>Display units</span>
          <select
            className="field__input"
            value={unitPreference}
            onChange={(event) => updateUnitPreference(event.target.value as UnitPreference)}
          >
            {Object.values(UNIT_DEFINITIONS).map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">Snap</span>
          <span className="panel-card__meta">{state.project.snapSettings.enabled ? "On" : "Off"}</span>
        </div>

        <label className="field field--checkbox">
          <input
            type="checkbox"
            checked={state.project.snapSettings.enabled}
            onChange={(event) => updateSnapSettings({ enabled: event.target.checked })}
          />
          <span>Enable snap</span>
        </label>

        <FieldRow
          label="Move"
          value={toDisplayUnits(state.project.snapSettings.moveIncrement, unitPreference)}
          onChange={(value) => updateSnapSettings({ moveIncrement: fromDisplayUnits(value, unitPreference) })}
        />
        <FieldRow
          label="Resize"
          value={toDisplayUnits(state.project.snapSettings.resizeIncrement, unitPreference)}
          onChange={(value) => updateSnapSettings({ resizeIncrement: fromDisplayUnits(value, unitPreference) })}
        />
        <FieldRow
          label="Rotate"
          value={state.project.snapSettings.rotateIncrementDeg}
          onChange={(value) => updateSnapSettings({ rotateIncrementDeg: value })}
        />
      </section>

      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">Selection</span>
          <span className="panel-card__meta">{selectedPart ? selectedPart.material : "None"}</span>
        </div>

        {selectedPart ? (
          <>
            <label className="field">
              <span>Name</span>
              <input
                className="field__input"
                type="text"
                value={selectedPart.name}
                onChange={(event) =>
                  state.updatePart(selectedPart.id, (part) => ({
                    ...part,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <VectorFields
              label="Size"
              vector={selectedPart.size}
              unitPreference={unitPreference}
              onChange={(vector) => setPartGeometry(selectedPart.id, { size: vector })}
            />

            <VectorFields
              label="Position"
              vector={selectedPart.position}
              unitPreference={unitPreference}
              onChange={(vector) => setPartGeometry(selectedPart.id, { position: vector })}
            />

            <VectorFields
              label="Rotation"
              vector={{
                x: (selectedPart.rotation.x * 180) / Math.PI,
                y: (selectedPart.rotation.y * 180) / Math.PI,
                z: (selectedPart.rotation.z * 180) / Math.PI,
              }}
              unitPreference={unitPreference}
              convertFromMm={false}
              onChange={(vector) =>
                setPartGeometry(selectedPart.id, {
                  rotation: {
                    x: (vector.x * Math.PI) / 180,
                    y: (vector.y * Math.PI) / 180,
                    z: (vector.z * Math.PI) / 180,
                  },
                })
              }
            />

            <label className="field">
              <span>Material</span>
              <select
                className="field__input"
                value={selectedPart.material}
                onChange={(event) => setPartMaterial(selectedPart.id, event.target.value as MaterialKind)}
              >
                {Object.entries(MATERIAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Thickness preset</span>
              <select
                className="field__input"
                value={selectedPart.thicknessPreset}
                onChange={(event) => setPartThicknessPreset(selectedPart.id, event.target.value as ThicknessPreset)}
              >
                {THICKNESS_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <p className="panel-card__empty">Select a part to inspect its dimensions and material.</p>
        )}
      </section>
    </aside>
  );
}
