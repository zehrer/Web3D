import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function PanelLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9 4.5v15" />
    </BaseIcon>
  );
}

export function PanelRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M15 4.5v15" />
    </BaseIcon>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 4.5h11l3 3v12H5z" />
      <path d="M8 4.5v5h7v-5" />
      <path d="M8 19.5v-6h8v6" />
    </BaseIcon>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4.5v10" />
      <path d="m8.5 11 3.5 3.5 3.5-3.5" />
      <path d="M5 16.5v3h14v-3" />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function MoveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="m12 3 2.5 2.5M12 3 9.5 5.5M12 21l2.5-2.5M12 21l-2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />
    </BaseIcon>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 8a6 6 0 1 0 1.2 6.6" />
      <path d="M16 4.5v4h4" />
    </BaseIcon>
  );
}

export function ResizeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9h6v6" />
      <path d="m15 9-6 6" />
    </BaseIcon>
  );
}

export function RulerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 17 17 4l3 3L7 20z" />
      <path d="m14 7 1.5 1.5" />
      <path d="m11 10 1.5 1.5" />
      <path d="m8 13 1.5 1.5" />
    </BaseIcon>
  );
}

export function DuplicateIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <rect x="5" y="5" width="10" height="10" rx="2" />
    </BaseIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 12h8l1-12" />
      <path d="M10 11v5M14 11v5" />
    </BaseIcon>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 8H5V4" />
      <path d="M5 8a8 8 0 1 1 2 10.6" />
    </BaseIcon>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 8h4V4" />
      <path d="M19 8a8 8 0 1 0-2 10.6" />
    </BaseIcon>
  );
}

export function HelpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.8 9.4a2.5 2.5 0 1 1 4.4 1.6c-.8.8-1.7 1.3-1.7 2.6" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </BaseIcon>
  );
}

export function CubeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 7 4-7 4-7-4 7-4Z" />
      <path d="m5 7 7 4 7-4" />
      <path d="M5 7v8l7 4 7-4V7" />
      <path d="M12 11v8" />
    </BaseIcon>
  );
}

export function SheetIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.5" y="6.5" width="15" height="11" rx="2" />
      <path d="M7 9h10M7 12h10M7 15h10" />
    </BaseIcon>
  );
}

export function BeamIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 9.5 9 6h10v8l-4 3.5H5z" />
      <path d="M9 6v8M15 9.5v8" />
      <path d="M5 9.5h10" />
    </BaseIcon>
  );
}

export function CladdingIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 8h12l2 3H7z" />
      <path d="M5 13h12l2 3H7z" />
      <path d="M7 11v2M17 11v2" />
    </BaseIcon>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h6l2 2h8v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 7V5.5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2V9" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4.5v2.2M12 17.3v2.2M19.5 12h-2.2M6.7 12H4.5M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6M17.3 17.3l-1.6-1.6M8.3 8.3 6.7 6.7" />
    </BaseIcon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m14.5 6-6 6 6 6" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </BaseIcon>
  );
}

export function PerspectiveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 7 6-3 6 3-6 3-6-3Z" />
      <path d="m6 7 0 7 6 3 6-3V7" />
      <path d="M12 10v7" />
    </BaseIcon>
  );
}

export function TopViewIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9h6v6H9z" />
    </BaseIcon>
  );
}
