import { useEffect, useState } from "react";
import { BeamIcon, FolderIcon, SheetIcon } from "./Icons";
import { getObjectTypeLabel } from "../lib/profiles";
import { toDisplayUnits, UNIT_DEFINITIONS } from "../lib/units";
import { useEditorStore } from "../store/editorStore";
import type { GroupNode, PartNode, UnitPreference } from "../types/model";

type EditingItem = { kind: "part" | "group"; id: string } | null;

function formatObjectSize(valueMm: number, unitPreference: UnitPreference): string {
  return `${Number(toDisplayUnits(valueMm, unitPreference).toFixed(1))} ${UNIT_DEFINITIONS[unitPreference].shortLabel}`;
}

function isGroupDescendant(groups: GroupNode[], candidateGroupId: string, ancestorGroupId: string): boolean {
  let current = groups.find((group) => group.id === candidateGroupId);

  while (current?.parentGroupId) {
    if (current.parentGroupId === ancestorGroupId) {
      return true;
    }

    current = groups.find((group) => group.id === current?.parentGroupId);
  }

  return false;
}

function groupDepth(groups: GroupNode[], group: GroupNode): number {
  let depth = 0;
  let current = group.parentGroupId ? groups.find((entry) => entry.id === group.parentGroupId) : undefined;

  while (current) {
    depth += 1;
    current = current.parentGroupId ? groups.find((entry) => entry.id === current?.parentGroupId) : undefined;
  }

  return depth;
}

export function ProjectSidebar() {
  const [editingItem, setEditingItem] = useState<EditingItem>(null);
  const [draftName, setDraftName] = useState("");
  const project = useEditorStore((state) => state.project);
  const selectedPartId = useEditorStore((state) => state.selectedPartId);
  const selectPart = useEditorStore((state) => state.selectPart);
  const addGroup = useEditorStore((state) => state.addGroup);
  const updatePart = useEditorStore((state) => state.updatePart);
  const updateGroupName = useEditorStore((state) => state.updateGroupName);
  const movePartToGroup = useEditorStore((state) => state.movePartToGroup);
  const moveGroupToGroup = useEditorStore((state) => state.moveGroupToGroup);
  const unitPreference = project.unitPreference;

  useEffect(() => {
    if (editingItem?.kind === "part" && !project.parts.some((part) => part.id === editingItem.id)) {
      setEditingItem(null);
      setDraftName("");
    }

    if (editingItem?.kind === "group" && !project.groups.some((group) => group.id === editingItem.id)) {
      setEditingItem(null);
      setDraftName("");
    }
  }, [editingItem, project.groups, project.parts]);

  function beginRenamePart(partId: string, currentName: string) {
    setEditingItem({ kind: "part", id: partId });
    setDraftName(currentName);
    selectPart(partId);
  }

  function beginRenameGroup(groupId: string, currentName: string) {
    setEditingItem({ kind: "group", id: groupId });
    setDraftName(currentName);
    selectPart(null);
  }

  function commitRename() {
    if (!editingItem) {
      return;
    }

    const nextName = draftName.trim();
    if (nextName && editingItem.kind === "part") {
      updatePart(editingItem.id, (part) => ({
        ...part,
        name: nextName,
      }));
    }

    if (nextName && editingItem.kind === "group") {
      updateGroupName(editingItem.id, nextName);
    }

    setEditingItem(null);
    setDraftName("");
  }

  function groupChildren(groupId: string | null): GroupNode[] {
    return project.groups.filter((group) => group.parentGroupId === groupId);
  }

  function partChildren(groupId: string | null): PartNode[] {
    return project.parts.filter((part) => part.groupId === groupId);
  }

  function renderGroupOptions(excludeGroupId?: string) {
    return project.groups
      .filter((group) => group.id !== excludeGroupId && (!excludeGroupId || !isGroupDescendant(project.groups, group.id, excludeGroupId)))
      .map((group) => (
        <option key={group.id} value={group.id}>
          {"--".repeat(groupDepth(project.groups, group))} {group.name}
        </option>
      ));
  }

  function renderNameEditor(kind: "part" | "group", id: string, name: string) {
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
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setEditingItem(null);
              setDraftName("");
            }
          }}
        />
      );
    }

    return (
      <button
        className="object-row__name-button"
        onClick={(event) => {
          event.stopPropagation();
          if (kind === "part") {
            beginRenamePart(id, name);
          } else {
            beginRenameGroup(id, name);
          }
        }}
        type="button"
      >
        <strong>{name}</strong>
      </button>
    );
  }

  function renderPart(part: PartNode, depth: number) {
    return (
      <div
        key={part.id}
        className={`object-row ${selectedPartId === part.id ? "object-row--selected" : ""}`}
        onClick={() => selectPart(part.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectPart(part.id);
          }
        }}
        role="button"
        style={{ paddingLeft: `${0.88 + depth * 1.2}rem` }}
        tabIndex={0}
      >
        <span className="object-row__icon">
          {part.objectType === "sheet" ? <SheetIcon width={15} height={15} /> : <BeamIcon width={15} height={15} />}
        </span>
        <span className="object-row__content">
          {renderNameEditor("part", part.id, part.name)}
          <small>
            {getObjectTypeLabel(part.objectType)} · {formatObjectSize(part.size.x, unitPreference)}
          </small>
        </span>
        <select
          aria-label={`Move ${part.name} to group`}
          className="object-row__group-select"
          value={part.groupId ?? ""}
          onChange={(event) => movePartToGroup(part.id, event.target.value || null)}
          onClick={(event) => event.stopPropagation()}
        >
          <option value="">No group</option>
          {renderGroupOptions()}
        </select>
      </div>
    );
  }

  function renderGroup(group: GroupNode, depth: number) {
    const childrenGroups = groupChildren(group.id);
    const childrenParts = partChildren(group.id);
    const childCount = project.parts.filter((part) => part.groupId === group.id).length + childrenGroups.length;

    return (
      <div className="object-tree__group" key={group.id}>
        <div className="object-row object-row--group" style={{ paddingLeft: `${0.88 + depth * 1.2}rem` }}>
          <span className="object-row__icon object-row__icon--group">
            <FolderIcon width={15} height={15} />
          </span>
          <span className="object-row__content">
            {renderNameEditor("group", group.id, group.name)}
            <small>{childCount} direct items</small>
          </span>
          <select
            aria-label={`Move ${group.name} to parent group`}
            className="object-row__group-select"
            value={group.parentGroupId ?? ""}
            onChange={(event) => moveGroupToGroup(group.id, event.target.value || null)}
            onClick={(event) => event.stopPropagation()}
          >
            <option value="">Root</option>
            {renderGroupOptions(group.id)}
          </select>
        </div>
        {childrenGroups.map((childGroup) => renderGroup(childGroup, depth + 1))}
        {childrenParts.map((part) => renderPart(part, depth + 1))}
      </div>
    );
  }

  const rootGroups = groupChildren(null);
  const rootParts = partChildren(null);
  const hasVisibleItems = rootGroups.length > 0 || rootParts.length > 0;

  return (
    <aside className="sidebar">
      <section className="panel-card browser-card">
        <div className="browser-card__header">
          <div>
            <span className="panel-card__title">Objects</span>
            <p className="browser-card__subtitle">
              {project.parts.length} objects · {project.groups.length} groups
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

        <div className="object-browser">
          {hasVisibleItems ? (
            <>
              {rootGroups.map((group) => renderGroup(group, 0))}
              {rootParts.map((part) => renderPart(part, 0))}
            </>
          ) : (
            <p className="panel-card__empty">No objects or groups yet.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
