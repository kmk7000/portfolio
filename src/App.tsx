import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "./lib/asset.ts";
import { resolveTab } from "./lib/blocks.ts";
import { PROJECT_PARAM, projectSearch } from "./lib/projects.ts";
import { useSite } from "./lib/site-context.tsx";
import IntroOverlay from "./components/IntroOverlay.tsx";
import LeftPanel from "./components/LeftPanel.tsx";
import RightPanel from "./components/RightPanel.tsx";
import TabNav from "./components/TabNav.tsx";
import type { BgmHandle } from "./components/BgmPlayer.tsx";

/* 배경 사진은 CSS url() 대신 인라인으로 넣습니다. 하위 경로 배포에서도 경로가 맞습니다. */
const rootStyle = {
  backgroundImage:
    "linear-gradient(180deg, rgba(10,5,18,0.4), rgba(10,5,18,0.6)), " +
    `url(${asset("/assets/cyberpunk-pixel-bg.jpg")})`
};

/* ?tab=profile 처럼 탭 딥링크로 들어오면 진입 화면을 건너뜁니다. (원본과 같은 동작) */
function readTabParam(): string | null {
  return new URLSearchParams(window.location.search).get("tab");
}

export default function App() {
  const { content, adminMode } = useSite();
  const tabs = content.tabs;
  const [deepLink] = useState(readTabParam);
  const [activeTabId, setActiveTabId] = useState(() => resolveTab(deepLink, tabs).id);
  /* 주인장 메뉴(?admin=1)로 들어와도 인트로를 건너뜁니다. (원본과 같은 동작) */
  const [introSkipped, setIntroSkipped] = useState(deepLink !== null || adminMode);
  /* 미니홈피에 처음 들어온 순간(인트로를 지나거나 홈 딥링크로 들어온 순간) 캐릭터가 인사합니다. */
  const [greetPending, setGreetPending] = useState(
    () => deepLink !== null && resolveTab(deepLink, tabs).kind === "home"
  );
  const bgmRef = useRef<BgmHandle>(null);

  /* 저장된 탭 목록이 늦게 도착해 딥링크 탭이 그때 생길 수 있어, 처음 고른 탭을 다시 맞춥니다. */
  const activeTab = tabs.find(t => t.id === activeTabId) ?? resolveTab(deepLink, tabs);

  /* 인트로가 떠 있는 동안에는 뒤쪽이 스크롤되지 않게 막습니다. */
  useEffect(() => {
    if (introSkipped) return;
    document.body.classList.add("lt-intro-open");
    return () => document.body.classList.remove("lt-intro-open");
  }, [introSkipped]);

  const enter = () => {
    setIntroSkipped(true);
    setGreetPending(true);
    /* 클릭 안에서 재생을 걸어야 브라우저가 소리를 허용합니다. 재생에 실패해도
       진입은 막히지 않도록 화면 전환을 먼저 걸어 둡니다. */
    try {
      bgmRef.current?.start();
    } catch (error) {
      console.warn("[BGM] 재생을 시작하지 못했습니다.", error);
    }
  };

  const greeted = useCallback(() => setGreetPending(false), []);

  /* 프로젝트 상세를 보다가 다른 탭으로 옮기면 주소에 남은 ?project= 를 지웁니다.
     그래야 새로고침했을 때 보던 탭이 그대로 열립니다. */
  const selectTab = (id: string) => {
    setActiveTabId(id);
    const { pathname, search, hash } = window.location;
    if (new URLSearchParams(search).has(PROJECT_PARAM)) {
      window.history.replaceState(null, "", pathname + projectSearch(search, id, null) + hash);
    }
  };

  /* 본문을 항상 그려 두고 인트로를 그 위에 덮습니다. BGM 플레이어가 미리 준비되어 있어야
     인트로 클릭 한 번으로 재생이 시작됩니다. */
  return (
    <div className="cy-root" style={rootStyle}>
      <div className="cy-background-pattern" aria-hidden="true"></div>

      {/* 인트로가 덮고 있는 동안 뒤쪽 요소로 초점이 가지 않게 합니다. */}
      <div className="cy-book-wrapper" inert={!introSkipped}>
        <div className="cy-book-outer">
          {/* 바인더 링 */}
          <div className="cy-bindings" aria-hidden="true">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="cy-ring"></div>
            ))}
          </div>

          <div className="cy-book-inner">
            <LeftPanel bgmRef={bgmRef} />
            <RightPanel tab={activeTab} greet={greetPending} onGreeted={greeted} />
            <TabNav activeId={activeTab.id} onSelect={selectTab} />
          </div>
        </div>
      </div>

      {!introSkipped ? <IntroOverlay onEnter={enter} /> : null}
    </div>
  );
}
