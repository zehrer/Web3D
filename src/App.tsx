import { useEffect, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { InspectorPanel } from "./components/InspectorPanel";
import { Viewport } from "./components/Viewport";
import { downloadProjectAsGltf, downloadProjectAsStl, downloadProjectAsUsdz, downloadProjectAsWeb3d } from "./lib/export";
import { createDemoProject, createProject } from "./lib/project";
import {
  deleteProjectDocument,
  listProjectSummaries,
  loadMostRecentProject,
  loadProjectDocument,
  saveProjectDocument,
} from "./lib/persistence";
import { deserializeProjectFile } from "./lib/serialization";
import { editorStore, useEditorStore } from "./store/editorStore";

const AUTOSAVE_DELAY_MS = 350;

export default function App() {
  const hydrated = useEditorStore((state) => state.hydrated);
  const project = useEditorStore((state) => state.project);
  const setRecentProjects = useEditorStore((state) => state.setRecentProjects);
  const hydrateProject = useEditorStore((state) => state.hydrateProject);
  const setHydrated = useEditorStore((state) => state.setHydrated);
  const createNewProject = useEditorStore((state) => state.createNewProject);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [leftPanelVisible, setLeftPanelVisible] = useState(() => window.innerWidth >= 768);
  const [rightPanelVisible, setRightPanelVisible] = useState(() => window.innerWidth >= 768);

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
          const nextProject = createDemoProject();
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
    function handleResize() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setLeftPanelVisible(false);
        setRightPanelVisible(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSaveState("saving");
      void saveProjectDocument(project)
        .then(() => listProjectSummaries())
        .then((recentProjects) => {
          setRecentProjects(recentProjects);
          setSaveState("saved");
          setLastSavedAt(new Date().toLocaleTimeString());
        })
        .catch(() => setSaveState("error"));
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
    setSaveState("saving");

    try {
      await saveProjectDocument(editorStore.getState().project);
      const summaries = await listProjectSummaries();
      editorStore.getState().setRecentProjects(summaries);
      setSaveState("saved");
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch {
      setSaveState("error");
    }
  }

  function handleNewProject() {
    createNewProject();
  }

  async function handleDeleteCurrentProject() {
    const currentProject = editorStore.getState().project;
    const confirmed = window.confirm(
      `Delete project "${currentProject.name}" from this browser?\n\nThis cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setSaveState("saving");

    try {
      await deleteProjectDocument(currentProject.id);

      const fallbackProject = await loadMostRecentProject();
      if (fallbackProject) {
        editorStore.getState().hydrateProject(fallbackProject);
      } else {
        const nextProject = createDemoProject();
        editorStore.getState().hydrateProject(nextProject);
        await saveProjectDocument(nextProject);
      }

      const summaries = await listProjectSummaries();
      editorStore.getState().setRecentProjects(summaries);
      setSaveState("saved");
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch {
      setSaveState("error");
    }
  }

  function handleExportStl() {
    downloadProjectAsStl(editorStore.getState().project);
  }

  function handleExportWeb3d() {
    downloadProjectAsWeb3d(editorStore.getState().project);
  }

  async function handleExportGltf() {
    await downloadProjectAsGltf(editorStore.getState().project);
  }

  async function handleExportUsdz() {
    await downloadProjectAsUsdz(editorStore.getState().project);
  }

  async function handleImportProjectFile(file: File) {
    setSaveState("saving");

    try {
      const payload = await file.text();
      const importedProject = deserializeProjectFile(payload);
      editorStore.getState().hydrateProject(importedProject);
      await saveProjectDocument(importedProject);
      const summaries = await listProjectSummaries();
      editorStore.getState().setRecentProjects(summaries);
      setSaveState("saved");
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch {
      setSaveState("error");
    }
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

  const saveStatusLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved" && lastSavedAt
        ? `Saved ${lastSavedAt}`
        : saveState === "error"
          ? "Save failed"
          : "Local project";
  const workspaceColumns = leftPanelVisible
    ? rightPanelVisible
      ? "280px minmax(0, 1fr) 320px"
      : "280px minmax(0, 1fr)"
    : rightPanelVisible
      ? "minmax(0, 1fr) 320px"
      : "minmax(0, 1fr)";

  return (
    <main className="app-shell">
      <Toolbar
        onNewProject={handleNewProject}
        onSaveProject={handleSaveNow}
        onImportProjectFile={handleImportProjectFile}
        onExportWeb3d={handleExportWeb3d}
        onExportStl={handleExportStl}
        onExportGltf={handleExportGltf}
        onExportUsdz={handleExportUsdz}
        onDeleteCurrentProject={handleDeleteCurrentProject}
        onOpenProject={handleOpenProject}
        onToggleLeftPanel={() => setLeftPanelVisible((value) => !value)}
        onToggleRightPanel={() => setRightPanelVisible((value) => !value)}
        leftPanelVisible={leftPanelVisible}
        rightPanelVisible={rightPanelVisible}
        saveStatusLabel={saveStatusLabel}
      />
      <section className="workspace" style={isMobile ? undefined : { gridTemplateColumns: workspaceColumns }}>
        {leftPanelVisible ? <ProjectSidebar /> : null}
        <Viewport />
        {rightPanelVisible ? <InspectorPanel /> : null}
      </section>
    </main>
  );
}
