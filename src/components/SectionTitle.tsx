import type { ReactNode } from "react";

/* 상자 위 굵은 제목 + 옆의 작은 회색 글씨입니다. (Mini Room 미니룸, What friends say ...) */
export default function SectionTitle({
  title,
  sub,
  children
}: {
  title: ReactNode;
  sub?: ReactNode;
  /* 제목 줄 끝에 붙는 작은 버튼 같은 것 */
  children?: ReactNode;
}) {
  return (
    <div className="cy-section-title">
      <span>{title}</span>
      {sub ? <span className="cy-sub-text">{sub}</span> : null}
      {children}
    </div>
  );
}
