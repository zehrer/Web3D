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

function getMaterialUsageCategoryLabel(
  item: ReturnType<typeof getMaterialUsageSummary>[number],
  materials: MaterialNode[],
  materialGroups: MaterialGroupNode[],
): string {
  const material = item.materialId ? materials.find((candidate) => candidate.id === item.materialId) : null;
  return material ? getMaterialGroupName(material, materialGroups) : item.objectTypeLabel;
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

function formatCutLength(valueMm: number): string {
  return `${Math.round(valueMm)} mm`;
}

function PartsListPrintReport({
  projectName,
  items,
  parts,
  materials,
  materialGroups,
  unitPreference,
}: {
  projectName: string;
  items: ReturnType<typeof getMaterialUsageSummary>;
  parts: PartNode[];
  materials: MaterialNode[];
  materialGroups: MaterialGroupNode[];
  unitPreference: UnitPreference;
}) {
  const printedAt = new Date().toLocaleString();
  const linearItems = items.filter((item) => item.cutPlan);
  const nonLinearItems = items.filter((item) => !item.cutPlan);

  return (
    <div className="print-report" aria-hidden="true">
      <header className="print-report__header">
        <div>
          <h1>Cutting Plan</h1>
          <p>{projectName}</p>
        </div>
        <div className="print-report__meta">
          <span>{printedAt}</span>
          <span>{parts.length} parts</span>
        </div>
      </header>

      {linearItems.map((item) => {
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
                {getMaterialUsageCategoryLabel(item, materials, materialGroups)} · {item.count} {item.count === 1 ? "piece" : "pieces"}
                {item.cutPlan ? ` · ${item.cutPlan.stockCount} stock · ${formatCutLength(item.cutPlan.totalWasteMm)} waste` : ""}
              </p>
            </div>

            {item.cutPlan ? (
              <div className="print-report__material-metrics">
                <span>Raw stock {formatCutLength(item.cutPlan.rawStockLengthMm)}</span>
                <span>Kerf {formatCutLength(item.cutPlan.kerfMm)}</span>
                <span>Total cuts {formatCutLength(item.totalLengthMm)}</span>
                <span>Leftover {formatCutLength(item.cutPlan.totalWasteMm)}</span>
              </div>
            ) : null}

            {item.cutPlan ? (
              <div className="print-report__stock-grid">
                {item.cutPlan.stock.map((stock) => (
                  <div className="print-report__stock-card" key={stock.index}>
                    <div className="print-report__stock-title">
                      <strong>Stock {stock.index}</strong>
                      <span>{formatCutLength(stock.leftoverLengthMm)} left</span>
                    </div>
                    <ol className="print-report__cut-list">
                      {stock.cuts.map((cut) => (
                        <li key={cut.partId}>
                          <span>{cut.partName}</span>
                          <strong>{formatCutLength(cut.lengthMm)}</strong>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : null}

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
                      <td>{formatCutLength(part.size.x)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>
        );
      })}

      {nonLinearItems.length > 0 ? (
        <section className="print-report__material">
          <div className="print-report__material-header">
            <h2>Area And Shape Parts</h2>
            <p>Detailed part dimensions. Sheet nesting is not calculated in this version.</p>
          </div>
          {nonLinearItems.map((item) => {
            const itemPartIds = new Set(item.partIds);
            const itemParts = parts.filter((part) => itemPartIds.has(part.id));

            return (
              <table className="print-report__cuts" key={item.key}>
                <thead>
                  <tr>
                    <th>{item.label}</th>
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
            );
          })}
        </section>
      ) : null}

      <section className="print-report__overview">
        <h2>Overview</h2>
        <table className="print-report__summary">
          <thead>
            <tr>
              <th>Material</th>
              <th>Group</th>
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
                <td>{getMaterialUsageCategoryLabel(item, materials, materialGroups)}</td>
                <td>{item.count}</td>
                <td>{item.kind === "linear" ? formatMeters(item.totalLengthMm) : formatSquareMeters(item.totalAreaMm2)}</td>
                <td>{item.cutPlan ? item.cutPlan.stockCount : "-"}</td>
                <td>{item.cutPlan ? formatCutLength(item.cutPlan.totalWasteMm) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPartsListReportHtml({
  projectName,
  items,
  parts,
  materials,
  materialGroups,
  unitPreference,
}: {
  projectName: string;
  items: ReturnType<typeof getMaterialUsageSummary>;
  parts: PartNode[];
  materials: MaterialNode[];
  materialGroups: MaterialGroupNode[];
  unitPreference: UnitPreference;
}): string {
  const printedAt = new Date().toLocaleString();
  const linearItems = items.filter((item) => item.cutPlan);
  const nonLinearItems = items.filter((item) => !item.cutPlan);

  const renderStockCard = (stock: NonNullable<(typeof linearItems)[number]["cutPlan"]>["stock"][number]) => `
    <article class="stock-card">
      <header>
        <strong>Stock ${stock.index}</strong>
        <span>${formatCutLength(stock.leftoverLengthMm)} left</span>
      </header>
      <ol>
        ${stock.cuts
          .map(
            (cut) => `
              <li>
                <span>${escapeHtml(cut.partName)}</span>
                <strong>${formatCutLength(cut.lengthMm)}</strong>
              </li>
            `,
          )
          .join("")}
      </ol>
    </article>
  `;

  const renderLinearMaterial = (item: (typeof linearItems)[number]) => {
    const cutPlan = item.cutPlan;
    if (!cutPlan) return "";
    const oversizeParts = cutPlan.oversizePartIds
      .map((partId) => parts.find((part) => part.id === partId))
      .filter((part): part is PartNode => Boolean(part));

    return `
      <section class="material-section">
        <header class="material-header">
          <div>
            <h2>${escapeHtml(item.label)}</h2>
            <p>${escapeHtml(getMaterialUsageCategoryLabel(item, materials, materialGroups))} · ${item.count} ${item.count === 1 ? "piece" : "pieces"} · ${cutPlan.stockCount} stock</p>
          </div>
          <strong>${formatCutLength(cutPlan.totalWasteMm)} waste</strong>
        </header>
        <div class="metrics">
          <span>Raw stock <strong>${formatCutLength(cutPlan.rawStockLengthMm)}</strong></span>
          <span>Kerf <strong>${formatCutLength(cutPlan.kerfMm)}</strong></span>
          <span>Total cuts <strong>${formatCutLength(item.totalLengthMm)}</strong></span>
          <span>Leftover <strong>${formatCutLength(cutPlan.totalWasteMm)}</strong></span>
        </div>
        <div class="stock-grid">
          ${cutPlan.stock.map(renderStockCard).join("")}
        </div>
        ${
          oversizeParts.length > 0
            ? `
              <table class="warning-table">
                <thead><tr><th>Oversize part</th><th>ID</th><th>Length</th></tr></thead>
                <tbody>
                  ${oversizeParts
                    .map(
                      (part) => `
                        <tr>
                          <td>${escapeHtml(part.name)}</td>
                          <td>${escapeHtml(part.id)}</td>
                          <td>${formatCutLength(part.size.x)}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
            : ""
        }
      </section>
    `;
  };

  const areaSections = nonLinearItems
    .map((item) => {
      const itemPartIds = new Set(item.partIds);
      const itemParts = parts.filter((part) => itemPartIds.has(part.id));
      return `
        <table class="parts-table">
          <thead><tr><th>${escapeHtml(item.label)}</th><th>ID</th><th>Dimensions</th></tr></thead>
          <tbody>
            ${itemParts
              .map(
                (part) => `
                  <tr>
                    <td>${escapeHtml(part.name)}</td>
                    <td>${escapeHtml(part.id)}</td>
                    <td>${escapeHtml(formatPartDimensions(part, unitPreference))}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      `;
    })
    .join("");

  const overviewRows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.label)}</td>
          <td>${escapeHtml(getMaterialUsageCategoryLabel(item, materials, materialGroups))}</td>
          <td>${item.count}</td>
          <td>${item.kind === "linear" ? formatMeters(item.totalLengthMm) : formatSquareMeters(item.totalAreaMm2)}</td>
          <td>${item.cutPlan ? item.cutPlan.stockCount : "-"}</td>
          <td>${item.cutPlan ? formatCutLength(item.cutPlan.totalWasteMm) : "-"}</td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(projectName)} - Cutting Plan</title>
    <style>
      @page { size: A4 portrait; margin: 7mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111820;
        background: #fff;
        font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
        font-size: 8.4pt;
        line-height: 1.18;
      }
      .report { width: 100%; }
      .report-header {
        display: flex;
        justify-content: space-between;
        gap: 8mm;
        align-items: flex-start;
        border-bottom: 1px solid #1f2933;
        padding-bottom: 2.5mm;
        margin-bottom: 3mm;
      }
      h1 { margin: 0; font-size: 17pt; line-height: 1.05; }
      h2 { margin: 0; font-size: 11pt; line-height: 1.1; }
      p { margin: 0.8mm 0 0; color: #4a5560; }
      .meta { display: flex; flex-direction: column; gap: 1mm; text-align: right; white-space: nowrap; color: #4a5560; }
      .material-section { break-inside: avoid; page-break-inside: avoid; margin-top: 3.5mm; }
      .material-header {
        display: flex;
        justify-content: space-between;
        gap: 6mm;
        align-items: baseline;
        border-bottom: 1px solid #7b858f;
        padding-bottom: 1mm;
        margin-bottom: 1.5mm;
      }
      .material-header > strong { white-space: nowrap; }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1.4mm;
        margin-bottom: 2mm;
      }
      .metrics span {
        border: 1px solid #d1d6db;
        background: #f5f7f8;
        padding: 1mm 1.3mm;
        white-space: nowrap;
      }
      .stock-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 2mm;
      }
      .stock-card {
        break-inside: avoid;
        page-break-inside: avoid;
        border: 1px solid #bfc6cc;
      }
      .stock-card header {
        display: flex;
        justify-content: space-between;
        gap: 1.5mm;
        background: #eef1f3;
        border-bottom: 1px solid #bfc6cc;
        padding: 1mm 1.2mm;
      }
      .stock-card header span { white-space: nowrap; }
      .stock-card ol {
        list-style: none;
        margin: 0;
        padding: 0.8mm 1.2mm 1mm;
      }
      .stock-card li {
        display: flex;
        justify-content: space-between;
        gap: 1.4mm;
        border-bottom: 1px solid #eceff1;
        padding: 0.55mm 0;
      }
      .stock-card li:last-child { border-bottom: 0; }
      .stock-card li span { overflow-wrap: anywhere; }
      .stock-card li strong { white-space: nowrap; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 0 0 3mm;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #c8cdd2;
        padding: 1mm 1.3mm;
        text-align: left;
        vertical-align: top;
      }
      th { background: #eef1f3; font-weight: 700; }
      td:nth-child(3), td:nth-child(5), td:nth-child(6),
      th:nth-child(3), th:nth-child(5), th:nth-child(6) {
        text-align: right;
        white-space: nowrap;
      }
      .area-section, .overview { margin-top: 5mm; }
      .warning-table th { background: #f7e5e2; }
      @media screen {
        body { background: #d8dce0; padding: 12px; }
        .report { background: #fff; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 7mm; box-shadow: 0 8px 28px rgba(0,0,0,0.18); }
      }
    </style>
  </head>
  <body>
    <main class="report">
      <header class="report-header">
        <div>
          <h1>Cutting Plan</h1>
          <p>${escapeHtml(projectName)}</p>
        </div>
        <div class="meta">
          <span>${escapeHtml(printedAt)}</span>
          <span>${parts.length} parts</span>
        </div>
      </header>
      ${linearItems.map(renderLinearMaterial).join("")}
      ${
        nonLinearItems.length > 0
          ? `
            <section class="area-section">
              <div class="material-header">
                <div>
                  <h2>Area And Shape Parts</h2>
                  <p>Detailed part dimensions. Sheet nesting is not calculated in this version.</p>
                </div>
              </div>
              ${areaSections}
            </section>
          `
          : ""
      }
      <section class="overview">
        <h2>Overview</h2>
        <table>
          <thead><tr><th>Material</th><th>Group</th><th>Pieces</th><th>Total</th><th>Stock</th><th>Waste</th></tr></thead>
          <tbody>${overviewRows}</tbody>
        </table>
      </section>
    </main>
    <script>
      window.addEventListener("load", () => {
        window.focus();
        setTimeout(() => window.print(), 100);
      });
    </script>
  </body>
</html>`;
}

function openPartsListPrintWindow({
  projectName,
  items,
  parts,
  materials,
  materialGroups,
  unitPreference,
}: {
  projectName: string;
  items: ReturnType<typeof getMaterialUsageSummary>;
  parts: PartNode[];
  materials: MaterialNode[];
  materialGroups: MaterialGroupNode[];
  unitPreference: UnitPreference;
}) {
  const reportWindow = window.open("", "web3d-parts-list-report", "width=1200,height=900");
  if (!reportWindow) {
    window.alert("The print report window was blocked by the browser. Allow popups for this site and try again.");
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(
    buildPartsListReportHtml({ projectName, items, parts, materials, materialGroups, unitPreference }),
  );
  reportWindow.document.close();
}

function PartsList() {
  const projectName = useEditorStore((store) => store.project.name);
  const parts = useEditorStore((store) => store.project.parts);
  const materials = useEditorStore((store) => store.globalMaterialLibrary.materials);
  const materialGroups = useEditorStore((store) => store.globalMaterialLibrary.materialGroups);
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
        <button
          className="material-summary__print"
          onClick={() =>
            openPartsListPrintWindow({
              projectName,
              items: materialSummary,
              parts,
              materials,
              materialGroups,
              unitPreference,
            })
          }
          title="Print Parts List"
          type="button"
        >
          <PrintIcon width={15} height={15} />
          <span>Print</span>
        </button>
      </div>
      {materialSummary.map((item) => {
        const isExpanded = expandedKey === item.key;
        const itemPartIds = new Set(item.partIds);
        const itemParts = parts.filter((part) => itemPartIds.has(part.id));
        const categoryLabel = getMaterialUsageCategoryLabel(item, materials, materialGroups);
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
                  {categoryLabel} · {item.count} {item.count === 1 ? "piece" : "pieces"}
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
        materialGroups={materialGroups}
        materials={materials}
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
