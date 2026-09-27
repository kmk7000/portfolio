import type { CSSProperties } from "react";
import { Spiral, type SpiralProps } from "@paper-design/shaders-react";
import { useSite } from "../lib/site-context.tsx";
import { theme } from "../config/theme.ts";

/* 진입 화면 셰이더 배경 설정입니다. 원본 LinkTree.tsx 의 spiralProps 와 같은 값입니다. */
const spiralProps = {
  fit: "none",
  scale: 1.3,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  originX: 0.5,
  originY: 0.5,
  worldWidth: 0,
  worldHeight: 0,
  density: 0.5,
  colorBack: theme.spiralBack,
  colorFront: theme.spiralFront,
  distortion: 0,
  strokeWidth: 0.5,
  strokeTaper: 0,
  strokeCap: 0,
  noise: 1,
  noiseFrequency: 0.25,
  softness: 0,
  speed: 0.75,
  frame: 0,
  maxPixelCount: 1_500_000
} satisfies Partial<SpiralProps>;

const introStyle = {
  "--intro-back": theme.spiralBack,
  "--intro-front": theme.spiralFront,
  "--intro-text": theme.text,
  "--intro-stroke": theme.textStroke,
  "--intro-glow": theme.glow,
  "--intro-button-back": theme.buttonBack,
  "--intro-button-text": theme.buttonText,
  "--display": theme.displayFont,
  "--body": theme.bodyFont
} as CSSProperties;

function ChevronDown({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function IntroOverlay({ onEnter }: { onEnter: () => void }) {
  const { content } = useSite();
  return (
    <div className="lt-intro" style={introStyle} role="dialog" aria-modal="true" aria-labelledby="lt-intro-title">
      <Spiral className="lt-intro-spiral" {...spiralProps} />
      <div className="lt-intro-card">
        <span className="lt-intro-title" id="lt-intro-title">
          {content.profile.introTitle}
        </span>
        <p className="lt-intro-copy">{content.profile.introDescription}</p>
        <button type="button" className="lt-intro-cta" onClick={onEnter}>
          모든 활동 구경하기
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  );
}
