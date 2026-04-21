import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { serializeProject } from "./serialization";
import type { PartNode, ProjectDocument } from "../types/model";

function createPartExportGroup(part: PartNode): Group {
  const group = new Group();
  group.name = part.name;
  group.position.set(part.position.x, part.position.y, part.position.z);
  group.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
  group.userData = {
    web3d: {
      kind: "part",
      part,
    },
  };

  const mesh = new Mesh(
    new BoxGeometry(part.size.x, part.size.y, part.size.z),
    new MeshStandardMaterial({ color: part.color }),
  );
  mesh.name = `${part.name} Mesh`;
  mesh.position.set(part.size.x / 2, part.size.y / 2, part.size.z / 2);
  mesh.userData = {
    web3d: {
      kind: "part-mesh",
      partId: part.id,
      objectType: part.objectType,
      profileId: part.profileId,
      size: part.size,
      color: part.color,
    },
  };
  group.add(mesh);

  return group;
}

function createProjectScene(project: ProjectDocument): Group {
  const sceneRoot = new Group();
  sceneRoot.name = project.name;
  sceneRoot.userData = {
    web3d: {
      kind: "project",
      project,
    },
  };

  const groupObjects = new Map<string, Group>();

  project.groups.forEach((groupNode) => {
    const group = new Group();
    group.name = groupNode.name;
    group.userData = {
      web3d: {
        kind: "group",
        group: groupNode,
      },
    };
    groupObjects.set(groupNode.id, group);
  });

  project.groups.forEach((groupNode) => {
    const group = groupObjects.get(groupNode.id);
    const parent = groupNode.parentGroupId ? groupObjects.get(groupNode.parentGroupId) : sceneRoot;
    if (group && parent) {
      parent.add(group);
    }
  });

  project.parts.forEach((part) => {
    const parent = part.groupId ? groupObjects.get(part.groupId) : sceneRoot;
    (parent ?? sceneRoot).add(createPartExportGroup(part));
  });

  sceneRoot.updateMatrixWorld(true);
  return sceneRoot;
}

function sanitizeFilenameSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "web3d-project";
}

export function createStlFilename(project: ProjectDocument): string {
  return `${sanitizeFilenameSegment(project.name)}.stl`;
}

export function createGltfFilename(project: ProjectDocument): string {
  return `${sanitizeFilenameSegment(project.name)}.gltf`;
}

export function exportProjectToStl(project: ProjectDocument): string {
  const sceneRoot = createProjectScene(project);

  const exporter = new STLExporter();
  return exporter.parse(sceneRoot, { binary: false }) as string;
}

export function exportProjectToGltf(project: ProjectDocument): Promise<string> {
  const sceneRoot = createProjectScene(project);
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      sceneRoot as Object3D,
      (result) => {
        if (result instanceof ArrayBuffer) {
          reject(new Error("Expected JSON glTF export but received binary output"));
          return;
        }

        resolve(
          JSON.stringify(
            {
              ...result,
              extras: {
                web3dProjectDocument: JSON.parse(serializeProject(project)),
              },
            },
            null,
            2,
          ),
        );
      },
      (error) => reject(error),
      {
        binary: false,
        includeCustomExtensions: true,
      },
    );
  });
}

function downloadTextFile(payload: string, filename: string, type: string): void {
  const blob = new Blob([payload], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadProjectAsStl(project: ProjectDocument): void {
  downloadTextFile(exportProjectToStl(project), createStlFilename(project), "model/stl");
}

export async function downloadProjectAsGltf(project: ProjectDocument): Promise<void> {
  const payload = await exportProjectToGltf(project);
  downloadTextFile(payload, createGltfFilename(project), "model/gltf+json");
}
