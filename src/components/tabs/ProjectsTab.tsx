import { useEffect, useRef, useState, type MouseEvent } from "react";
import { profile, projects, type TabDef } from "../../config/site.ts";
import { PROJECT_PARAM, findProject, projectSearch } from "../../lib/projects.ts";
import SectionTitle from "../SectionTitle.tsx";
import ProjectDetail from "../projects/ProjectDetail.tsx";
import ProjectList from "../projects/ProjectList.tsx";

/* 이 탭이 history 에 쌓은 항목이라는 표시입니다. 목록으로 돌아갈 때 뒤로 가기를 쓸지 정합니다. */
const HISTORY_KEY = "cyProject";

type FocusTarget = { kind: "detail" } | { kind: "list"; id: string };

function projectIdInUrl(): string | null {
  return findProject(projects, new URLSearchParams(window.location.search).get(PROJECT_PARAM))?.id ?? null;
}

function urlFor(tabId: string, projectId: string | null): string {
  const { pathname, search, hash } = window.location;
  return pathname + projectSearch(search, tabId, projectId) + hash;
}

/* 가운데 클릭이나 Ctrl/⌘ 클릭(새 탭으로 열기)은 브라우저에 맡깁니다. */
function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/* 프로젝트 탭: 목록과 상세를 오갑니다. 상세는 ?tab=projects&project=<id> 주소를 가져서
   공유할 수 있고, 브라우저 뒤로 가기를 누르면 목록으로 돌아옵니다. */
export default function ProjectsTab({ tab }: { tab: TabDef }) {
  const [selectedId, setSelectedId] = useState<string | null>(projectIdInUrl);
  const selectedRef = useRef(selectedId);
  const focusTarget = useRef<FocusTarget | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());

  /* 화면만 바꿉니다. 주소는 부르는 쪽에서 이미 바꿔 두었습니다. */
  const show = (id: string | null) => {
    const previous = selectedRef.current;
    if (id === previous) return;
    focusTarget.current = id ? { kind: "detail" } : previous ? { kind: "list", id: previous } : null;
    selectedRef.current = id;
    setSelectedId(id);
  };

  useEffect(() => {
    const onPopState = () => show(projectIdInUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // show 는 ref 와 setState 만 써서 처음 만든 것을 계속 써도 됩니다.
  }, []);

  /* 방문자가 직접 옮겨 다녔을 때만 초점을 옮깁니다. 처음 딥링크로 들어온 경우는 그대로 둡니다. */
  useEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    if (!target) return;
    if (target.kind === "detail") {
      document.getElementById("cy-tab-panel")?.scrollTo({ top: 0 });
      headingRef.current?.focus();
    } else {
      linkRefs.current.get(target.id)?.focus();
    }
  }, [selectedId]);

  const open = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    window.history.pushState({ [HISTORY_KEY]: id }, "", urlFor(tab.id, id));
    show(id);
  };

  const backToList = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    if (window.history.state?.[HISTORY_KEY]) {
      /* 목록에서 연 상세라면 뒤로 가기와 똑같이 동작합니다. (popstate 가 목록을 보여 줍니다) */
      window.history.back();
    } else {
      window.history.replaceState(null, "", urlFor(tab.id, null));
      show(null);
    }
  };

  const selected = findProject(projects, selectedId);

  return (
    <div className="cy-content-box">
      <SectionTitle title={tab.label} sub={profile.projectsSubtitle} />

      {selected ? (
        <ProjectDetail
          key={selected.id}
          project={selected}
          backHref={urlFor(tab.id, null)}
          onBack={backToList}
          headingRef={headingRef}
        />
      ) : projects.length === 0 ? (
        <div className="cy-empty-box">{profile.projectsEmptyText}</div>
      ) : (
        <ProjectList
          items={projects}
          hrefFor={id => urlFor(tab.id, id)}
          onOpen={open}
          registerLink={(id, element) => {
            if (element) linkRefs.current.set(id, element);
            else linkRefs.current.delete(id);
          }}
        />
      )}
    </div>
  );
}
