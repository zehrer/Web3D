import { getObjectTypeLabel, getProfileById, getProfilesForType } from "../lib/profiles";
import { formatLength, fromDisplayUnits, toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { getSelectedMeasurement, getSelectedPart, updateVector, useEditorStore } from "../store/editorStore";
import type { ObjectProfileId, UnitPreference, Vector3Like } from "../types/model";

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
    <label className="field inspector-field">
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
  columns = 1,
  onChange,
}: {
  label: string;
  vector: Vector3Like;
  unitPreference: UnitPreference;
  convertFromMm?: boolean;
  columns?: 1 | 2 | 3;
  onChange: (vector: Vector3Like) => void;
}) {
  const suffix = convertFromMm ? UNIT_DEFINITIONS[unitPreference].shortLabel : "deg";

  return (
    <div className="field-group">
      <span className="field-group__label inspector-section-label">
        {label} <small>{suffix}</small>
      </span>
      <div className={`field-group__grid field-group__grid--${columns} inspector-vector-grid`}>
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

function getProfileFieldLabel(objectType: "sheet" | "timber" | "cladding") {
  if (objectType === "sheet") {
    return "Sheet profile";
  }

  if (objectType === "timber") {
    return "Timber profile";
  }

  return "Cladding profile";
}

export function InspectorPanel() {
  const state = useEditorStore((store) => store);
  const selectedPart = getSelectedPart(state);
  const selectedMeasurement = getSelectedMeasurement(state);
  const unitPreference = state.project.unitPreference;
  const setPartGeometry = state.setPartGeometry;
  const setPartProfile = state.setPartProfile;
  const updateMeasurement = state.updateMeasurement;
  const measurementLength = selectedMeasurement
    ? Math.hypot(
        selectedMeasurement.end.x - selectedMeasurement.start.x,
        selectedMeasurement.end.y - selectedMeasurement.start.y,
        selectedMeasurement.end.z - selectedMeasurement.start.z,
      )
    : 0;

  return (
    <aside className="inspector">
      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">Object</span>
          <span className="panel-card__meta">
            {selectedPart ? getObjectTypeLabel(selectedPart.objectType) : selectedMeasurement ? "Measure" : "None"}
          </span>
        </div>

        {selectedPart ? (
          <>
            <label className="field inspector-field">
              <span>{getProfileFieldLabel(selectedPart.objectType)}</span>
              <select
                className="field__input"
                value={selectedPart.profileId}
                onChange={(event) => setPartProfile(selectedPart.id, event.target.value as ObjectProfileId)}
              >
                {getProfilesForType(selectedPart.objectType).map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedPart.objectType === "sheet" ? (
              <VectorFields
                label="Size"
                vector={selectedPart.size}
                unitPreference={unitPreference}
                columns={1}
                onChange={(vector) => setPartGeometry(selectedPart.id, { size: vector })}
              />
            ) : (
              <>
                <FieldRow
                  label={`Length (${UNIT_DEFINITIONS[unitPreference].shortLabel})`}
                  value={toDisplayUnits(selectedPart.size.x, unitPreference)}
                  onChange={(value) =>
                    setPartGeometry(selectedPart.id, {
                      size: {
                        ...selectedPart.size,
                        x: fromDisplayUnits(value, unitPreference),
                      },
                    })
                  }
                />
                <label className="field inspector-field">
                  <span>Cross-section</span>
                  <div className="field__input field__input--readonly">
                    {(() => {
                      const profile = getProfileById(selectedPart.profileId);
                      return `${profile.label}`;
                    })()}
                  </div>
                </label>
              </>
            )}

            <VectorFields
              label="Position"
              vector={selectedPart.position}
              unitPreference={unitPreference}
              columns={1}
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
              columns={1}
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

            {selectedPart.objectType === "sheet" ? (
              <label className="field inspector-field">
                <span>Thickness</span>
                <div className="field__input field__input--readonly">
                  {getProfileById(selectedPart.profileId).label}
                </div>
              </label>
            ) : null}
          </>
        ) : selectedMeasurement ? (
          <>
            <label className="field inspector-field">
              <span>Length</span>
              <div className="field__input field__input--readonly">{formatLength(measurementLength, unitPreference)}</div>
            </label>

            <VectorFields
              label="Start"
              vector={selectedMeasurement.start}
              unitPreference={unitPreference}
              columns={1}
              onChange={(vector) =>
                updateMeasurement(selectedMeasurement.id, (measurement) => ({
                  ...measurement,
                  start: vector,
                }))
              }
            />

            <VectorFields
              label="End"
              vector={selectedMeasurement.end}
              unitPreference={unitPreference}
              columns={1}
              onChange={(vector) =>
                updateMeasurement(selectedMeasurement.id, (measurement) => ({
                  ...measurement,
                  end: vector,
                }))
              }
            />
          </>
        ) : (
          <p className="panel-card__empty">Select an object to inspect its dimensions.</p>
        )}
      </section>
    </aside>
  );
}
