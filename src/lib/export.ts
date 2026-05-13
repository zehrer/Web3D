import { BoxGeometry, CircleGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, type Object3D } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { serializeProject, serializeProjectFile } from "./serialization";
import type { PartNode, ProjectDocument } from "../types/model";

const GLTF_METERS_PER_MILLIMETER = 0.001;

function createExportMaterial(part: PartNode) {
  if (part.objectType === "glass") {
    return new MeshStandardMaterial({
      color: part.color,
      depthWrite: false,
      opacity: 0.38,
      roughness: 0.08,
      transparent: true,
    });
  }

  if (part.objectType === "rectangle" || part.objectType === "circle") {
    return new MeshStandardMaterial({ color: part.color, side: DoubleSide });
  }

  return new MeshStandardMaterial({ color: part.color });
}

function createPartExportGroup(part: PartNode, unitScale = 1): Group {
  const group = new Group();
  group.name = part.name;
  group.position.set(
    part.position.x * unitScale,
    part.position.y * unitScale,
    part.position.z * unitScale,
  );
  group.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
  group.userData = {
    web3d: {
      kind: "part",
      part,
    },
  };

  const mesh =
    part.objectType === "rectangle"
      ? new Mesh(new PlaneGeometry(part.size.x * unitScale, part.size.z * unitScale), createExportMaterial(part))
      : part.objectType === "circle"
        ? new Mesh(new CircleGeometry((part.size.x * unitScale) / 2, 64), createExportMaterial(part))
        : new Mesh(
            new BoxGeometry(part.size.x * unitScale, part.size.y * unitScale, part.size.z * unitScale),
            createExportMaterial(part),
          );
  mesh.name = `${part.name} Mesh`;
  if (part.objectType === "rectangle" || part.objectType === "circle") {
    mesh.position.set((part.size.x * unitScale) / 2, 0, (part.size.z * unitScale) / 2);
    mesh.rotation.set(-Math.PI / 2, 0, 0);
  } else {
    mesh.position.set(
      (part.size.x * unitScale) / 2,
      (part.size.y * unitScale) / 2,
      (part.size.z * unitScale) / 2,
    );
  }
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

function createProjectScene(project: ProjectDocument, unitScale = 1): Group {
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
    (parent ?? sceneRoot).add(createPartExportGroup(part, unitScale));
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

export function createWeb3dFilename(project: ProjectDocument): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${ts}_${sanitizeFilenameSegment(project.name)}.web3d`;
}

export function createUsdzFilename(project: ProjectDocument): string {
  return `${sanitizeFilenameSegment(project.name)}.usdz`;
}

export function exportProjectToStl(project: ProjectDocument): string {
  const sceneRoot = createProjectScene(project);

  const exporter = new STLExporter();
  return exporter.parse(sceneRoot, { binary: false }) as string;
}

export function exportProjectToGltf(project: ProjectDocument): Promise<string> {
  const sceneRoot = createProjectScene(project, GLTF_METERS_PER_MILLIMETER);
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
                units: {
                  length: "meter",
                  sourceLength: "millimeter",
                  sourceToExportScale: GLTF_METERS_PER_MILLIMETER,
                },
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

export function downloadProjectAsWeb3d(project: ProjectDocument): void {
  downloadTextFile(serializeProjectFile(project), createWeb3dFilename(project), "application/json");
}

export async function exportProjectToUsdz(project: ProjectDocument): Promise<Uint8Array> {
  const sceneRoot = createProjectScene(project, GLTF_METERS_PER_MILLIMETER);
  const exporter = new USDZExporter();
  return exporter.parseAsync(sceneRoot as Object3D);
}

export async function downloadProjectAsUsdz(project: ProjectDocument): Promise<void> {
  const buffer = await exportProjectToUsdz(project);
  const blob = new Blob([buffer.buffer as ArrayBuffer], { type: "model/vnd.usdz+zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = createUsdzFilename(project);
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function openProjectInArQuickLook(project: ProjectDocument): Promise<void> {
  const buffer = await exportProjectToUsdz(project);
  const blob = new Blob([buffer.buffer as ArrayBuffer], { type: "model/vnd.usdz+zip" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.setAttribute("rel", "ar");
  anchor.setAttribute("href", url);
  // AR Quick Look requires a child element to open in AR mode rather than trigger a download
  anchor.appendChild(document.createElement("img"));
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
