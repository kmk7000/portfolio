import type { TabDef } from "../config/site.ts";
import { moveItem, newId } from "../lib/site-content.ts";
import { useSite } from "../lib/site-context.tsx";

/* 코드가 내용을 관리하는 탭은 지울 수 없습니다. (프로젝트는 src/config/site.ts 로 관리) */
const LOCKED_KINDS = new Set<TabDef["kind"]>(["home", "projects", "oekaki"]);

/* 다이어리 오른쪽 바깥으로 튀어나온 메뉴 탭입니다. 좁은 화면에서는 CSS 가 가로줄로 바꿉니다.
   방향키는 미니룸 캐릭터 이동에 쓰이므로, 탭 간 이동은 Tab 키로 하는 버튼 목록으로 둡니다.
   주인장이 편집 중이면 탭마다 이름 바꾸기·순서·지우기 버튼과 "+ 탭" 이 붙습니다. (원본과 같음) */
export default function TabNav({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  const { content, editing, update } = useSite();
  const tabs = content.tabs;

  const rename = (tab: TabDef) => {
    const label = window.prompt("탭 이름", tab.label)?.trim();
    if (label) update({ tabs: tabs.map(t => (t.id === tab.id ? { ...t, label: label.slice(0, 12) } : t)) });
  };

  const move = (index: number, delta: number) => {
    /* 홈은 맨 앞에 고정합니다. */
    if (index + delta <= 0 || index === 0) return;
    update({ tabs: moveItem(tabs, index, delta) });
  };

  const remove = (tab: TabDef) => {
    if (!window.confirm(`"${tab.label}" 탭을 지울까요? 안에 쓴 내용도 함께 사라집니다.`)) return;
    const blocks = { ...content.blocks };
    delete blocks[tab.id];
    update({ tabs: tabs.filter(t => t.id !== tab.id), blocks });
    if (activeId === tab.id) onSelect(tabs[0].id);
  };

  const add = () => {
    const tab: TabDef = { id: newId("tab"), label: "새 탭", kind: "custom", view: "album" };
    update({ tabs: [...tabs, tab], blocks: { ...content.blocks, [tab.id]: [] } });
    onSelect(tab.id);
  };

  return (
    <nav className="cy-tabs" aria-label="미니홈피 메뉴">
      {tabs.map((tab, index) => {
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
            {editing ? (
              <div className="cy-tab-tools">
                <button type="button" title="탭 이름 바꾸기" aria-label={`${tab.label} 탭 이름 바꾸기`} onClick={() => rename(tab)}>
                  ✎
                </button>
                {index > 0 ? (
                  <>
                    <button type="button" title="위로" aria-label={`${tab.label} 탭 위로`} onClick={() => move(index, -1)}>
                      ↑
                    </button>
                    <button type="button" title="아래로" aria-label={`${tab.label} 탭 아래로`} onClick={() => move(index, 1)}>
                      ↓
                    </button>
                  </>
                ) : null}
                {LOCKED_KINDS.has(tab.kind) ? null : (
                  <button type="button" title="탭 지우기" aria-label={`${tab.label} 탭 지우기`} onClick={() => remove(tab)}>
                    ✕
                  </button>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
      {editing ? (
        <button type="button" className="cy-tab-add" onClick={add}>
          + 탭
        </button>
      ) : null}
    </nav>
  );
}
