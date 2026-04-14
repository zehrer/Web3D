import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import type { PartNode, ProjectDocument } from "../types/model";

function createExportGroup(part: PartNode): Group {
  const group = new Group();
  group.position.set(part.position.x, part.position.y, part.position.z);
  group.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);

  const mesh = new Mesh(
    new BoxGeometry(part.size.x, part.size.y, part.size.z),
    new MeshStandardMaterial({ color: part.color }),
  );
  mesh.position.set(part.size.x / 2, part.size.y / 2, part.size.z / 2);
  group.add(mesh);

  return group;
}

function sanitizeFilenameSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "web3d-project";
}

export function createStlFilename(project: ProjectDocument): string {
  return `${sanitizeFilenameSegment(project.name)}.stl`;
}

export function exportProjectToStl(project: ProjectDocument): string {
  const sceneRoot = new Group();

  project.parts.forEach((part) => {
    sceneRoot.add(createExportGroup(part));
  });

  sceneRoot.updateMatrixWorld(true);

  const exporter = new STLExporter();
  return exporter.parse(sceneRoot, { binary: false }) as string;
}

export function downloadProjectAsStl(project: ProjectDocument): void {
  const payload = exportProjectToStl(project);
  const blob = new Blob([payload], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = createStlFilename(project);
  anchor.click();
  URL.revokeObjectURL(url);
}
