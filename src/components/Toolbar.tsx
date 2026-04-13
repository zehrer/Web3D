import type { ReactNode } from "react";
import { useEditorStore } from "../store/editorStore";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HelpIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PlusIcon,
  SaveIcon,
} from "./Icons";

interface ToolbarProps {
  onSaveProject: () => void | Promise<void>;
  onNewProject: () => void;
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

export function Toolbar({
  onNewProject,
  onSaveProject,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelVisible,
  rightPanelVisible,
  saveStatusLabel,
}: ToolbarProps) {
  const projectName = useEditorStore((state) => state.project.name);

  return (
    <header className="topbar">
      <div className="topbar__cluster">
        <IconButton label={leftPanelVisible ? "Hide objects panel" : "Show objects panel"} onClick={onToggleLeftPanel} active={leftPanelVisible}>
          {leftPanelVisible ? <ChevronLeftIcon width={18} height={18} /> : <PanelLeftIcon width={18} height={18} />}
        </IconButton>
        <div className="topbar__brand">
          <span className="topbar__eyebrow">Web3D Designer</span>
          <strong>{projectName}</strong>
        </div>
      </div>

      <div className="topbar__cluster">
        <IconButton label="New project" onClick={onNewProject}>
          <PlusIcon width={18} height={18} />
        </IconButton>
        <IconButton label="Save project" onClick={() => void onSaveProject()}>
          <SaveIcon width={18} height={18} />
        </IconButton>
        <span className="topbar__status">{saveStatusLabel}</span>
      </div>

      <div className="topbar__cluster">
        <span className="topbar__hint">Icon-first workspace</span>
        <IconButton label={rightPanelVisible ? "Hide inspector" : "Show inspector"} onClick={onToggleRightPanel} active={rightPanelVisible}>
          {rightPanelVisible ? <ChevronRightIcon width={18} height={18} /> : <PanelRightIcon width={18} height={18} />}
        </IconButton>
        <div className="topbar__help-chip">
          <HelpIcon width={15} height={15} />
          <span>Focus on the scene</span>
        </div>
      </div>
    </header>
  );
}
