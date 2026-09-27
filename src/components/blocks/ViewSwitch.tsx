import type { TabView } from "../../config/site.ts";

const LABELS: Record<TabView, string> = {
  list: "목록보기",
  album: "앨범보기",
  year: "연도별보기"
};

/* 목록 / 앨범 / 연도별 보기를 고르는 작은 글자 버튼입니다. 싸이월드 사진첩의 보기 전환처럼요. */
export default function ViewSwitch({
  view,
  options,
  onChange
}: {
  view: TabView;
  options: readonly TabView[];
  onChange: (next: TabView) => void;
}) {
  return (
    <span className="cy-view-switch" role="group" aria-label="보기 방식">
      {options.map((id, i) => (
        <span key={id}>
          {i > 0 ? (
            <span className="cy-view-sep" aria-hidden="true">
              |
            </span>
          ) : null}
          <button
            type="button"
            className={`cy-view-btn${view === id ? " is-on" : ""}`}
            onClick={() => onChange(id)}
            aria-pressed={view === id}
          >
            {LABELS[id]}
          </button>
        </span>
      ))}
    </span>
  );
}
