import { useState } from "react";
import { BeamIcon, SearchIcon, SettingsIcon, SheetIcon } from "./Icons";
import { getObjectTypeLabel } from "../lib/profiles";
import { fromDisplayUnits, toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { useEditorStore } from "../store/editorStore";
import type { UnitPreference } from "../types/model";

interface ProjectSidebarProps {
  onOpenProject: (projectId: string) => void | Promise<void>;
}

function formatObjectSize(valueMm: number, unitPreference: UnitPreference): string {
  return `${Number(toDisplayUnits(valueMm, unitPreference).toFixed(1))} ${UNIT_DEFINITIONS[unitPreference].shortLabel}`;
}

export function ProjectSidebar({ onOpenProject }: ProjectSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const project = useEditorStore((state) => state.project);
  const selectedPartId = useEditorStore((state) => state.selectedPartId);
  const selectPart = useEditorStore((state) => state.selectPart);
  const renameProject = useEditorStore((state) => state.renameProject);
  const addObject = useEditorStore((state) => state.addObject);
  const updateUnitPreference = useEditorStore((state) => state.updateUnitPreference);
  const updateSnapSettings = useEditorStore((state) => state.updateSnapSettings);
  const recentProjects = useEditorStore((state) => state.recentProjects);
  const unitPreference = project.unitPreference;
  const filteredParts = project.parts.filter((part) => part.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

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
              <button
                key={part.id}
                className={`object-row ${selectedPartId === part.id ? "object-row--selected" : ""}`}
                onClick={() => selectPart(part.id)}
                type="button"
              >
                <span className="object-row__icon">
                  {part.objectType === "sheet" ? <SheetIcon width={15} height={15} /> : <BeamIcon width={15} height={15} />}
                </span>
                <span className="object-row__content">
                  <strong>{part.name}</strong>
                  <small>
                    {getObjectTypeLabel(part.objectType)} · {formatObjectSize(part.size.x, unitPreference)}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p className="panel-card__empty">No objects match the current filter.</p>
          )}
        </div>

        <div className="browser-card__footer">
          <label className="field browser-card__footer-field">
            <span>Project name</span>
            <input
              className="field__input"
              type="text"
              value={project.name}
              onChange={(event) => renameProject(event.target.value)}
            />
          </label>
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

      <section className="panel-card panel-card--compact">
        <div className="panel-card__header">
          <span className="panel-card__title">Recent Projects</span>
          <span className="panel-card__meta">Local</span>
        </div>

        <div className="recent-list">
          {recentProjects.length ? (
            recentProjects.map((recentProject) => (
              <button
                key={recentProject.id}
                className="recent-list__item"
                onClick={() => void onOpenProject(recentProject.id)}
                type="button"
              >
                <span>{recentProject.name}</span>
                <small>{recentProject.partCount} objects</small>
              </button>
            ))
          ) : (
            <p className="panel-card__empty">Saved projects will appear here.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
