/* 낙서장 도구 아이콘입니다. 원본 Oekaki.tsx(MIT)의 SVG 를 그대로 옮겼습니다. */
import type { ReactNode } from "react";

function Icon({ children, strokeWidth = 2.2, flip = false }: { children: ReactNode; strokeWidth?: number; flip?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      {children}
    </svg>
  );
}

export const PenIcon = () => (
  <Icon>
    <path d="M12 19h8" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </Icon>
);

export const EraserIcon = () => (
  <Icon>
    <path d="M8 20H21" />
    <path d="M15.5 4.5 5 15a2.1 2.1 0 0 0 0 3l3 3h5l7.5-7.5a2.1 2.1 0 0 0 0-3l-2-2a2.1 2.1 0 0 0-3 0Z" />
  </Icon>
);

export const BucketIcon = () => (
  <Icon strokeWidth={2}>
    <path d="M8 3.5 3.8 7.7a2 2 0 0 0 0 2.8l5.7 5.7a2 2 0 0 0 2.8 0l4.2-4.2Z" />
    <path d="M6 5.5 12.5 12" />
    <path d="M20 13.5s2 2.6 2 4a2 2 0 1 1-4 0c0-1.4 2-4 2-4Z" />
  </Icon>
);

export const PickIcon = () => (
  <Icon>
    <path d="m19 3-1.5 1.5" />
    <path d="M17.5 4.5 20 7l-8.5 8.5-3.5 1 1-3.5Z" />
    <path d="M6 16.5 3.5 19 5 20.5 7.5 18" />
  </Icon>
);

export const LineIcon = () => (
  <Icon>
    <path d="M4 20 20 4" />
  </Icon>
);

export const RectIcon = () => (
  <Icon>
    <rect x="4" y="6" width="16" height="12" rx="1" />
  </Icon>
);

export const EllipseIcon = () => (
  <Icon>
    <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />
  </Icon>
);

export const BlurIcon = () => (
  <Icon strokeWidth={2}>
    <path d="M12 3.5c3.5 4 5.5 6.6 5.5 9a5.5 5.5 0 0 1-11 0c0-2.4 2-5 5.5-9Z" opacity="0.55" />
    <path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5" />
  </Icon>
);

export const UndoIcon = ({ flip = false }: { flip?: boolean }) => (
  <Icon flip={flip}>
    <path d="M3 7v6h6" />
    <path d="M3.5 13a9 9 0 1 0 2.3-6.4L3 9" />
  </Icon>
);
