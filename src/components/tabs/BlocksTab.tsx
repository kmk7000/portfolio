import { useState } from "react";
import { photoBlocks, profile, profileBlocks, type ContentBlock, type TabDef, type TabView } from "../../config/site.ts";
import SectionTitle from "../SectionTitle.tsx";
import BlockList from "../blocks/BlockList.tsx";
import ViewSwitch from "../blocks/ViewSwitch.tsx";

const BLOCKS: Record<string, readonly ContentBlock[]> = {
  profile: profileBlocks,
  photo: photoBlocks
};

/* 보기 전환(목록/앨범/연도별)이 있는 탭입니다. 첫 번째 보기가 기본이고,
   방문자가 고른 보기는 이 화면에서만 잠깐 바뀝니다. */
export default function BlocksTab({
  tab,
  views,
  hideSwitch = false
}: {
  tab: TabDef;
  views: readonly TabView[];
  hideSwitch?: boolean;
}) {
  const [view, setView] = useState<TabView>(views[0]);
  const blocks = BLOCKS[tab.id] ?? [];

  return (
    <div className="cy-content-box">
      <SectionTitle
        title={tab.label}
        sub={hideSwitch ? undefined : <ViewSwitch view={view} options={views} onChange={setView} />}
      />
      {tab.kind === "photo" && profile.photoSubtitle ? <p className="cy-tab-lead">{profile.photoSubtitle}</p> : null}
      <BlockList blocks={blocks} view={view} />
    </div>
  );
}
