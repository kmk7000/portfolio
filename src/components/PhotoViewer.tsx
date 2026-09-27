import { useCallback, useEffect, useRef, useState } from "react";

/* 사진 여러 장이 들어 있는 글을 눌렀을 때 크게 넘겨 보는 화면입니다. (원본 PhotoViewer.tsx)
   ←/→ 로 넘기고 Esc 로 닫습니다. 닫으면 열기 전에 누른 자리로 초점을 돌려 둡니다. */
export default function PhotoViewer({
  srcs,
  caption,
  captions,
  startIndex = 0,
  onClose
}: {
  srcs: string[];
  caption?: string;
  /* 사진마다 설명이 따로 있으면 넘깁니다. 없으면 caption 을 모든 사진에 씁니다. */
  captions?: string[];
  startIndex?: number;
  onClose: () => void;
}) {
  const total = srcs.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0)));
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex(prev => (prev + delta + total) % total);
    },
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  /* 열려 있는 동안 뒤쪽 화면이 같이 굴러가지 않게 잠그고, 닫기 버튼으로 초점을 옮깁니다. */
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  if (total === 0) return null;

  const current = captions?.[index] || caption;

  return (
    <div className="cy-viewer" role="dialog" aria-modal="true" aria-label={caption || "사진"} onClick={onClose}>
      <div className="cy-viewer-box" onClick={e => e.stopPropagation()}>
        <div className="cy-viewer-head">
          <span className="cy-viewer-caption">{current || "사진"}</span>
          <span className="cy-viewer-count">
            {index + 1} / {total}
          </span>
          <button type="button" className="cy-viewer-close" onClick={onClose} aria-label="닫기" ref={closeRef}>
            ×
          </button>
        </div>

        <div className="cy-viewer-stage">
          {total > 1 ? (
            <button type="button" className="cy-viewer-nav is-prev" onClick={() => go(-1)} aria-label="이전 사진">
              ‹
            </button>
          ) : null}
          <img src={srcs[index]} alt={captions?.[index] || (caption ? `${caption} ${index + 1}` : `사진 ${index + 1}`)} />
          {total > 1 ? (
            <button type="button" className="cy-viewer-nav is-next" onClick={() => go(1)} aria-label="다음 사진">
              ›
            </button>
          ) : null}
        </div>

        {total > 1 ? (
          <div className="cy-viewer-strip">
            {srcs.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                className={`cy-viewer-thumb${i === index ? " is-on" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}번째 사진`}
                aria-current={i === index ? "true" : undefined}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
