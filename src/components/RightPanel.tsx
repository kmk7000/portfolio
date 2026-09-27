import type { TabDef } from "../config/site.ts";
import { useSite } from "../lib/site-context.tsx";
import EditableText from "./Editable.tsx";
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
    case "custom":
      /* 사진첩과 주인장이 만든 탭은 사진 위주라 앨범/연도별만 씁니다. */
      return <BlocksTab tab={tab} views={["album", "year"]} />;
    case "oekaki":
      return <Oekaki />;
  }
}

/* 주소에 ?admin=1 을 붙였을 때만 제목 옆에 보이는 주인장 메뉴입니다. (원본과 같은 문구)
   원본은 먼저 등록한 사람이 주인이 되지만, 여기서는 정해 둔 구글 계정만 주인장입니다. */
function AdminLinks() {
  const { user, isOwner, editing, setEditing, login, logout } = useSite();
  const google = !!user && !user.isAnonymous;

  return (
    <span className="cy-admin-links">
      {isOwner ? (
        <>
          <span className="cy-admin-me">주인장</span>
          <button
            type="button"
            className={`cy-admin-link${editing ? " is-on" : ""}`}
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "편집 끝" : "편집"}
          </button>
          <button type="button" className="cy-admin-link" onClick={logout}>
            로그아웃
          </button>
        </>
      ) : google ? (
        <>
          <span className="cy-admin-me">주인장 계정이 아니에요</span>
          <button type="button" className="cy-admin-link" onClick={logout}>
            로그아웃
          </button>
        </>
      ) : (
        <button type="button" className="cy-admin-link" onClick={login}>
          주인장 로그인
        </button>
      )}
    </span>
  );
}

/* 다이어리 오른쪽 면: 현재 탭 이름과 주소창 문구, 그 아래 탭 내용(자체 스크롤) */
export default function RightPanel(props: Props) {
  const { content, update, editing, adminMode } = useSite();
  return (
    <div className="cy-right-panel">
      <div className="cy-right-header">
        <span className="cy-title">{props.tab.label}</span>
        {adminMode ? <AdminLinks /> : null}
        <EditableText
          className="cy-url"
          value={content.profile.displayUrl}
          editing={editing}
          placeholder="주소창 문구"
          onSave={displayUrl => update({ profile: { ...content.profile, displayUrl } })}
        />
      </div>

      <div className="cy-right-content" id="cy-tab-panel" aria-label={`${props.tab.label} 내용`} role="region">
        <TabContent key={props.tab.id} {...props} />
      </div>
    </div>
  );
}
