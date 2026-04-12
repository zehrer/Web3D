import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { InspectorPanel } from "./components/InspectorPanel";
import { Viewport } from "./components/Viewport";
import { createProject } from "./lib/project";
import {
  listProjectSummaries,
  loadMostRecentProject,
  loadProjectDocument,
  saveProjectDocument,
} from "./lib/persistence";
import { editorStore, useEditorStore } from "./store/editorStore";

const AUTOSAVE_DELAY_MS = 350;

export default function App() {
  const hydrated = useEditorStore((state) => state.hydrated);
  const project = useEditorStore((state) => state.project);
  const setRecentProjects = useEditorStore((state) => state.setRecentProjects);
  const hydrateProject = useEditorStore((state) => state.hydrateProject);
  const setHydrated = useEditorStore((state) => state.setHydrated);
  const createNewProject = useEditorStore((state) => state.createNewProject);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [recentProjects, recentProject] = await Promise.all([
          listProjectSummaries().catch(() => []),
          loadMostRecentProject().catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        setRecentProjects(recentProjects);

        if (recentProject) {
          hydrateProject(recentProject);
        } else {
          const nextProject = createProject();
          hydrateProject(nextProject);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [hydrateProject, setHydrated, setRecentProjects]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveProjectDocument(project)
        .then(() => listProjectSummaries())
        .then((recentProjects) => setRecentProjects(recentProjects))
        .catch(() => undefined);
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [hydrated, project, setRecentProjects]);

  async function handleOpenProject(projectId: string) {
    const projectDocument = await loadProjectDocument(projectId);
    if (projectDocument) {
      editorStore.getState().hydrateProject(projectDocument);
    }
  }

  async function handleSaveNow() {
    await saveProjectDocument(editorStore.getState().project);
    const summaries = await listProjectSummaries();
    editorStore.getState().setRecentProjects(summaries);
  }

  function handleNewProject() {
    createNewProject();
  }

  if (!hydrated) {
    return (
      <main className="app-shell">
        <div className="loading-card">
          <p>Loading editor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Toolbar onNewProject={handleNewProject} onSaveProject={handleSaveNow} />
      <section className="workspace">
        <ProjectSidebar onOpenProject={handleOpenProject} />
        <Viewport />
        <InspectorPanel />
      </section>
    </main>
  );
}
