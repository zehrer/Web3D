import { useEffect, useRef, useState, type ReactNode } from "react";
import { fromDisplayUnits, toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { useEditorStore } from "../store/editorStore";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PanelLeftIcon,
  PanelRightIcon,
} from "./Icons";
import type { ProjectSummary, UnitPreference } from "../types/model";

interface ToolbarProps {
  onSaveProject: () => void | Promise<void>;
  onImportProjectFile: (file: File) => void | Promise<void>;
  onExportWeb3d: () => void;
  onExportStl: () => void;
  onExportGltf: () => void | Promise<void>;
  onDeleteCurrentProject: () => void | Promise<void>;
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void | Promise<void>;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  saveStatusLabel: string;
}

function IconButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={`topbar__icon-button ${active ? "topbar__icon-button--active" : ""}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

type MenuKey = "file" | "edit" | "add" | "view" | "settings" | "help";

function MenuButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`menu-bar__button ${active ? "menu-bar__button--active" : ""}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

export function Toolbar({
  onNewProject,
  onSaveProject,
  onImportProjectFile,
  onExportWeb3d,
  onExportStl,
  onExportGltf,
  onDeleteCurrentProject,
  onOpenProject,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelVisible,
  rightPanelVisible,
  saveStatusLabel,
}: ToolbarProps) {
  const project = useEditorStore((state) => state.project);
  const projectName = project.name;
  const renameProject = useEditorStore((state) => state.renameProject);
  const recentProjects = useEditorStore((state) => state.recentProjects);
  const addObject = useEditorStore((state) => state.addObject);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const updateUnitPreference = useEditorStore((state) => state.updateUnitPreference);
  const updateSnapSettings = useEditorStore((state) => state.updateSnapSettings);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [draftProjectName, setDraftProjectName] = useState(projectName);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingProjectName) {
      setDraftProjectName(projectName);
    }
  }, [editingProjectName, projectName]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function toggleMenu(menu: MenuKey) {
    setActiveMenu((current) => (current === menu ? null : menu));
  }

  function closeMenu() {
    setActiveMenu(null);
  }

  function commitProjectName() {
    renameProject(draftProjectName);
    setEditingProjectName(false);
  }

  function renderRecentProjects(projects: ProjectSummary[]) {
    if (!projects.length) {
      return <div className="menu-dropdown__empty">No recent local projects</div>;
    }

    return projects.map((recentProject) => (
      <button
        key={recentProject.id}
        className="menu-dropdown__item menu-dropdown__item--stacked"
        onClick={() => {
          closeMenu();
          void onOpenProject(recentProject.id);
        }}
        type="button"
      >
        <span>{recentProject.name}</span>
        <small>{recentProject.partCount} objects</small>
      </button>
    ));
  }

  return (
    <header className="topbar">
      <div className="topbar__cluster">
        <IconButton label={leftPanelVisible ? "Hide objects panel" : "Show objects panel"} onClick={onToggleLeftPanel} active={leftPanelVisible}>
          {leftPanelVisible ? <ChevronLeftIcon width={18} height={18} /> : <PanelLeftIcon width={18} height={18} />}
        </IconButton>
        <div className="topbar__brand">
          <span className="topbar__eyebrow">Web3D Designer</span>
          {editingProjectName ? (
            <input
              autoFocus
              className="topbar__project-input"
              type="text"
              value={draftProjectName}
              onBlur={commitProjectName}
              onChange={(event) => setDraftProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitProjectName();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraftProjectName(projectName);
                  setEditingProjectName(false);
                }
              }}
            />
          ) : (
            <button className="topbar__project-name" onClick={() => setEditingProjectName(true)} type="button">
              {projectName}
            </button>
          )}
        </div>
        <div className="menu-bar" ref={menuRef}>
          <input
            ref={importInputRef}
            accept=".web3d,.json,.gltf,application/json,model/gltf+json"
            className="visually-hidden"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";

              if (file) {
                void onImportProjectFile(file);
              }
            }}
          />
          <div className="menu-bar__group">
            <MenuButton active={activeMenu === "file"} label="File" onClick={() => toggleMenu("file")} />
            {activeMenu === "file" ? (
              <div className="menu-dropdown">
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); onNewProject(); }} type="button">New Project</button>
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); importInputRef.current?.click(); }} type="button">Import Web3D Project</button>
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); void onSaveProject(); }} type="button">Save Now</button>
                <div className="menu-dropdown__submenu">
                  <button className="menu-dropdown__item menu-dropdown__item--submenu-trigger" type="button">
                    <span>Export</span>
                    <ChevronRightIcon width={16} height={16} />
                  </button>
                  <div className="menu-dropdown menu-dropdown--submenu">
                    <button className="menu-dropdown__item" onClick={() => { closeMenu(); onExportWeb3d(); }} type="button">Web3D Project</button>
                    <button className="menu-dropdown__item" onClick={() => { closeMenu(); onExportStl(); }} type="button">STL Mesh</button>
                    <button className="menu-dropdown__item" onClick={() => { closeMenu(); void onExportGltf(); }} type="button">glTF Project</button>
                  </div>
                </div>
                <button className="menu-dropdown__item menu-dropdown__item--danger" onClick={() => { closeMenu(); void onDeleteCurrentProject(); }} type="button">Delete Current Project</button>
                <div className="menu-dropdown__divider" />
                <div className="menu-dropdown__label">Recent Projects</div>
                {renderRecentProjects(recentProjects)}
              </div>
            ) : null}
          </div>

          <div className="menu-bar__group">
            <MenuButton active={activeMenu === "edit"} label="Edit" onClick={() => toggleMenu("edit")} />
            {activeMenu === "edit" ? (
              <div className="menu-dropdown">
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); undo(); }} type="button">Undo</button>
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); redo(); }} type="button">Redo</button>
              </div>
            ) : null}
          </div>

          <div className="menu-bar__group">
            <MenuButton active={activeMenu === "add"} label="Add" onClick={() => toggleMenu("add")} />
            {activeMenu === "add" ? (
              <div className="menu-dropdown">
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); addObject("sheet"); }} type="button">Sheet Object</button>
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); addObject("timber"); }} type="button">Timber Object</button>
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); setActiveTool("measure"); }} type="button">Measure Object</button>
              </div>
            ) : null}
          </div>

          <div className="menu-bar__group">
            <MenuButton active={activeMenu === "view"} label="View" onClick={() => toggleMenu("view")} />
            {activeMenu === "view" ? (
              <div className="menu-dropdown">
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); onToggleLeftPanel(); }} type="button">
                  {leftPanelVisible ? "Hide Objects Panel" : "Show Objects Panel"}
                </button>
                <button className="menu-dropdown__item" onClick={() => { closeMenu(); onToggleRightPanel(); }} type="button">
                  {rightPanelVisible ? "Hide Inspector" : "Show Inspector"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="menu-bar__group">
            <MenuButton active={activeMenu === "settings"} label="Settings" onClick={() => toggleMenu("settings")} />
            {activeMenu === "settings" ? (
              <div className="menu-dropdown menu-dropdown--settings">
                <label className="field">
                  <span>Display units</span>
                  <select
                    className="field__input"
                    value={project.unitPreference}
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
                      value={Number(toDisplayUnits(project.snapSettings.moveIncrement, project.unitPreference).toFixed(2))}
                      onChange={(event) =>
                        updateSnapSettings({
                          moveIncrement: Math.max(0, fromDisplayUnits(Number(event.target.value || 0), project.unitPreference)),
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
                      value={Number(toDisplayUnits(project.snapSettings.resizeIncrement, project.unitPreference).toFixed(2))}
                      onChange={(event) =>
                        updateSnapSettings({
                          resizeIncrement: Math.max(0, fromDisplayUnits(Number(event.target.value || 0), project.unitPreference)),
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
              </div>
            ) : null}
          </div>

          <div className="menu-bar__group">
            <MenuButton active={activeMenu === "help"} label="Help" onClick={() => toggleMenu("help")} />
            {activeMenu === "help" ? (
              <div className="menu-dropdown">
                <div className="menu-dropdown__note">Drag to orbit the camera. Use move and rotate for gizmos, and resize for the yellow handles.</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="topbar__cluster">
        <span className="topbar__status">{saveStatusLabel}</span>
        <IconButton label={rightPanelVisible ? "Hide inspector" : "Show inspector"} onClick={onToggleRightPanel} active={rightPanelVisible}>
          {rightPanelVisible ? <ChevronRightIcon width={18} height={18} /> : <PanelRightIcon width={18} height={18} />}
        </IconButton>
      </div>
    </header>
  );
}
