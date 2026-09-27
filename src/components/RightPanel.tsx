import { profile, type TabDef } from "../config/site.ts";
import HomeTab from "./home/HomeTab.tsx";
import BlocksTab from "./tabs/BlocksTab.tsx";
import ProjectsTab from "./tabs/ProjectsTab.tsx";
import Oekaki from "./oekaki/Oekaki.tsx";

type Props = {
  tab: TabDef;
  /* 홈 탭 캐릭터 인사를 띄울 차례인지 */
  greet: boolean;
  onGreeted: () => void;
};

function TabContent({ tab, greet, onGreeted }: Props) {
  switch (tab.kind) {
    case "home":
      return <HomeTab greet={greet} onGreeted={onGreeted} />;
    case "profile":
      /* 프로필은 글 위주라 보기 전환 없이 목록으로만 보여 줍니다. */
      return <BlocksTab tab={tab} views={["list"]} hideSwitch />;
    case "projects":
      return <ProjectsTab tab={tab} />;
    case "photo":
      return <BlocksTab tab={tab} views={["album", "year"]} />;
    case "oekaki":
      return <Oekaki />;
  }
}

/* 다이어리 오른쪽 면: 현재 탭 이름과 주소창 문구, 그 아래 탭 내용(자체 스크롤) */
export default function RightPanel(props: Props) {
  return (
    <div className="cy-right-panel">
      <div className="cy-right-header">
        <span className="cy-title">{props.tab.label}</span>
        <span className="cy-url">{profile.displayUrl}</span>
      </div>

      <div className="cy-right-content" id="cy-tab-panel" aria-label={`${props.tab.label} 내용`} role="region">
        <TabContent key={props.tab.id} {...props} />
      </div>
    </div>
  );
}
