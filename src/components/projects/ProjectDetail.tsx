import { useState, type MouseEvent, type Ref } from "react";
import type { Project } from "../../config/site.ts";
import { asset } from "../../lib/asset.ts";
import BlockList from "../blocks/BlockList.tsx";
import PhotoViewer from "../PhotoViewer.tsx";
import StatusBadge from "./StatusBadge.tsx";

/* 프로젝트 하나의 기록입니다: 소개, 바로가기, 개요 표, 태그, 본문, 스크린샷. */
export default function ProjectDetail({
  project,
  backHref,
  onBack,
  headingRef
}: {
  project: Project;
  backHref: string;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
  /* 목록에서 넘어오면 제목으로 초점을 옮겨 화면 낭독기가 새 내용을 읽게 합니다. */
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { shots } = project;

  return (
    <article className="cy-project" aria-labelledby="cy-project-title">
      <a className="cy-project-back" href={backHref} onClick={onBack}>
        ‹ 목록으로
      </a>

      <header className="cy-project-head">
        <span className="cy-board-head">
          <span className="cy-board-category">{project.category}</span>
          <StatusBadge status={project.status} />
        </span>
        <h2 className="cy-project-title" id="cy-project-title" tabIndex={-1} ref={headingRef}>
          {project.title}
        </h2>
        <p className="cy-project-summary">{project.summary}</p>
      </header>

      {project.links.length > 0 ? (
        <ul className="cy-project-links">
          {project.links.map(link => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
                <span className="cy-visually-hidden"> (새 창)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {project.facts.length > 0 ? (
        <dl className="cy-project-facts">
          {project.facts.map(fact => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {project.tags.length > 0 ? (
        <ul className="cy-project-tags" aria-label="태그">
          {project.tags.map(tag => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}

      <BlockList blocks={project.body} view="list" />

      {shots.length > 0 ? (
        <section className="cy-project-shots" aria-labelledby="cy-project-shots-title">
          <h3 className="cy-profile-list-heading" id="cy-project-shots-title">
            스크린샷
          </h3>
          <ul className="cy-project-shot-grid">
            {shots.map((shot, index) => (
              <li key={shot.src}>
                <button
                  type="button"
                  className="cy-photo-cover"
                  onClick={() => setViewerIndex(index)}
                  aria-label={`${shot.caption} 크게 보기`}
                >
                  <img src={asset(shot.src)} alt="" loading="lazy" />
                </button>
                <span className="cy-project-shot-caption" aria-hidden="true">
                  {shot.caption}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {viewerIndex !== null ? (
        <PhotoViewer
          srcs={shots.map(shot => asset(shot.src))}
          captions={shots.map(shot => shot.caption)}
          caption={project.title}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </article>
  );
}
