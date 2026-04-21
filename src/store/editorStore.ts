import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { cloneProject, createObjectPart, createProject, touchProject } from "../lib/project";
import { applyProfileToSize, getDefaultProfileId, getProfileById } from "../lib/profiles";
import { clampLength } from "../lib/units";
import type {
  ActiveTool,
  CameraState,
  GroupNode,
  ObjectProfileId,
  ObjectType,
  PartNode,
  ProjectDocument,
  ProjectSummary,
  SnapSettings,
  UnitPreference,
  Vector3Like,
} from "../types/model";

type HistoryState = {
  undoStack: ProjectDocument[];
  redoStack: ProjectDocument[];
};

export interface EditorState extends HistoryState {
  hydrated: boolean;
  project: ProjectDocument;
  recentProjects: ProjectSummary[];
  selectedPartId: string | null;
  activeTool: ActiveTool;
}

export interface EditorActions {
  hydrateProject: (project: ProjectDocument) => void;
  setHydrated: (value: boolean) => void;
  setRecentProjects: (projects: ProjectSummary[]) => void;
  createNewProject: () => void;
  selectPart: (partId: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  renameProject: (name: string) => void;
  updateUnitPreference: (unitPreference: UnitPreference) => void;
  updateSnapSettings: (partial: Partial<SnapSettings>) => void;
  addObject: (objectType: ObjectType, profileId?: ObjectProfileId) => void;
  addGroup: (parentGroupId?: string | null) => void;
  updateGroupName: (groupId: string, name: string) => void;
  movePartToGroup: (partId: string, groupId: string | null) => void;
  moveGroupToGroup: (groupId: string, parentGroupId: string | null) => void;
  duplicateSelectedPart: () => void;
  deleteSelectedPart: () => void;
  updatePart: (partId: string, updater: (part: PartNode) => PartNode) => void;
  setPartGeometry: (partId: string, geometry: Partial<Pick<PartNode, "size" | "position" | "rotation">>) => void;
  previewPartGeometry: (partId: string, geometry: Partial<Pick<PartNode, "size" | "position" | "rotation">>) => void;
  setPartProfile: (partId: string, profileId: ObjectProfileId) => void;
  commitCameraState: (cameraState: CameraState) => void;
  finalizeTransientChange: (previousProject: ProjectDocument) => void;
  undo: () => void;
  redo: () => void;
}

export type EditorStore = ReturnType<typeof createEditorStore>;

const MAX_HISTORY = 50;
const DUPLICATE_OFFSET_MM = 10;

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneHistoryProject(project: ProjectDocument): ProjectDocument {
  return cloneProject(project);
}

function withProjectHistory(
  current: EditorState,
  updater: (project: ProjectDocument) => ProjectDocument,
): Pick<EditorState, "project" | "undoStack" | "redoStack"> {
  const previousProject = cloneHistoryProject(current.project);
  const nextProject = touchProject(updater(cloneProject(current.project)));

  return {
    project: nextProject,
    undoStack: [...current.undoStack.slice(-(MAX_HISTORY - 1)), previousProject],
    redoStack: [],
  };
}

function replacePart(parts: PartNode[], partId: string, updater: (part: PartNode) => PartNode): PartNode[] {
  return parts.map((part) => (part.id === partId ? updater(part) : part));
}

function replaceGroup(groups: GroupNode[], groupId: string, updater: (group: GroupNode) => GroupNode): GroupNode[] {
  return groups.map((group) => (group.id === groupId ? updater(group) : group));
}

function isDescendantGroup(groups: GroupNode[], candidateGroupId: string, parentGroupId: string): boolean {
  let current = groups.find((group) => group.id === candidateGroupId);

  while (current) {
    if (current.parentGroupId === parentGroupId) {
      return true;
    }

    current = current.parentGroupId ? groups.find((group) => group.id === current?.parentGroupId) : undefined;
  }

  return false;
}

export function createEditorStore() {
  return createStore<EditorState & EditorActions>((set) => ({
    hydrated: false,
    project: createProject(),
    recentProjects: [],
    selectedPartId: null,
    activeTool: "move",
    undoStack: [],
    redoStack: [],

    hydrateProject: (project) =>
      set({
        project,
        hydrated: true,
        selectedPartId: project.parts[0]?.id ?? null,
        undoStack: [],
        redoStack: [],
      }),

    setHydrated: (value) => set({ hydrated: value }),
    setRecentProjects: (projects) => set({ recentProjects: projects }),

    createNewProject: () =>
      set(() => {
        const project = createProject();
        return {
          project,
          selectedPartId: project.parts[0]?.id ?? null,
          undoStack: [],
          redoStack: [],
        };
      }),

    selectPart: (partId) => set({ selectedPartId: partId }),
    setActiveTool: (tool) => set({ activeTool: tool }),
    renameProject: (name) =>
      set((state) => ({
        ...withProjectHistory(state, (project) => ({
          ...project,
          name: name.trim() || "Untitled Project",
        })),
      })),

    updateUnitPreference: (unitPreference) =>
      set((state) => ({
        ...withProjectHistory(state, (project) => ({
          ...project,
          unitPreference,
        })),
      })),

    updateSnapSettings: (partial) =>
      set((state) => ({
        ...withProjectHistory(state, (project) => ({
          ...project,
          snapSettings: {
            ...project.snapSettings,
            ...partial,
          },
        })),
      })),

    addObject: (objectType, profileId = getDefaultProfileId(objectType)) =>
      set((state) => {
        const nextIndex = state.project.parts.length;

        const nextPart = createObjectPart(nextIndex, {
          objectType,
          profileId,
          position: { x: 0, y: 0, z: 0 },
        });

        const history = withProjectHistory(state, (project) => ({
          ...project,
          parts: [...project.parts, nextPart],
        }));

        return {
          ...history,
          selectedPartId: nextPart.id,
        };
      }),

    addGroup: (parentGroupId = null) =>
      set((state) => {
        const parentExists = parentGroupId ? state.project.groups.some((group) => group.id === parentGroupId) : true;
        const nextGroup: GroupNode = {
          id: randomId(),
          name: `Group ${state.project.groups.length + 1}`,
          parentGroupId: parentExists ? parentGroupId : null,
        };

        return {
          ...withProjectHistory(state, (project) => ({
            ...project,
            groups: [...project.groups, nextGroup],
          })),
        };
      }),

    updateGroupName: (groupId, name) =>
      set((state) => ({
        ...withProjectHistory(state, (project) => ({
          ...project,
          groups: replaceGroup(project.groups, groupId, (group) => ({
            ...group,
            name: name.trim() || group.name,
          })),
        })),
      })),

    movePartToGroup: (partId, groupId) =>
      set((state) => {
        const nextGroupId = groupId && state.project.groups.some((group) => group.id === groupId) ? groupId : null;

        return {
          ...withProjectHistory(state, (project) => ({
            ...project,
            parts: replacePart(project.parts, partId, (part) => ({
              ...part,
              groupId: nextGroupId,
            })),
          })),
        };
      }),

    moveGroupToGroup: (groupId, parentGroupId) =>
      set((state) => {
        const groupExists = state.project.groups.some((group) => group.id === groupId);
        const parentExists = parentGroupId ? state.project.groups.some((group) => group.id === parentGroupId) : true;
        const isInvalidParent =
          parentGroupId === groupId ||
          (parentGroupId ? isDescendantGroup(state.project.groups, parentGroupId, groupId) : false);

        if (!groupExists || !parentExists || isInvalidParent) {
          return state;
        }

        return {
          ...withProjectHistory(state, (project) => ({
            ...project,
            groups: replaceGroup(project.groups, groupId, (group) => ({
              ...group,
              parentGroupId: parentGroupId ?? null,
            })),
          })),
        };
      }),

    duplicateSelectedPart: () =>
      set((state) => {
        const selected = state.project.parts.find((part) => part.id === state.selectedPartId);
        if (!selected) {
          return state;
        }

        const duplicate: PartNode = {
          ...(JSON.parse(JSON.stringify(selected)) as PartNode),
          id: randomId(),
          name: `${selected.name} Copy`,
          position: {
            x: selected.position.x + DUPLICATE_OFFSET_MM,
            y: selected.position.y,
            z: selected.position.z,
          },
        };

        const history = withProjectHistory(state, (project) => ({
          ...project,
          parts: [...project.parts, duplicate],
        }));

        return {
          ...history,
          selectedPartId: duplicate.id,
        };
      }),

    deleteSelectedPart: () =>
      set((state) => {
        if (!state.selectedPartId) {
          return state;
        }

        const nextParts = state.project.parts.filter((part) => part.id !== state.selectedPartId);
        const history = withProjectHistory(state, (project) => ({
          ...project,
          parts: nextParts,
        }));

        return {
          ...history,
          selectedPartId: nextParts[0]?.id ?? null,
        };
      }),

    updatePart: (partId, updater) =>
      set((state) => ({
        ...withProjectHistory(state, (project) => ({
          ...project,
          parts: replacePart(project.parts, partId, updater),
        })),
      })),

    setPartGeometry: (partId, geometry) =>
      set((state) => ({
        ...withProjectHistory(state, (project) => ({
          ...project,
          parts: replacePart(project.parts, partId, (part) => ({
            ...part,
            size: geometry.size
              ? {
                  x: clampLength(geometry.size.x ?? part.size.x),
                  y: clampLength(geometry.size.y ?? part.size.y),
                  z: clampLength(geometry.size.z ?? part.size.z),
                }
              : part.size,
            position: geometry.position ? { ...part.position, ...geometry.position } : part.position,
            rotation: geometry.rotation ? { ...part.rotation, ...geometry.rotation } : part.rotation,
          })),
        })),
      })),

    previewPartGeometry: (partId, geometry) =>
      set((state) => ({
        project: {
          ...state.project,
          parts: replacePart(state.project.parts, partId, (part) => ({
            ...part,
            size: geometry.size
              ? {
                  x: clampLength(geometry.size.x ?? part.size.x),
                  y: clampLength(geometry.size.y ?? part.size.y),
                  z: clampLength(geometry.size.z ?? part.size.z),
                }
              : part.size,
            position: geometry.position ? { ...part.position, ...geometry.position } : part.position,
            rotation: geometry.rotation ? { ...part.rotation, ...geometry.rotation } : part.rotation,
          })),
        },
      })),

    setPartProfile: (partId, profileId) =>
      set((state) => ({
        ...withProjectHistory(state, (project) => ({
          ...project,
          parts: replacePart(project.parts, partId, (part) => {
            const profile = getProfileById(profileId);
            if (profile.objectType !== part.objectType) {
              return part;
            }

            return {
              ...part,
              profileId,
              size: applyProfileToSize(profile, part.size),
              color: profile.color,
            };
          }),
        })),
      })),

    commitCameraState: (cameraState) =>
      set((state) => ({
        project: {
          ...state.project,
          cameraState,
        },
      })),

    finalizeTransientChange: (previousProject) =>
      set((state) => ({
        project: touchProject(state.project),
        undoStack: [...state.undoStack.slice(-(MAX_HISTORY - 1)), cloneHistoryProject(previousProject)],
        redoStack: [],
      })),

    undo: () =>
      set((state) => {
        const previous = state.undoStack.at(-1);
        if (!previous) {
          return state;
        }

        return {
          project: previous,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, cloneHistoryProject(state.project)],
          selectedPartId: previous.parts.find((part) => part.id === state.selectedPartId)?.id ?? previous.parts[0]?.id ?? null,
        };
      }),

    redo: () =>
      set((state) => {
        const next = state.redoStack.at(-1);
        if (!next) {
          return state;
        }

        return {
          project: next,
          undoStack: [...state.undoStack, cloneHistoryProject(state.project)],
          redoStack: state.redoStack.slice(0, -1),
          selectedPartId: next.parts.find((part) => part.id === state.selectedPartId)?.id ?? next.parts[0]?.id ?? null,
        };
      }),
  }));
}

export const editorStore = createEditorStore();

export function useEditorStore<T>(selector: (state: EditorState & EditorActions) => T): T {
  return useStore(editorStore, selector);
}

export function getSelectedPart(state: EditorState): PartNode | null {
  return state.project.parts.find((part) => part.id === state.selectedPartId) ?? null;
}

export function updateVector(
  vector: Vector3Like,
  axis: keyof Vector3Like,
  value: number,
): Vector3Like {
  return {
    ...vector,
    [axis]: value,
  };
}
