import { useEffect, useRef, useState, type DragEvent } from "react";
import { BeamIcon, ChevronDownIcon, ChevronRightIcon, CircleIcon, CladdingIcon, EyeIcon, EyeOffIcon, FolderIcon, GlassIcon, RectangleIcon, RulerIcon, SheetIcon } from "./Icons";
import { useEditorStore } from "../store/editorStore";
import type { GroupNode, MaterialGroupNode, MaterialNode, MeasurementNode, ObjectType, PartNode } from "../types/model";

type SidebarTab = "objects" | "material";
type EditingItem = { kind: "part" | "group" | "measurement"; id: string } | null;
type EditingMaterialItem = { kind: "material" | "materialGroup"; id: string } | null;
type DraggedTreeItem = { kind: "part" | "group" | "measurement"; id: string };
type DropTarget = "root" | string | null;

const TREE_DRAG_MIME = "application/x-web3d-tree-item";

function PartTypeIcon({ objectType }: { objectType: ObjectType }) {
  if (objectType === "sheet") return <SheetIcon width={14} height={14} />;
  if (objectType === "cladding") return <CladdingIcon width={14} height={14} />;
  if (objectType === "glass") return <GlassIcon width={14} height={14} />;
  if (objectType === "rectangle") return <RectangleIcon width={14} height={14} />;
  if (objectType === "circle") return <CircleIcon width={14} height={14} />;
  return <BeamIcon width={14} height={14} />;
}

function isGroupDescendant(groups: GroupNode[], candidateGroupId: string, ancestorGroupId: string): boolean {
  let current = groups.find((group) => group.id === candidateGroupId);
  while (current?.parentGroupId) {
    if (current.parentGroupId === ancestorGroupId) return true;
    current = groups.find((group) => group.id === current?.parentGroupId);
  }
  return false;
}

function MaterialPanel() {
  const project = useEditorStore((state) => state.project);
  const selectedMaterialId = useEditorStore((state) => state.selectedMaterialId);
  const selectMaterial = useEditorStore((state) => state.selectMaterial);
  const renameMaterial = useEditorStore((state) => state.renameMaterial);
  const renameMaterialGroup = useEditorStore((state) => state.renameMaterialGroup);
  const addMaterialGroup = useEditorStore((state) => state.addMaterialGroup);

  const [editingItem, setEditingItem] = useState<EditingMaterialItem>(null);
  const [draftName, setDraftName] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set(project.materialGroups.map((g) => g.id)));

  function commitRename() {
    if (!editingItem) return;
    const name = draftName.trim();
    if (name) {
      if (editingItem.kind === "material") renameMaterial(editingItem.id, name);
      else renameMaterialGroup(editingItem.id, name);
    }
    setEditingItem(null);
    setDraftName("");
  }

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function renderNameEditor(kind: "material" | "materialGroup", id: string, name: string) {
    if (editingItem?.kind === kind && editingItem.id === id) {
      return (
        <input
          autoFocus
          className="object-row__name-input"
          type="text"
          value={draftName}
          onBlur={commitRename}
          onChange={(event) => setDraftName(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); commitRename(); }
            if (event.key === "Escape") { event.preventDefault(); setEditingItem(null); setDraftName(""); }
          }}
        />
      );
    }
    return (
      <button
        className="object-row__name-button"
        onClick={(event) => {
          event.stopPropagation();
          setEditingItem({ kind, id });
          setDraftName(name);
        }}
        type="button"
      >
        <strong>{name}</strong>
      </button>
    );
  }

  function renderMaterial(material: MaterialNode, depth: number) {
    const isSelected = material.id === selectedMaterialId;
    return (
      <div
        key={material.id}
        className={`object-row ${isSelected ? "object-row--selected" : ""}`}
        onClick={() => selectMaterial(isSelected ? null : material.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectMaterial(isSelected ? null : material.id);
          }
        }}
        role="button"
        style={{ paddingLeft: `${0.88 + depth * 1.2}rem` }}
        tabIndex={0}
      >
        <span className="object-row__disclosure object-row__disclosure--placeholder" />
        <span className="object-row__icon">
          <PartTypeIcon objectType={material.objectType} />
        </span>
        <span className="object-row__content">
          {renderNameEditor("material", material.id, material.name)}
        </span>
      </div>
    );
  }

  function renderMaterialGroup(group: MaterialGroupNode, depth: number) {
    const children = project.materials.filter((m) => m.groupId === group.id);
    const isExpanded = expandedGroupIds.has(group.id);

    return (
      <div className="object-tree__group" key={group.id}>
        <div
          className="object-row object-row--group"
          style={{ paddingLeft: `${0.88 + depth * 1.2}rem` }}
        >
          {children.length > 0 ? (
            <button
              aria-label={isExpanded ? `Collapse ${group.name}` : `Expand ${group.name}`}
              className="object-row__disclosure"
              onClick={(event) => { event.stopPropagation(); toggleGroup(group.id); }}
              type="button"
            >
              {isExpanded ? <ChevronDownIcon width={13} height={13} /> : <ChevronRightIcon width={13} height={13} />}
            </button>
          ) : (
            <span className="object-row__disclosure object-row__disclosure--placeholder" />
          )}
          <span className="object-row__icon object-row__icon--group">
            <FolderIcon width={14} height={14} />
          </span>
          <span className="object-row__content">
            {renderNameEditor("materialGroup", group.id, group.name)}
          </span>
        </div>
        {isExpanded ? children.map((m) => renderMaterial(m, depth + 1)) : null}
      </div>
    );
  }

  const rootGroups = project.materialGroups.filter((g) => g.parentGroupId === null);
  const ungroupedMaterials = project.materials.filter((m) => m.groupId === null);

  return (
    <section className="panel-card browser-card">
      <div className="browser-card__header">
        <div>
          <span className="panel-card__title">Material</span>
          <p className="browser-card__subtitle">
            {project.materials.length} materials · {project.materialGroups.length} groups
          </p>
        </div>
        <button
          aria-label="Create material group"
          className="browser-card__header-action"
          onClick={() => addMaterialGroup()}
          title="Create material group"
          type="button"
        >
          <FolderIcon width={16} height={16} />
        </button>
      </div>

      {selectedMaterialId ? (
        <div className="material-panel__filter-bar">
          <span>Filter active</span>
          <button
            className="material-panel__filter-clear"
            onClick={() => selectMaterial(null)}
            type="button"
          >
            Show all
          </button>
        </div>
      ) : null}

      <div className="object-browser">
        {rootGroups.length > 0 || ungroupedMaterials.length > 0 ? (
          <>
            {rootGroups.map((g) => renderMaterialGroup(g, 0))}
            {ungroupedMaterials.map((m) => renderMaterial(m, 0))}
          </>
        ) : (
          <p className="panel-card__empty">No materials defined yet.</p>
        )}
      </div>
    </section>
  );
}

