import { useEffect, useState } from "react";
import { BeamIcon, SearchIcon, SettingsIcon, SheetIcon } from "./Icons";
import { getObjectTypeLabel } from "../lib/profiles";
import { fromDisplayUnits, toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { useEditorStore } from "../store/editorStore";
import type { UnitPreference } from "../types/model";

function formatObjectSize(valueMm: number, unitPreference: UnitPreference): string {
  return `${Number(toDisplayUnits(valueMm, unitPreference).toFixed(1))} ${UNIT_DEFINITIONS[unitPreference].shortLabel}`;
}

export function ProjectSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [draftPartName, setDraftPartName] = useState("");
  const project = useEditorStore((state) => state.project);
  const selectedPartId = useEditorStore((state) => state.selectedPartId);
  const selectPart = useEditorStore((state) => state.selectPart);
  const addObject = useEditorStore((state) => state.addObject);
  const updatePart = useEditorStore((state) => state.updatePart);
  const updateUnitPreference = useEditorStore((state) => state.updateUnitPreference);
  const updateSnapSettings = useEditorStore((state) => state.updateSnapSettings);
  const unitPreference = project.unitPreference;
  const filteredParts = project.parts.filter((part) => part.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  useEffect(() => {
    if (editingPartId && !project.parts.some((part) => part.id === editingPartId)) {
      setEditingPartId(null);
      setDraftPartName("");
    }
  }, [editingPartId, project.parts]);

  function beginRenamePart(partId: string, currentName: string) {
    setEditingPartId(partId);
    setDraftPartName(currentName);
    selectPart(partId);
  }

  function commitRenamePart() {
    if (!editingPartId) {
      return;
    }

    const nextName = draftPartName.trim();
    if (nextName) {
      updatePart(editingPartId, (part) => ({
        ...part,
        name: nextName,
      }));
    }

    setEditingPartId(null);
    setDraftPartName("");
  }

  return (
    <aside className="sidebar">
      <section className="panel-card browser-card">
        <div className="browser-card__header">
          <div>
            <span className="panel-card__title">Objects</span>
            <p className="browser-card__subtitle">{project.parts.length} items in {project.name}</p>
          </div>
          <button
            className={`browser-card__icon-button ${showSettings ? "browser-card__icon-button--active" : ""}`}
            onClick={() => setShowSettings((value) => !value)}
            title="Project settings"
            type="button"
          >
            <SettingsIcon width={16} height={16} />
          </button>
        </div>

        <label className="search-field">
          <SearchIcon width={16} height={16} />
          <input
            className="search-field__input"
            placeholder="Filter objects"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        <div className="browser-card__actions">
          <button className="browser-card__action-button" onClick={() => addObject("sheet")} type="button">
            <SheetIcon width={15} height={15} />
            <span>Sheet</span>
          </button>
          <button className="browser-card__action-button" onClick={() => addObject("timber")} type="button">
            <BeamIcon width={15} height={15} />
            <span>Timber</span>
          </button>
        </div>

        <div className="object-browser">
          {filteredParts.length ? (
            filteredParts.map((part) => (
              <div
                key={part.id}
                className={`object-row ${selectedPartId === part.id ? "object-row--selected" : ""}`}
                onClick={() => selectPart(part.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectPart(part.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="object-row__icon">
                  {part.objectType === "sheet" ? <SheetIcon width={15} height={15} /> : <BeamIcon width={15} height={15} />}
                </span>
                <span className="object-row__content">
                  {editingPartId === part.id ? (
                    <input
                      autoFocus
                      className="object-row__name-input"
                      type="text"
                      value={draftPartName}
                      onBlur={commitRenamePart}
                      onChange={(event) => setDraftPartName(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRenamePart();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          setEditingPartId(null);
                          setDraftPartName("");
                        }
                      }}
                    />
                  ) : (
                    <button
                      className="object-row__name-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        beginRenamePart(part.id, part.name);
                      }}
                      type="button"
                    >
                      <strong>{part.name}</strong>
                    </button>
                  )}
                  <small>
                    {getObjectTypeLabel(part.objectType)} · {formatObjectSize(part.size.x, unitPreference)}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <p className="panel-card__empty">No objects match the current filter.</p>
          )}
        </div>
      </section>

      {showSettings ? (
        <section className="panel-card panel-card--compact">
          <div className="panel-card__header">
            <span className="panel-card__title">Project Settings</span>
            <span className="panel-card__meta">Units & snap</span>
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

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={project.snapSettings.enabled}
              onChange={(event) => updateSnapSettings({ enabled: event.target.checked })}
            />
            <span>Enable snap</span>
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Move</span>
              <input
                className="field__input"
                type="number"
                step="0.1"
                value={Number(toDisplayUnits(project.snapSettings.moveIncrement, unitPreference).toFixed(2))}
                onChange={(event) =>
                  updateSnapSettings({
                    moveIncrement: Math.max(0, fromDisplayUnits(Number(event.target.value || 0), unitPreference)),
                  })
                }
              />
            </label>

            <label className="field">
              <span>Resize</span>
              <input
                className="field__input"
                type="number"
                step="0.1"
                value={Number(toDisplayUnits(project.snapSettings.resizeIncrement, unitPreference).toFixed(2))}
                onChange={(event) =>
                  updateSnapSettings({
                    resizeIncrement: Math.max(0, fromDisplayUnits(Number(event.target.value || 0), unitPreference)),
                  })
                }
              />
            </label>

            <label className="field">
              <span>Rotate</span>
              <input
                className="field__input"
                type="number"
                step="1"
                value={project.snapSettings.rotateIncrementDeg}
                onChange={(event) =>
                  updateSnapSettings({ rotateIncrementDeg: Math.max(0, Number(event.target.value || 0)) })
                }
              />
            </label>
          </div>
        </section>
      ) : null}

    </aside>
  );
}
