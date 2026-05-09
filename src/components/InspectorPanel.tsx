import { useEffect, useMemo, useState } from "react";
import { getMaterialUsageSummary } from "../lib/materialSummary";
import { getObjectTypeLabel, getProfileById, getProfilesForType } from "../lib/profiles";
import { formatLength, formatMeters, formatSquareMeters, fromDisplayUnits, toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { getSelectedMeasurement, getSelectedPart, updateVector, useEditorStore } from "../store/editorStore";
import type { ObjectProfileId, ObjectType, PartNode, UnitPreference, Vector3Like } from "../types/model";

function numericOrNull(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function FieldRow({
  label,
  value,
  min,
  onChange,
  step = "0.1",
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <label className="field inspector-field">
      <span>{label}</span>
      <input
        className="field__input"
        min={min}
        type="number"
        step={step}
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
  axes = ["x", "y", "z"],
  onChange,
}: {
  label: string;
  vector: Vector3Like;
  unitPreference: UnitPreference;
  convertFromMm?: boolean;
  columns?: 1 | 2 | 3;
  axes?: ReadonlyArray<keyof Vector3Like>;
  onChange: (vector: Vector3Like) => void;
}) {
  const suffix = convertFromMm ? UNIT_DEFINITIONS[unitPreference].shortLabel : "deg";

  return (
    <div className="field-group">
      <span className="field-group__label inspector-section-label">
        {label} <small>{suffix}</small>
      </span>
      <div className={`field-group__grid field-group__grid--${columns} inspector-vector-grid`}>
        {axes.map((axis) => (
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

function isPanelObject(objectType: string) {
  return objectType === "sheet" || objectType === "glass";
}

function isFlatShapeObject(objectType: string) {
  return objectType === "rectangle" || objectType === "circle";
}

function getProfileFieldLabel(objectType: ObjectType) {
  if (objectType === "sheet") {
    return "Sheet profile";
  }

  if (objectType === "timber") {
    return "Timber profile";
  }

  if (objectType === "cladding") {
    return "Cladding profile";
  }

  if (objectType === "glass") {
    return "Glass profile";
  }

  return "Shape";
}

function formatPartDimensions(part: PartNode, unitPreference: UnitPreference): string {
  if (part.objectType === "circle") {
    return `⌀ ${formatLength(part.size.x, unitPreference)}`;
  }

  if (part.objectType === "rectangle") {
    return `${formatLength(part.size.x, unitPreference)} × ${formatLength(part.size.z, unitPreference)}`;
  }

  if (part.objectType === "sheet" || part.objectType === "glass") {
    return `${formatLength(part.size.x, unitPreference)} × ${formatLength(part.size.y, unitPreference)}`;
  }

  return formatLength(part.size.x, unitPreference);
}

function MaterialOverview() {
  const parts = useEditorStore((store) => store.project.parts);
  const unitPreference = useEditorStore((store) => store.project.unitPreference);
  const selectPart = useEditorStore((store) => store.selectPart);
  const materialSummary = useMemo(() => getMaterialUsageSummary(parts), [parts]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (!materialSummary.length) {
    return <p className="panel-card__empty">No material objects in this project yet.</p>;
  }

  return (
    <div className="material-summary">
      <p className="material-summary__intro">Used material by type and profile.</p>
      {materialSummary.map((item) => {
        const isExpanded = expandedKey === item.key;
        const itemParts = parts.filter((part) => `${part.objectType}:${part.profileId}` === item.key);

        return (
          <div className="material-summary__row" key={item.key}>
            <button
              className="material-summary__row-header"
              onClick={() => setExpandedKey(isExpanded ? null : item.key)}
              type="button"
            >
              <div className="material-summary__label">
                <strong>{item.label}</strong>
                <small>
                  {item.objectTypeLabel} · {item.count} {item.count === 1 ? "piece" : "pieces"}
                </small>
              </div>
              <div className="material-summary__total">
                <strong>
                  {item.kind === "linear"
                    ? formatMeters(item.totalLengthMm)
                    : formatSquareMeters(item.totalAreaMm2)}
                </strong>
                <small>{item.kind === "linear" ? "total length" : "total area"}</small>
              </div>
            </button>
            {isExpanded ? (
              <div className="material-summary__part-list">
                {itemParts.map((part) => (
                  <button
                    key={part.id}
                    className="material-summary__part-row"
                    onClick={() => selectPart(part.id)}
                    type="button"
                  >
                    <span>{part.name}</span>
                    <span className="material-summary__part-dim">
                      {formatPartDimensions(part, unitPreference)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function InspectorPanel() {
  const state = useEditorStore((store) => store);
  const selectedPart = getSelectedPart(state);
  const selectedMeasurement = getSelectedMeasurement(state);
  const unitPreference = state.project.unitPreference;
  const setPartGeometry = state.setPartGeometry;
  const setPartProfile = state.setPartProfile;
  const updatePart = state.updatePart;
  const createCladdingPattern = state.createCladdingPattern;
  const updateMeasurement = state.updateMeasurement;
  const [patternAxis, setPatternAxis] = useState<keyof Vector3Like>("y");
  const [patternCopies, setPatternCopies] = useState(5);
  const [patternGap, setPatternGap] = useState(12);
  const measurementLength = selectedMeasurement
    ? Math.hypot(
        selectedMeasurement.end.x - selectedMeasurement.start.x,
        selectedMeasurement.end.y - selectedMeasurement.start.y,
        selectedMeasurement.end.z - selectedMeasurement.start.z,
      )
    : 0;

  useEffect(() => {
    if (selectedPart?.objectType === "cladding") {
      setPatternAxis("y");
      setPatternCopies(5);
      setPatternGap(12);
    }
  }, [selectedPart?.id, selectedPart?.objectType]);

  return (
    <aside className="inspector">
      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">{selectedPart ? "Object" : selectedMeasurement ? "Measure" : "Material Overview"}</span>
          <span className="panel-card__meta">
            {selectedPart ? getObjectTypeLabel(selectedPart.objectType) : selectedMeasurement ? "Measure" : `${state.project.parts.length} objects`}
          </span>
        </div>

        {selectedPart ? (
          <>
            {!isFlatShapeObject(selectedPart.objectType) ? (
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
            ) : null}

            {selectedPart.objectType === "circle" ? (
              <FieldRow
                label={`Diameter (${UNIT_DEFINITIONS[unitPreference].shortLabel})`}
                value={toDisplayUnits(selectedPart.size.x, unitPreference)}
                onChange={(value) => {
                  const diameter = fromDisplayUnits(value, unitPreference);
                  setPartGeometry(selectedPart.id, {
                    size: {
                      x: diameter,
                      y: 0,
                      z: diameter,
                    },
                  });
                }}
              />
            ) : isFlatShapeObject(selectedPart.objectType) ? (
              <VectorFields
                label="Size"
                vector={selectedPart.size}
                unitPreference={unitPreference}
                columns={1}
                axes={["x", "z"]}
                onChange={(vector) => setPartGeometry(selectedPart.id, { size: { ...vector, y: 0 } })}
              />
            ) : isPanelObject(selectedPart.objectType) ? (
              <VectorFields
                label="Size"
                vector={selectedPart.size}
                unitPreference={unitPreference}
                columns={1}
                axes={selectedPart.objectType === "glass" ? ["x", "y"] : undefined}
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

            {isFlatShapeObject(selectedPart.objectType) ? (
              <label className="field inspector-field">
                <span>Color</span>
                <input
                  className="field__input"
                  type="color"
                  value={selectedPart.color}
                  onChange={(event) =>
                    updatePart(selectedPart.id, (part) => ({
                      ...part,
                      color: event.target.value,
                    }))
                  }
                />
              </label>
            ) : null}

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

            {isPanelObject(selectedPart.objectType) && selectedPart.objectType !== "glass" ? (
              <label className="field inspector-field">
                <span>Thickness</span>
                <div className="field__input field__input--readonly">
                  {getProfileById(selectedPart.profileId).label}
                </div>
              </label>
            ) : null}

            {selectedPart.objectType === "cladding" ? (
              <div className="field-group">
                <span className="field-group__label inspector-section-label">
                  Pattern <small>copies</small>
                </span>
                <label className="field inspector-field">
                  <span>Direction</span>
                  <select
                    className="field__input"
                    value={patternAxis}
                    onChange={(event) => setPatternAxis(event.target.value as keyof Vector3Like)}
                  >
                    <option value="y">Local Y · profile width</option>
                    <option value="z">Local Z · thickness</option>
                    <option value="x">Local X · length</option>
                  </select>
                </label>
                <FieldRow
                  label="Copies"
                  min={1}
                  step="1"
                  value={patternCopies}
                  onChange={(value) => setPatternCopies(Math.max(1, Math.min(200, Math.round(value))))}
                />
                <FieldRow
                  label={`Gap (${UNIT_DEFINITIONS[unitPreference].shortLabel})`}
                  value={toDisplayUnits(patternGap, unitPreference)}
                  onChange={(value) => setPatternGap(fromDisplayUnits(value, unitPreference))}
                />
                <p className="inspector-note">
                  Step: {formatLength(selectedPart.size[patternAxis] + Math.abs(patternGap), unitPreference)}
                  {patternGap < 0 ? " in negative direction" : ""}
                </p>
                <button
                  className="inspector-action-button"
                  onClick={() =>
                    createCladdingPattern(selectedPart.id, {
                      axis: patternAxis,
                      copies: patternCopies,
                      gap: patternGap,
                    })
                  }
                  type="button"
                >
                  Apply Pattern
                </button>
              </div>
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
          <MaterialOverview />
        )}
      </section>
    </aside>
  );
}
