import { useState } from "react";
import type { ContentBlock, TabDef, TabView } from "../../config/site.ts";
import { useSite } from "../../lib/site-context.tsx";
import EditableText from "../Editable.tsx";
import SectionTitle from "../SectionTitle.tsx";
import BlockList from "../blocks/BlockList.tsx";
import ViewSwitch from "../blocks/ViewSwitch.tsx";

/* 보기 전환(목록/앨범/연도별)이 있는 탭입니다. (프로필·사진첩·직접 만든 탭)
   - 방문자가 고른 보기는 이 화면에서만 잠깐 바뀝니다.
   - 주인장이 편집 중에 고르면 그 탭의 기본 보기로 저장됩니다. (원본과 같음) */
export default function BlocksTab({
  tab,
  views,
  hideSwitch = false
}: {
  tab: TabDef;
  views: readonly TabView[];
  hideSwitch?: boolean;
}) {
  const { content, update, editing } = useSite();
  const saved = tab.view && views.includes(tab.view) ? tab.view : views[0];
  const [localView, setLocalView] = useState<TabView | null>(null);
  const view = localView && views.includes(localView) ? localView : saved;
  const blocks = content.blocks[tab.id] ?? [];

  const changeView = (next: TabView) => {
    setLocalView(next);
    if (editing) update({ tabs: content.tabs.map(t => (t.id === tab.id ? { ...t, view: next } : t)) });
  };

  const setBlocks = (next: ContentBlock[]) => update({ blocks: { ...content.blocks, [tab.id]: next } });

  return (
    <div className="cy-content-box">
      <SectionTitle
        title={tab.label}
        sub={
          hideSwitch ? undefined : (
            <>
              <ViewSwitch view={view} options={views} onChange={changeView} />
              {editing ? <span className="cy-view-note">(기본 보기로 저장됨)</span> : null}
            </>
          )
        }
      />
      {tab.kind === "photo" && (content.profile.photoSubtitle || editing) ? (
        <EditableText
          as="p"
          className="cy-tab-lead"
          value={content.profile.photoSubtitle}
          editing={editing}
          placeholder="사진첩 설명"
          onSave={photoSubtitle => update({ profile: { ...content.profile, photoSubtitle } })}
        />
      ) : null}
      <BlockList blocks={blocks} view={view} editing={editing} onChange={setBlocks} />
    </div>
  );
}
