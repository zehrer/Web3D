import { useEditorStore } from "../store/editorStore";

interface ProjectSidebarProps {
  onOpenProject: (projectId: string) => void | Promise<void>;
}

export function ProjectSidebar({ onOpenProject }: ProjectSidebarProps) {
  const project = useEditorStore((state) => state.project);
  const selectedPartId = useEditorStore((state) => state.selectedPartId);
  const selectPart = useEditorStore((state) => state.selectPart);
  const renameProject = useEditorStore((state) => state.renameProject);
  const recentProjects = useEditorStore((state) => state.recentProjects);

  return (
    <aside className="sidebar">
      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">Project</span>
          <span className="panel-card__meta">{project.parts.length} parts</span>
        </div>

        <label className="field">
          <span>Name</span>
          <input
            className="field__input"
            type="text"
            value={project.name}
            onChange={(event) => renameProject(event.target.value)}
          />
        </label>
      </section>

      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">Parts</span>
          <span className="panel-card__meta">Scene</span>
        </div>

        <div className="parts-list">
          {project.parts.map((part) => (
            <button
              key={part.id}
              className={`parts-list__item ${selectedPartId === part.id ? "parts-list__item--selected" : ""}`}
              onClick={() => selectPart(part.id)}
              type="button"
            >
              <span>{part.name}</span>
              <span>{part.material}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-card__header">
          <span className="panel-card__title">Recent</span>
          <span className="panel-card__meta">Local</span>
        </div>

        <div className="parts-list">
          {recentProjects.length ? (
            recentProjects.map((recentProject) => (
              <button
                key={recentProject.id}
                className="parts-list__item"
                onClick={() => void onOpenProject(recentProject.id)}
                type="button"
              >
                <span>{recentProject.name}</span>
                <span>{recentProject.partCount} parts</span>
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
