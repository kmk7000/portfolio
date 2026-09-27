import { useMemo, useState } from "react";
import type { ContentBlock, TabView } from "../../config/site.ts";
import { asset } from "../../lib/asset.ts";
import { groupByYear } from "../../lib/blocks.ts";
import PhotoViewer from "../PhotoViewer.tsx";

/* 글·사진·링크 블록 목록입니다. 프로필 탭과 사진첩이 함께 씁니다. */
export default function BlockList({ blocks, view }: { blocks: readonly ContentBlock[]; view: TabView }) {
  /* 크게 넘겨 보는 화면을 띄운 사진 블록입니다. */
  const [viewerBlockId, setViewerBlockId] = useState<string | null>(null);

  const groups = useMemo(() => (view === "year" ? groupByYear(blocks) : null), [blocks, view]);

  const renderBlock = (block: ContentBlock) => {
    let inner;
    if (block.type === "heading") {
      inner = <h3 className="cy-profile-list-heading">{block.text}</h3>;
    } else if (block.type === "text") {
      inner = <p className="cy-block-text">{block.text}</p>;
    } else if (block.type === "list") {
      inner = (
        <ul className="cy-block-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    } else if (block.type === "link") {
      /* 메일 주소는 새 탭 없이 메일 앱을 엽니다. */
      const external = !block.href.startsWith("mailto:");
      inner = (
        <a
          className="cy-block-link"
          href={block.href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {block.label || block.href}
          {external ? <span className="cy-visually-hidden"> (새 창)</span> : null}
        </a>
      );
    } else {
      /* 목록에는 대표 사진(첫 장)만 내보이고, 누르면 이 글의 사진을 전부 넘겨 봅니다. */
      const cover = block.images[0];
      const count = block.images.length;
      inner = (
        <figure className="cy-block-figure">
          {cover ? (
            <button
              type="button"
              className="cy-photo-cover"
              onClick={() => setViewerBlockId(block.id)}
              title={count > 1 ? `사진 ${count}장 보기` : "크게 보기"}
              aria-label={`${block.caption || "사진"} ${count > 1 ? `사진 ${count}장 보기` : "크게 보기"}`}
            >
              <img src={asset(cover)} alt={block.caption} loading="lazy" />
              {count > 1 ? (
                <span className="cy-photo-count" aria-hidden="true">
                  +{count - 1}
                </span>
              ) : null}
            </button>
          ) : null}
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }

    return (
      <div key={block.id} className={`cy-block is-${block.type}`}>
        {inner}
      </div>
    );
  };

  const viewerBlock = blocks.find(b => b.id === viewerBlockId);

  return (
    <>
      {groups ? (
        groups.map(([year, list]) => (
          <section key={year} className="cy-year-group" aria-label={`${year}년`}>
            <div className="cy-year-head">
              <span className="cy-year-label">{year}</span>
              <span className="cy-year-count">{list.length}</span>
            </div>
            <div className="cy-block-grid">{list.map(renderBlock)}</div>
          </section>
        ))
      ) : (
        <div className={view === "list" ? "cy-block-article" : "cy-block-grid"}>{blocks.map(renderBlock)}</div>
      )}

      {blocks.length === 0 ? <div className="cy-empty-box">아직 내용이 없습니다.</div> : null}

      {viewerBlock && viewerBlock.type === "image" && viewerBlock.images.length > 0 ? (
        <PhotoViewer
          srcs={viewerBlock.images.map(asset)}
          caption={viewerBlock.caption}
          onClose={() => setViewerBlockId(null)}
        />
      ) : null}
    </>
  );
}
