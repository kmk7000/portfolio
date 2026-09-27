import { useMemo, useRef, useState } from "react";
import type { ContentBlock, TabView } from "../../config/site.ts";
import { asset } from "../../lib/asset.ts";
import { groupByYear } from "../../lib/blocks.ts";
import { isSafeHref, linesToItems, moveItem, newId, resolveImageSrc } from "../../lib/site-content.ts";
import { useSite } from "../../lib/site-context.tsx";
import EditableText from "../Editable.tsx";
import PhotoViewer from "../PhotoViewer.tsx";

type Props = {
  blocks: readonly ContentBlock[];
  view: TabView;
  editing?: boolean;
  onChange?: (next: ContentBlock[]) => void;
};

/* 글·사진·링크 블록 목록입니다. 프로필 탭·사진첩·직접 만든 탭이 함께 씁니다.
   주인장이 편집 중이면 원본처럼 블록마다 [연도][↑][↓][삭제] 와 아래 "추가" 줄이 붙습니다. */
export default function BlockList({ blocks, view, editing = false, onChange }: Props) {
  const { images, upload } = useSite();
  /* 크게 넘겨 보는 화면을 띄운 사진 블록입니다. */
  const [viewerBlockId, setViewerBlockId] = useState<string | null>(null);
  /* 사진을 여러 장 올릴 때 어느 블록에 몇 장째인지 */
  const [uploading, setUploading] = useState<{ blockId: string; done: number; total: number } | null>(null);

  /* 사진 올리기는 시간이 걸려서, 그동안 다른 곳을 고쳤을 수 있습니다. 늘 최신 목록 위에 고칩니다. */
  const latest = useRef(blocks);
  latest.current = blocks;
  const change = (next: ContentBlock[]) => onChange?.(next);
  const replace = (id: string, patch: Partial<ContentBlock>) =>
    change(latest.current.map(b => (b.id === id ? ({ ...b, ...patch } as ContentBlock) : b)));

  const src = (ref: string) => resolveImageSrc(ref, images, asset);
  const groups = useMemo(() => (view === "year" ? groupByYear(blocks) : null), [blocks, view]);

  const add = (type: ContentBlock["type"]) => {
    const id = newId("b");
    const created: ContentBlock =
      type === "heading"
        ? { id, type, text: "소제목" }
        : type === "text"
          ? { id, type, text: "" }
          : type === "list"
            ? { id, type, items: [] }
            : type === "link"
              ? { id, type, label: "", href: "" }
              : { id, type: "image", images: [], caption: "" };
    change([...blocks, created]);
  };

  const pickImages = async (block: ContentBlock & { type: "image" }, files: File[]) => {
    setUploading({ blockId: block.id, done: 0, total: files.length });
    const added: string[] = [];
    try {
      for (const file of files) {
        added.push(await upload(file));
        setUploading({ blockId: block.id, done: added.length, total: files.length });
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "사진을 올리지 못했어요.");
    } finally {
      /* 한 장이라도 올라갔으면 올라간 만큼은 남깁니다. */
      if (added.length > 0) {
        const now = latest.current.find(b => b.id === block.id);
        const current = now && now.type === "image" ? now.images : block.images;
        replace(block.id, { images: [...current, ...added] });
      }
      setUploading(null);
    }
  };

  const renderPhotoEditor = (block: ContentBlock & { type: "image" }) => (
    <>
      {block.images.length > 0 ? (
        <div className="cy-photo-strip">
          {block.images.map((ref, i) => (
            <div key={`${ref}-${i}`} className={`cy-photo-thumb${i === 0 ? " is-cover" : ""}`}>
              <img src={src(ref)} alt={`${i + 1}번째 사진`} />
              {i === 0 ? <span className="cy-photo-tag">대표</span> : null}
              <div className="cy-photo-thumb-tools">
                {block.images.length > 1 ? (
                  <>
                    <button type="button" onClick={() => replace(block.id, { images: moveItem(block.images, i, -1) })} aria-label={`${i + 1}번째 사진 앞으로`}>
                      ‹
                    </button>
                    <button type="button" onClick={() => replace(block.id, { images: moveItem(block.images, i, 1) })} aria-label={`${i + 1}번째 사진 뒤로`}>
                      ›
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="is-danger"
                  aria-label={`${i + 1}번째 사진 빼기`}
                  onClick={() => {
                    if (window.confirm("이 사진을 뺄까요?")) replace(block.id, { images: block.images.filter((_, j) => j !== i) });
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <label className="cy-image-pick">
        {uploading?.blockId === block.id
          ? `올리는 중 ${uploading.done}/${uploading.total}…`
          : block.images.length > 0
            ? "사진 더 넣기"
            : "사진 고르기"}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={!!uploading}
          onChange={e => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length > 0) void pickImages(block, files);
          }}
        />
      </label>
      {block.images.length > 1 ? <span className="cy-photo-hint">맨 앞 사진이 목록에 보이는 대표 사진입니다</span> : null}
    </>
  );

  const renderBlock = (block: ContentBlock) => {
    let inner;
    if (block.type === "heading") {
      inner = (
        <EditableText
          as="h3"
          className="cy-profile-list-heading"
          value={block.text}
          editing={editing}
          placeholder="소제목"
          onSave={text => replace(block.id, { text })}
        />
      );
    } else if (block.type === "text") {
      inner = (
        <EditableText
          as="p"
          className="cy-block-text"
          value={block.text}
          editing={editing}
          multiline
          placeholder="내용을 적어 주세요"
          onSave={text => replace(block.id, { text })}
        />
      );
    } else if (block.type === "list") {
      inner = editing ? (
        <EditableText
          as="div"
          className="cy-block-text"
          value={block.items.join("\n")}
          editing
          multiline
          placeholder="한 줄에 한 항목씩 적어 주세요"
          label="목록 항목"
          onSave={text => replace(block.id, { items: linesToItems(text) })}
        />
      ) : (
        <ul className="cy-block-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    } else if (block.type === "link") {
      if (editing) {
        inner = (
          <div className="cy-block-link-edit">
            <EditableText value={block.label} editing placeholder="링크 이름" onSave={label => replace(block.id, { label })} />
            <EditableText
              className="cy-block-href"
              value={block.href}
              editing
              placeholder="https://..."
              label="링크 주소"
              onSave={href => {
                if (href && !isSafeHref(href)) window.alert("https:// 로 시작하는 주소나 mailto: 메일 주소만 넣을 수 있어요.");
                else replace(block.id, { href });
              }}
            />
          </div>
        );
      } else if (isSafeHref(block.href)) {
        /* 메일 주소는 새 탭 없이 메일 앱을 엽니다. */
        const external = !block.href.startsWith("mailto:");
        inner = (
          <a className="cy-block-link" href={block.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {block.label || block.href}
            {external ? <span className="cy-visually-hidden"> (새 창)</span> : null}
          </a>
        );
      } else {
        inner = <span className="cy-block-text">{block.label}</span>;
      }
    } else {
      /* 목록에는 대표 사진(첫 장)만 내보이고, 누르면 이 글의 사진을 전부 넘겨 봅니다. */
      const cover = block.images[0] ? src(block.images[0]) : "";
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
              <img src={cover} alt={block.caption} loading="lazy" />
              {count > 1 ? (
                <span className="cy-photo-count" aria-hidden="true">
                  +{count - 1}
                </span>
              ) : null}
            </button>
          ) : editing ? (
            <div className="cy-block-image-empty">사진을 골라 주세요</div>
          ) : null}
          {editing ? renderPhotoEditor(block) : null}
          {block.caption || editing ? (
            <EditableText
              as="figcaption"
              value={block.caption}
              editing={editing}
              placeholder="사진 설명"
              onSave={caption => replace(block.id, { caption })}
            />
          ) : null}
        </figure>
      );
    }

    if (!editing) {
      return (
        <div key={block.id} className={`cy-block is-${block.type}`}>
          {inner}
        </div>
      );
    }

    const index = blocks.findIndex(b => b.id === block.id);
    return (
      <div key={block.id} className={`cy-block is-${block.type} is-editing`}>
        <div className="cy-block-tools">
          <label className="cy-year-chip" title="연도별 보기에서 묶는 기준">
            <input
              type="text"
              inputMode="numeric"
              placeholder="연도"
              aria-label="연도"
              maxLength={4}
              defaultValue={block.year ?? ""}
              onBlur={e => {
                const year = e.target.value.trim();
                if (year !== (block.year ?? "")) replace(block.id, { year: year || undefined });
              }}
            />
          </label>
          <button type="button" onClick={() => change(moveItem(blocks, index, -1))} aria-label="위로">
            [↑]
          </button>
          <button type="button" onClick={() => change(moveItem(blocks, index, 1))} aria-label="아래로">
            [↓]
          </button>
          <button
            type="button"
            className="is-danger"
            aria-label="이 내용 지우기"
            onClick={() => {
              if (window.confirm("이 내용을 지울까요?")) change(blocks.filter(b => b.id !== block.id));
            }}
          >
            [삭제]
          </button>
        </div>
        {inner}
      </div>
    );
  };

  const viewerBlock = blocks.find(b => b.id === viewerBlockId);
  const viewerSrcs = viewerBlock && viewerBlock.type === "image" ? viewerBlock.images.map(src).filter(Boolean) : [];

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

      {blocks.length === 0 && !editing ? <div className="cy-empty-box">아직 내용이 없습니다.</div> : null}

      {editing ? (
        <div className="cy-block-add">
          <span className="cy-block-add-label">추가</span>
          <button type="button" onClick={() => add("heading")}>
            소제목
          </button>
          <button type="button" onClick={() => add("text")}>
            글
          </button>
          <button type="button" onClick={() => add("list")}>
            목록
          </button>
          <button type="button" onClick={() => add("image")}>
            사진
          </button>
          <button type="button" onClick={() => add("link")}>
            링크
          </button>
        </div>
      ) : null}

      {viewerBlock && viewerBlock.type === "image" && viewerSrcs.length > 0 ? (
        <PhotoViewer srcs={viewerSrcs} caption={viewerBlock.caption} onClose={() => setViewerBlockId(null)} />
      ) : null}
    </>
  );
}
