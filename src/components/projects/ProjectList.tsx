import type { MouseEvent } from "react";
import type { Project } from "../../config/site.ts";
import { asset } from "../../lib/asset.ts";
import StatusBadge from "./StatusBadge.tsx";

/* 프로젝트 목록: 게시판 모양(분류 딱지 + 제목, 한 줄 설명, 기간)에 작은 그림을 더했습니다.
   각 줄은 진짜 주소를 가진 링크라서 새 탭으로 열거나 주소를 복사해 공유할 수 있습니다. */
export default function ProjectList({
  items,
  hrefFor,
  onOpen,
  registerLink
}: {
  items: readonly Project[];
  hrefFor: (id: string) => string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  /* 상세에서 목록으로 돌아올 때 방금 보던 줄로 초점을 돌려 두려고 링크를 기억합니다. */
  registerLink: (id: string, element: HTMLAnchorElement | null) => void;
}) {
  return (
    <ul className="cy-board-list cy-project-list">
      {items.map(project => (
        <li key={project.id} className="cy-board-item">
          <a
            className="cy-board-link"
            href={hrefFor(project.id)}
            onClick={event => onOpen(event, project.id)}
            ref={element => {
              registerLink(project.id, element);
            }}
          >
            <span className="cy-project-thumb" aria-hidden="true">
              {project.cover ? <img src={asset(project.cover)} alt="" loading="lazy" /> : "준비 중"}
            </span>
            <span className="cy-board-text">
              <span className="cy-board-head">
                <span className="cy-board-category">{project.category}</span>
                <StatusBadge status={project.status} />
                <span className="cy-board-title">{project.title}</span>
              </span>
              <span className="cy-board-summary">{project.summary}</span>
              <span className="cy-board-date">{project.period}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
