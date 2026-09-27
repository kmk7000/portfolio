import type { TabDef } from "../config/site.ts";

/* 다이어리 오른쪽 바깥으로 튀어나온 메뉴 탭입니다. 좁은 화면에서는 CSS 가 가로줄로 바꿉니다.
   방향키는 미니룸 캐릭터 이동에 쓰이므로, 탭 간 이동은 Tab 키로 하는 버튼 목록으로 둡니다. */
export default function TabNav({
  tabs,
  activeId,
  onSelect
}: {
  tabs: readonly TabDef[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="cy-tabs" aria-label="미니홈피 메뉴">
      {tabs.map(tab => {
        const active = tab.id === activeId;
        return (
          <div key={tab.id} className="cy-tab-slot">
            <button
              type="button"
              className={"cy-tab-btn " + (active ? "active" : "")}
              aria-current={active ? "page" : undefined}
              aria-controls="cy-tab-panel"
              onClick={() => onSelect(tab.id)}
            >
              <span className="cy-tab-line">{tab.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
