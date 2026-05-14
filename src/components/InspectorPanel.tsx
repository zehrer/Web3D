import { useEffect, useMemo, useState } from "react";
import { getPartMaterialChangeOverlaps } from "../lib/collision";
import { getMaterialUsageSummary } from "../lib/materialSummary";
import { getObjectTypeLabel } from "../lib/profiles";
import { formatLength, formatMeters, formatSquareMeters, fromDisplayUnits, toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { getSelectedMeasurement, getSelectedPart, updateVector, useEditorStore } from "../store/editorStore";
import { PrintIcon } from "./Icons";
import type { MaterialGroupNode, MaterialNode, ObjectType, PartNode, UnitPreference, Vector3Like } from "../types/model";

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
  disabled = false,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <label className="field inspector-field">
      <span>{label}</span>
      <input
        className="field__input"
        disabled={disabled}
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

function getMaterialGroupName(material: MaterialNode, materialGroups: MaterialGroupNode[]): string {
  return material.groupId ? (materialGroups.find((group) => group.id === material.groupId)?.name ?? "Ungrouped") : "Ungrouped";
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

  if (part.objectType === "cube") {
    return `${formatLength(part.size.x, unitPreference)} × ${formatLength(part.size.y, unitPreference)} × ${formatLength(part.size.z, unitPreference)}`;
  }

  return formatLength(part.size.x, unitPreference);
}

function PartsListPrintReport({
  projectName,
  items,
  parts,
  unitPreference,
}: {
  projectName: string;
  items: ReturnType<typeof getMaterialUsageSummary>;
  parts: PartNode[];
  unitPreference: UnitPreference;
}) {
  const printedAt = new Date().toLocaleString();

  return (
    <div className="print-report" aria-hidden="true">
      <header className="print-report__header">
        <div>
          <h1>Parts List</h1>
          <p>{projectName}</p>
        </div>
        <div className="print-report__meta">
          <span>{printedAt}</span>
          <span>{parts.length} parts</span>
        </div>
      </header>

      <table className="print-report__summary">
        <thead>
          <tr>
            <th>Material</th>
            <th>Type</th>
            <th>Pieces</th>
            <th>Total</th>
            <th>Stock</th>
            <th>Waste</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <td>{item.label}</td>
              <td>{item.objectTypeLabel}</td>
              <td>{item.count}</td>
              <td>{item.kind === "linear" ? formatMeters(item.totalLengthMm) : formatSquareMeters(item.totalAreaMm2)}</td>
              <td>{item.cutPlan ? item.cutPlan.stockCount : "-"}</td>
              <td>{item.cutPlan ? formatLength(item.cutPlan.totalWasteMm, unitPreference) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.map((item) => {
        const itemPartIds = new Set(item.partIds);
        const itemParts = parts.filter((part) => itemPartIds.has(part.id));
        const oversizeParts = item.cutPlan
          ? item.cutPlan.oversizePartIds
              .map((partId) => parts.find((part) => part.id === partId))
              .filter((part): part is PartNode => Boolean(part))
          : [];

        return (
          <section className="print-report__material" key={item.key}>
            <div className="print-report__material-header">
              <h2>{item.label}</h2>
              <p>
                {item.objectTypeLabel} · {item.count} {item.count === 1 ? "piece" : "pieces"}
                {item.cutPlan
                  ? ` · ${item.cutPlan.stockCount} stock · ${formatLength(item.cutPlan.totalWasteMm, unitPreference)} waste`
                  : ""}
              </p>
            </div>

            {item.cutPlan ? (
              <>
                <p className="print-report__note">
                  Raw stock {formatLength(item.cutPlan.rawStockLengthMm, unitPreference)} · Kerf {formatLength(item.cutPlan.kerfMm, unitPreference)}
                </p>
                {item.cutPlan.stock.map((stock) => (
                  <table className="print-report__cuts" key={stock.index}>
                    <thead>
                      <tr>
                        <th colSpan={2}>Stock {stock.index}</th>
                        <th>{formatLength(stock.leftoverLengthMm, unitPreference)} left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.cuts.map((cut) => (
                        <tr key={cut.partId}>
                          <td>{cut.partName}</td>
                          <td>{cut.partId}</td>
                          <td>{formatLength(cut.lengthMm, unitPreference)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
                {oversizeParts.length > 0 ? (
                  <table className="print-report__cuts print-report__cuts--warning">
                    <thead>
                      <tr>
                        <th>Oversize part</th>
                        <th>ID</th>
                        <th>Length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oversizeParts.map((part) => (
                        <tr key={part.id}>
                          <td>{part.name}</td>
                          <td>{part.id}</td>
                          <td>{formatLength(part.size.x, unitPreference)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </>
            ) : (
              <table className="print-report__cuts">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>ID</th>
                    <th>Dimensions</th>
                  </tr>
                </thead>
                <tbody>
                  {itemParts.map((part) => (
                    <tr key={part.id}>
                      <td>{part.name}</td>
                      <td>{part.id}</td>
                      <td>{formatPartDimensions(part, unitPreference)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PartsList() {
  const projectName = useEditorStore((store) => store.project.name);
  const parts = useEditorStore((store) => store.project.parts);
  const materials = useEditorStore((store) => store.globalMaterialLibrary.materials);
  const kerfMm = useEditorStore((store) => store.project.cutSettings.kerfMm);
  const unitPreference = useEditorStore((store) => store.project.unitPreference);
  const selectPart = useEditorStore((store) => store.selectPart);
  const materialSummary = useMemo(() => getMaterialUsageSummary(parts, materials, kerfMm), [kerfMm, parts, materials]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (!materialSummary.length) {
    return <p className="panel-card__empty">No parts in this project yet.</p>;
  }

  return (
    <div className="material-summary">
      <div className="material-summary__toolbar">
        <p className="material-summary__intro">Parts grouped by project material.</p>
        <button className="material-summary__print" onClick={() => window.print()} title="Print Parts List" type="button">
          <PrintIcon width={15} height={15} />
          <span>Print</span>
        </button>
      </div>
      {materialSummary.map((item) => {
        const isExpanded = expandedKey === item.key;
        const itemPartIds = new Set(item.partIds);
        const itemParts = parts.filter((part) => itemPartIds.has(part.id));
        const oversizeParts = item.cutPlan
          ? item.cutPlan.oversizePartIds
              .map((partId) => parts.find((part) => part.id === partId))
              .filter((part): part is PartNode => Boolean(part))
          : [];

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
                  {item.cutPlan
                    ? `${item.cutPlan.stockCount} stock`
                    : item.kind === "linear"
                      ? formatMeters(item.totalLengthMm)
                      : formatSquareMeters(item.totalAreaMm2)}
                </strong>
                <small>
                  {item.cutPlan
                    ? `${formatLength(item.cutPlan.totalWasteMm, unitPreference)} waste`
                    : item.kind === "linear"
                      ? "total length"
                      : "total area"}
                </small>
              </div>
            </button>
            {isExpanded ? (
              <div className="material-summary__part-list">
                {item.cutPlan ? (
                  <div className="cut-plan">
                    <div className="cut-plan__meta">
                      Raw stock {formatLength(item.cutPlan.rawStockLengthMm, unitPreference)} · Kerf {formatLength(item.cutPlan.kerfMm, unitPreference)}
                    </div>
                    {item.cutPlan.stock.map((stock) => (
                      <div className="cut-plan__stock" key={stock.index}>
                        <div className="cut-plan__stock-header">
                          <strong>Stock {stock.index}</strong>
                          <span>{formatLength(stock.leftoverLengthMm, unitPreference)} left</span>
                        </div>
                        <div className="cut-plan__cuts">
                          {stock.cuts.map((cut) => (
                            <button
                              className="cut-plan__cut"
                              key={cut.partId}
                              onClick={() => selectPart(cut.partId)}
                              type="button"
                            >
                              <span>{cut.partName}</span>
                              <span>{formatLength(cut.lengthMm, unitPreference)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {oversizeParts.length > 0 ? (
                      <div className="cut-plan__oversize">
                        <strong>Oversize</strong>
                        {oversizeParts.map((part) => (
                          <button
                            className="cut-plan__cut cut-plan__cut--oversize"
                            key={part.id}
                            onClick={() => selectPart(part.id)}
                            type="button"
                          >
                            <span>{part.name}</span>
                            <span>{formatLength(part.size.x, unitPreference)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {!item.cutPlan
                  ? itemParts.map((part) => (
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
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        );
      })}
      <PartsListPrintReport
        items={materialSummary}
        parts={parts}
        projectName={projectName}
        unitPreference={unitPreference}
      />
    </div>
  );
}

function MaterialInspector() {
  const selectedMaterialId = useEditorStore((state) => state.selectedMaterialId);
  const globalMaterialLibrary = useEditorStore((state) => state.globalMaterialLibrary);
  const parts = useEditorStore((state) => state.project.parts);
  const unitPreference = useEditorStore((state) => state.project.unitPreference);
  const renameGlobalMaterial = useEditorStore((state) => state.renameGlobalMaterial);
  const updateGlobalMaterialDefaultSize = useEditorStore((state) => state.updateGlobalMaterialDefaultSize);
  const updateGlobalMaterialAxisLock = useEditorStore((state) => state.updateGlobalMaterialAxisLock);
  const updateGlobalMaterialColor = useEditorStore((state) => state.updateGlobalMaterialColor);
  const addObjectFromMaterial = useEditorStore((state) => state.addObjectFromMaterial);
  const deleteGlobalMaterial = useEditorStore((state) => state.deleteGlobalMaterial);
  const duplicateGlobalMaterial = useEditorStore((state) => state.duplicateGlobalMaterial);
  const selectMaterial = useEditorStore((state) => state.selectMaterial);

  const material = globalMaterialLibrary.materials.find((m) => m.id === selectedMaterialId);
  if (!material) return null;

  const isUsed = parts.some((p) => p.materialId === selectedMaterialId);
  const materialGroupName = getMaterialGroupName(material, globalMaterialLibrary.materialGroups);

  const dimensionAxes: Array<{ axis: keyof Vector3Like; label: string }> = [
    { axis: "x", label: "X" },
    { axis: "y", label: "Y" },
    { axis: "z", label: "Z" },
  ];

  const effectiveValue = (axis: keyof Vector3Like) => material.defaultSize[axis];

  return (
    <>
      <label className="field inspector-field">
        <span>Name</span>
        <input
          className="field__input"
          type="text"
          value={material.name}
          onBlur={(e) => renameGlobalMaterial(material.id, e.target.value)}
          onChange={(e) => renameGlobalMaterial(material.id, e.target.value)}
        />
      </label>

      <label className="field inspector-field">
        <span>Group</span>
        <div className="field__input field__input--readonly">{materialGroupName}</div>
      </label>

      <label className="field inspector-field">
        <span>Color</span>
        <input
          className="field__input field__input--color"
          type="color"
          value={material.color}
          onChange={(e) => updateGlobalMaterialColor(material.id, e.target.value)}
        />
      </label>

      {isUsed ? (
        <p className="inspector-note">
          This material is used in the scene. Name and color update the library; size and fixed-axis changes affect future parts unless you explicitly apply the material to existing parts.
        </p>
      ) : null}

      <div className="field-group">
        <span className="field-group__label inspector-section-label">
          Default size <small>{UNIT_DEFINITIONS[unitPreference].shortLabel}</small>
        </span>
        {dimensionAxes.map(({ axis, label }) => (
          <div className="material-axis-row" key={axis}>
            <FieldRow
              label={label}
              value={toDisplayUnits(effectiveValue(axis), unitPreference)}
              onChange={(value) => updateGlobalMaterialDefaultSize(material.id, axis, fromDisplayUnits(value, unitPreference))}
            />
            <label className="material-axis-row__lock">
              <input
                checked={Boolean(material.lockedAxes?.[axis])}
                onChange={(event) => updateGlobalMaterialAxisLock(material.id, axis, event.target.checked)}
                type="checkbox"
              />
              <span>Fixed</span>
            </label>
          </div>
        ))}
      </div>

      <button
        className="inspector-action-button"
        onClick={() => addObjectFromMaterial(material.id)}
        type="button"
      >
        Add to Scene
      </button>
      <button className="inspector-action-button" onClick={() => duplicateGlobalMaterial(material.id)} type="button">
        Duplicate
      </button>
      <button
        className="inspector-action-button inspector-action-button--danger"
        disabled={isUsed}
        title={isUsed ? "This material is used by parts in the scene" : "Remove from library"}
        onClick={() => {
          deleteGlobalMaterial(material.id);
          selectMaterial(null);
        }}
        type="button"
      >
        {isUsed ? "In Use" : "Delete"}
      </button>
    </>
  );
}

export function InspectorPanel() {
  const state = useEditorStore((store) => store);
  const selectedPart = getSelectedPart(state);
  const selectedMeasurement = getSelectedMeasurement(state);
  const unitPreference = state.project.unitPreference;
  const setPartGeometry = state.setPartGeometry;
  const setPartMaterial = state.setPartMaterial;
  const updatePart = state.updatePart;
  const projectMaterials = state.globalMaterialLibrary.materials;
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

  const selectedMaterialId = state.selectedMaterialId;
  const selectedMaterial = selectedMaterialId
    ? state.globalMaterialLibrary.materials.find((m) => m.id === selectedMaterialId) ?? null
    : null;
  const selectedMaterialGroupName = selectedMaterial
    ? getMaterialGroupName(selectedMaterial, state.globalMaterialLibrary.materialGroups)
    : null;
  const selectedPartMaterial = selectedPart?.materialId
    ? state.globalMaterialLibrary.materials.find((material) => material.id === selectedPart.materialId) ?? null
    : null;
  const selectedPartMaterialGroupName = selectedPartMaterial
    ? getMaterialGroupName(selectedPartMaterial, state.globalMaterialLibrary.materialGroups)
    : null;
  const changePartMaterial = (part: PartNode, materialId: string): boolean => {
    const overlapCheck = getPartMaterialChangeOverlaps(state.project, state.globalMaterialLibrary.materials, part.id, materialId);
    if (overlapCheck && overlapCheck.overlaps.length > 0) {
      const names = overlapCheck.overlaps.slice(0, 5).map((item) => item.name).join(", ");
      const moreCount = overlapCheck.overlaps.length - 5;
      const suffix = moreCount > 0 ? ` and ${moreCount} more` : "";
      const confirmed = window.confirm(
        `Changing to "${overlapCheck.material.name}" will overlap ${names}${suffix}.\n\nApply the material anyway?`,
      );
      if (!confirmed) {
        return false;
      }
    }

    setPartMaterial(part.id, materialId);
    return true;
  };

  return (
    <aside className="inspector">
      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">
            {selectedPart ? "Object" : selectedMeasurement ? "Measure" : selectedMaterial ? "Material" : "Parts List"}
          </span>
          <span className="panel-card__meta">
            {selectedPart
              ? selectedPartMaterialGroupName ?? getObjectTypeLabel(selectedPart.objectType)
              : selectedMeasurement
                ? "Measure"
                : selectedMaterial
                  ? selectedMaterialGroupName
                  : `${state.project.parts.length} objects`}
          </span>
        </div>

        {selectedPart ? (
          <>
            {!isFlatShapeObject(selectedPart.objectType) && selectedPart.objectType !== "cube" ? (
              <label className="field inspector-field">
                <span>Material</span>
                <select
                  className="field__input"
                  value={selectedPart.materialId ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next && !changePartMaterial(selectedPart, next)) {
                      event.currentTarget.value = selectedPart.materialId ?? "";
                    }
                  }}
                >
                  {selectedPart.materialId === null ? (
                    <option value="" disabled>(no material)</option>
                  ) : null}
                  {selectedPart.materialId && !selectedPartMaterial ? (
                    <option value={selectedPart.materialId} disabled>
                      Missing material
                    </option>
                  ) : null}
                  {projectMaterials
                    .filter((m) => m.objectType === selectedPart.objectType)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
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
                axes={["x", "y"]}
                onChange={(vector) => setPartGeometry(selectedPart.id, { size: vector })}
              />
            ) : selectedPart.objectType === "cube" ? (
              <VectorFields
                label="Size"
                vector={selectedPart.size}
                unitPreference={unitPreference}
                columns={1}
                onChange={(vector) => setPartGeometry(selectedPart.id, { size: vector })}
              />
            ) : (
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
            )}

            {isFlatShapeObject(selectedPart.objectType) || selectedPart.objectType === "cube" ? (
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
        ) : selectedMaterial ? (
          <MaterialInspector />
        ) : (
          <PartsList />
        )}
      </section>
    </aside>
  );
}