export function ProjectSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("objects");
  const [editingItem, setEditingItem] = useState<EditingItem>(null);
  const [draftName, setDraftName] = useState("");
  const [draggingItem, setDraggingItem] = useState<DraggedTreeItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());
  const knownGroupIdsRef = useRef<Set<string>>(new Set());
  const project = useEditorStore((state) => state.project);
  const selectedPartId = useEditorStore((state) => state.selectedPartId);
  const selectedMeasurementId = useEditorStore((state) => state.selectedMeasurementId);
  const selectPart = useEditorStore((state) => state.selectPart);
  const selectMeasurement = useEditorStore((state) => state.selectMeasurement);
  const selectMaterial = useEditorStore((state) => state.selectMaterial);
  const addGroup = useEditorStore((state) => state.addGroup);
  const updatePart = useEditorStore((state) => state.updatePart);
  const updateMeasurement = useEditorStore((state) => state.updateMeasurement);
  const updateGroupName = useEditorStore((state) => state.updateGroupName);
  const movePartToGroup = useEditorStore((state) => state.movePartToGroup);
  const moveMeasurementToGroup = useEditorStore((state) => state.moveMeasurementToGroup);
  const moveGroupToGroup = useEditorStore((state) => state.moveGroupToGroup);
  const togglePartVisibility = useEditorStore((state) => state.togglePartVisibility);
  const toggleGroupVisibility = useEditorStore((state) => state.toggleGroupVisibility);
  const toggleMeasurementVisibility = useEditorStore((state) => state.toggleMeasurementVisibility);

  useEffect(() => {
    if (editingItem?.kind === "part" && !project.parts.some((part) => part.id === editingItem.id)) {
      setEditingItem(null); setDraftName("");
    }
    if (editingItem?.kind === "measurement" && !project.measurements.some((m) => m.id === editingItem.id)) {
      setEditingItem(null); setDraftName("");
    }
    if (editingItem?.kind === "group" && !project.groups.some((g) => g.id === editingItem.id)) {
      setEditingItem(null); setDraftName("");
    }
  }, [editingItem, project.groups, project.measurements, project.parts]);

  useEffect(() => {
    const nextKnownGroupIds = new Set(project.groups.map((group) => group.id));
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      let changed = false;
      project.groups.forEach((group) => {
        if (!knownGroupIdsRef.current.has(group.id)) { next.add(group.id); changed = true; }
      });
      Array.from(next).forEach((groupId) => {
        if (!nextKnownGroupIds.has(groupId)) { next.delete(groupId); changed = true; }
      });
      return changed ? next : current;
    });
    knownGroupIdsRef.current = nextKnownGroupIds;
  }, [project.groups]);

  function beginRenamePart(partId: string, currentName: string) {
    setEditingItem({ kind: "part", id: partId }); setDraftName(currentName); selectPart(partId);
  }
  function beginRenameGroup(groupId: string, currentName: string) {
    setEditingItem({ kind: "group", id: groupId }); setDraftName(currentName); selectPart(null);
  }
  function beginRenameMeasurement(measurementId: string, currentName: string) {
    setEditingItem({ kind: "measurement", id: measurementId }); setDraftName(currentName); selectMeasurement(measurementId);
  }

  function commitRename() {
    if (!editingItem) return;
    const nextName = draftName.trim();
    if (nextName && editingItem.kind === "part") updatePart(editingItem.id, (part) => ({ ...part, name: nextName }));
    if (nextName && editingItem.kind === "measurement") updateMeasurement(editingItem.id, (m) => ({ ...m, name: nextName }));
    if (nextName && editingItem.kind === "group") updateGroupName(editingItem.id, nextName);
    setEditingItem(null); setDraftName("");
  }

  function groupChildren(groupId: string | null): GroupNode[] {
    return project.groups.filter((group) => group.parentGroupId === groupId);
  }
  function partChildren(groupId: string | null): PartNode[] {
    return project.parts.filter((part) => part.groupId === groupId);
  }
  function measurementChildren(groupId: string | null): MeasurementNode[] {
    return project.measurements.filter((measurement) => measurement.groupId === groupId);
  }

  function parseDraggedItem(event: DragEvent): DraggedTreeItem | null {
    const payload = event.dataTransfer.getData(TREE_DRAG_MIME);
    if (!payload) return null;
    try {
      const parsed = JSON.parse(payload) as DraggedTreeItem;
      return parsed.kind === "part" || parsed.kind === "group" || parsed.kind === "measurement" ? parsed : null;
    } catch { return null; }
  }

  function getDraggedItem(event: DragEvent): DraggedTreeItem | null {
    return draggingItem ?? parseDraggedItem(event);
  }

  function canDropOnGroup(item: DraggedTreeItem | null, groupId: string): boolean {
    if (!item) return false;
    if (item.kind === "part") return project.parts.some((part) => part.id === item.id);
    if (item.kind === "measurement") return project.measurements.some((m) => m.id === item.id);
    return item.id !== groupId && !isGroupDescendant(project.groups, groupId, item.id);
  }

  function isEventOnObjectRow(event: DragEvent): boolean {
    return event.target instanceof Element && Boolean(event.target.closest(".object-row"));
  }

  function beginDrag(event: DragEvent, item: DraggedTreeItem) {
    event.stopPropagation();
    setDraggingItem(item);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TREE_DRAG_MIME, JSON.stringify(item));
  }

  function endDrag() { setDraggingItem(null); setDropTarget(null); }

  function dropItemIntoGroup(item: DraggedTreeItem, groupId: string) {
    if (item.kind === "part") { movePartToGroup(item.id, groupId); return; }
    if (item.kind === "measurement") { moveMeasurementToGroup(item.id, groupId); return; }
    moveGroupToGroup(item.id, groupId);
  }

  function dropItemAtRoot(item: DraggedTreeItem) {
    if (item.kind === "part") { movePartToGroup(item.id, null); return; }
    if (item.kind === "measurement") { moveMeasurementToGroup(item.id, null); return; }
    moveGroupToGroup(item.id, null);
  }

  function handleGroupDragOver(event: DragEvent, groupId: string) {
    const item = getDraggedItem(event);
    if (!canDropOnGroup(item, groupId)) return;
    event.preventDefault(); event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(groupId);
  }

  function handleGroupDrop(event: DragEvent, groupId: string) {
    const item = getDraggedItem(event);
    event.preventDefault(); event.stopPropagation();
    if (item && canDropOnGroup(item, groupId)) dropItemIntoGroup(item, groupId);
    endDrag();
  }

  function handleRootDragOver(event: DragEvent) {
    const item = getDraggedItem(event);
    if (!item || isEventOnObjectRow(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget("root");
  }

  function handleRootDrop(event: DragEvent) {
    const item = getDraggedItem(event);
    if (!item || isEventOnObjectRow(event)) return;
    event.preventDefault();
    dropItemAtRoot(item);
    endDrag();
  }

  function toggleGroupExpanded(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function renderNameEditor(kind: "part" | "group" | "measurement", id: string, name: string) {
    if (editingItem?.kind === kind && editingItem.id === id) {
      return (
        <input
          autoFocus
          className="object-row__name-input"
          type="text"
          value={draftName}
          onBlur={commitRename}
          onChange={(event) => setDraftName(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); commitRename(); }
            if (event.key === "Escape") { event.preventDefault(); setEditingItem(null); setDraftName(""); }
          }}
        />
      );
    }
    return (
      <button
        className="object-row__name-button"
        onClick={(event) => {
          event.stopPropagation();
          if (kind === "part") beginRenamePart(id, name);
          else if (kind === "measurement") beginRenameMeasurement(id, name);
          else beginRenameGroup(id, name);
        }}
        type="button"
      >
        <strong>{name}</strong>
      </button>
    );
  }

  function isAncestorGroupHidden(groupId: string | null): boolean {
    let current = groupId ? project.groups.find((g) => g.id === groupId) : null;
    while (current) {
      if (current.hidden) return true;
      current = current.parentGroupId ? project.groups.find((g) => g.id === current!.parentGroupId) ?? null : null;
    }
    return false;
  }

  function renderVisibilityButton(hidden: boolean | undefined, onToggle: (event: React.MouseEvent) => void, label: string) {
    return (
      <button
        aria-label={label}
        className={`object-row__eye ${hidden ? "object-row__eye--hidden" : ""}`}
        onClick={(event) => { event.stopPropagation(); onToggle(event); }}
        onDragStart={(event) => event.preventDefault()}
        title={hidden ? "Show" : "Hide"}
        type="button"
      >
        {hidden ? <EyeOffIcon width={13} height={13} /> : <EyeIcon width={13} height={13} />}
      </button>
    );
  }

  function renderMeasurement(measurement: MeasurementNode, depth: number) {
    const isDragging = draggingItem?.kind === "measurement" && draggingItem.id === measurement.id;
    const effectivelyHidden = measurement.hidden || isAncestorGroupHidden(measurement.groupId);
    return (
      <div
        key={measurement.id}
        className={`object-row ${selectedMeasurementId === measurement.id ? "object-row--selected" : ""} ${isDragging ? "object-row--dragging" : ""} ${effectivelyHidden ? "object-row--hidden" : ""}`}
        draggable
        onClick={() => selectMeasurement(measurement.id)}
        onDragEnd={endDrag}
        onDragStart={(event) => beginDrag(event, { kind: "measurement", id: measurement.id })}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectMeasurement(measurement.id); } }}
        role="button"
        style={{ paddingLeft: `${0.88 + depth * 1.2}rem` }}
        tabIndex={0}
      >
        <span className="object-row__disclosure object-row__disclosure--placeholder" />
        <span className="object-row__icon"><RulerIcon width={14} height={14} /></span>
        <span className="object-row__content">{renderNameEditor("measurement", measurement.id, measurement.name)}</span>
        {renderVisibilityButton(measurement.hidden, () => toggleMeasurementVisibility(measurement.id), measurement.hidden ? `Show ${measurement.name}` : `Hide ${measurement.name}`)}
      </div>
    );
  }

  function renderPart(part: PartNode, depth: number) {
    const isDragging = draggingItem?.kind === "part" && draggingItem.id === part.id;
    const effectivelyHidden = part.hidden || isAncestorGroupHidden(part.groupId);
    return (
      <div
        key={part.id}
        className={`object-row ${selectedPartId === part.id ? "object-row--selected" : ""} ${isDragging ? "object-row--dragging" : ""} ${effectivelyHidden ? "object-row--hidden" : ""}`}
        draggable
        onClick={() => selectPart(part.id)}
        onDragEnd={endDrag}
        onDragStart={(event) => beginDrag(event, { kind: "part", id: part.id })}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectPart(part.id); } }}
        role="button"
        style={{ paddingLeft: `${0.88 + depth * 1.2}rem` }}
        tabIndex={0}
      >
        <span className="object-row__disclosure object-row__disclosure--placeholder" />
        <span className="object-row__icon"><PartTypeIcon objectType={part.objectType} /></span>
        <span className="object-row__content">{renderNameEditor("part", part.id, part.name)}</span>
        {renderVisibilityButton(part.hidden, () => togglePartVisibility(part.id), part.hidden ? `Show ${part.name}` : `Hide ${part.name}`)}
      </div>
    );
  }

  function renderGroup(group: GroupNode, depth: number) {
    const childrenGroups = groupChildren(group.id);
    const childrenParts = partChildren(group.id);
    const childrenMeasurements = measurementChildren(group.id);
    const hasChildren = childrenGroups.length > 0 || childrenParts.length > 0 || childrenMeasurements.length > 0;
    const isExpanded = expandedGroupIds.has(group.id);
    const isDragging = draggingItem?.kind === "group" && draggingItem.id === group.id;
    const isDropTarget = dropTarget === group.id;

    return (
      <div className="object-tree__group" key={group.id}>
        <div
          className={`object-row object-row--group ${isDragging ? "object-row--dragging" : ""} ${isDropTarget ? "object-row--drop-target" : ""} ${group.hidden ? "object-row--hidden" : ""}`}
          draggable
          onDragEnd={endDrag}
          onDragLeave={() => { if (dropTarget === group.id) setDropTarget(null); }}
          onDragOver={(event) => handleGroupDragOver(event, group.id)}
          onDragStart={(event) => beginDrag(event, { kind: "group", id: group.id })}
          onDrop={(event) => handleGroupDrop(event, group.id)}
          style={{ paddingLeft: `${0.88 + depth * 1.2}rem` }}
        >
          {hasChildren ? (
            <button
              aria-label={isExpanded ? `Collapse ${group.name}` : `Expand ${group.name}`}
              className="object-row__disclosure"
              onClick={(event) => { event.stopPropagation(); toggleGroupExpanded(group.id); }}
              onDragStart={(event) => event.preventDefault()}
              type="button"
            >
              {isExpanded ? <ChevronDownIcon width={13} height={13} /> : <ChevronRightIcon width={13} height={13} />}
            </button>
          ) : (
            <span className="object-row__disclosure object-row__disclosure--placeholder" />
          )}
          <span className="object-row__icon object-row__icon--group"><FolderIcon width={14} height={14} /></span>
          <span className="object-row__content">{renderNameEditor("group", group.id, group.name)}</span>
          {renderVisibilityButton(group.hidden, () => toggleGroupVisibility(group.id), group.hidden ? `Show folder ${group.name}` : `Hide folder ${group.name}`)}
        </div>
        {isExpanded ? childrenGroups.map((childGroup) => renderGroup(childGroup, depth + 1)) : null}
        {isExpanded ? childrenParts.map((part) => renderPart(part, depth + 1)) : null}
        {isExpanded ? childrenMeasurements.map((measurement) => renderMeasurement(measurement, depth + 1)) : null}
      </div>
    );
  }

  const rootGroups = groupChildren(null);
  const rootParts = partChildren(null);
  const rootMeasurements = measurementChildren(null);
  const hasVisibleItems = rootGroups.length > 0 || rootParts.length > 0 || rootMeasurements.length > 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tabs__tab ${activeTab === "objects" ? "sidebar-tabs__tab--active" : ""}`}
          onClick={() => { setActiveTab("objects"); selectMaterial(null); }}
          type="button"
        >
          Objects
        </button>
        <button
          className={`sidebar-tabs__tab ${activeTab === "material" ? "sidebar-tabs__tab--active" : ""}`}
          onClick={() => setActiveTab("material")}
          type="button"
        >
          Material
        </button>
      </div>

      {activeTab === "objects" ? (
        <section className="panel-card browser-card">
          <div className="browser-card__header">
            <div>
              <span className="panel-card__title">Objects</span>
              <p className="browser-card__subtitle">
                {project.parts.length + project.measurements.length} objects · {project.groups.length} groups
              </p>
            </div>
            <button
              aria-label="Create group"
              className="browser-card__header-action"
              onClick={() => addGroup()}
              title="Create group"
              type="button"
            >
              <FolderIcon width={16} height={16} />
            </button>
          </div>

          <div
            className={`object-browser ${dropTarget === "root" ? "object-browser--drop-target" : ""}`}
            onDragLeave={(event) => { if (event.currentTarget === event.target && dropTarget === "root") setDropTarget(null); }}
            onDragOver={handleRootDragOver}
            onDrop={handleRootDrop}
          >
            {hasVisibleItems ? (
              <>
                {rootGroups.map((group) => renderGroup(group, 0))}
                {rootParts.map((part) => renderPart(part, 0))}
                {rootMeasurements.map((measurement) => renderMeasurement(measurement, 0))}
              </>
            ) : (
              <p className="panel-card__empty">No objects or groups yet.</p>
            )}
          </div>
        </section>
      ) : (
        <MaterialPanel />
      )}
    </aside>
  );
}
