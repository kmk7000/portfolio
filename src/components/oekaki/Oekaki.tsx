import { useEffect, useId, useState } from "react";
import { loadAuthor, saveAuthor } from "../../lib/author.ts";
import { cloudErrorText } from "../../lib/firebase.ts";
import { PAGE_SIZE, parseReplay, type ReplayOp } from "../../lib/oekaki/draw.ts";
import { OEKAKI_LIMITS, type OekakiEntry } from "../../lib/oekaki/store.ts";
import {
  addDrawing,
  addReply,
  deleteDrawing,
  deleteReply,
  loadReplay,
  setDrawingHidden,
  subscribeOekaki
} from "../../lib/oekaki/cloud.ts";
import { useSite } from "../../lib/site-context.tsx";
import { paginate } from "../../lib/guestbook.ts";
import { getStorage } from "../../lib/storage.ts";
import Pagination from "../Pagination.tsx";
import OekakiPad, { type PadResult } from "./OekakiPad.tsx";
import OekakiPlayer from "./OekakiPlayer.tsx";

const errorText = cloudErrorText;

/* 목록 한 줄. 그림 옆에 제목, 글쓴이, 날짜, 최근 덧글이 붙습니다. */
function OekakiRow({ item, onOpen }: { item: OekakiEntry; onOpen: () => void }) {
  return (
    <li className="cy-oe-item">
      <button type="button" className="cy-oe-thumb" onClick={onOpen} aria-label={`${item.author} 님의 그림 열기${item.hidden ? " (가림)" : ""}`}>
        <img src={item.image} alt={item.comment || `${item.author} 님의 그림`} loading="lazy" />
        {item.hidden ? (
          <span className="cy-oe-badge" aria-hidden="true">
            가림
          </span>
        ) : null}
      </button>

      <div className="cy-oe-side">
        <div className="cy-oe-side-head">
          <button type="button" className={"cy-oe-title" + (item.comment ? "" : " is-empty")} onClick={onOpen}>
            {item.comment || "제목 없음"}
          </button>
          <span className="cy-oe-author">{item.author}</span>
          <span className="cy-oe-date">
            {item.date} {item.time}
          </span>
        </div>

        {item.replies.length > 0 ? (
          <ul className="cy-oe-reply-preview">
            {item.replies.slice(-3).map(r => (
              <li key={r.id}>
                <span className="cy-oe-reply-author">{r.author}</span>
                <span className="cy-oe-reply-text">{r.text}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <button type="button" className="cy-oe-more" onClick={onOpen}>
          {item.replies.length > 0 ? `덧글 ${item.replies.length}개 보기` : "덧글 남기기"}
        </button>
      </div>
    </li>
  );
}

/* 그림 한 장을 크게 보고 덧글을 다는 화면 */
function OekakiDetail({ item, onClose }: { item: OekakiEntry; onClose: () => void }) {
  const { isOwner } = useSite();
  const fieldId = useId();
  const [text, setText] = useState("");
  const [replyAuthor, setReplyAuthor] = useState(() => loadAuthor(getStorage()));
  const [error, setError] = useState<string | null>(null);
  const [ops, setOps] = useState<ReplayOp[] | null>(null);
  const [busy, setBusy] = useState(false);

  const play = async () => {
    setError(null);
    if (!item.hasReplay) {
      setError("이 그림은 그리는 과정이 기록되지 않았어요.");
      return;
    }
    setBusy(true);
    try {
      const parsed = parseReplay((await loadReplay(item.id)) ?? "");
      if (parsed.length === 0) setError("이 그림은 그리는 과정이 기록되지 않았어요.");
      else setOps(parsed);
    } catch (e) {
      setError(errorText(e, "그리는 과정을 불러오지 못했어요."));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await addReply(item.id, { author: replyAuthor, text });
      saveAuthor(getStorage(), replyAuthor);
      setText("");
    } catch (e) {
      setError(errorText(e, "처리하지 못했어요."));
    } finally {
      setBusy(false);
    }
  };

  const removeDrawing = async () => {
    if (!window.confirm("이 그림을 지울까요? 되돌릴 수 없어요.")) return;
    try {
      await deleteDrawing(item);
      onClose();
    } catch (e) {
      setError(errorText(e, "처리하지 못했어요."));
    }
  };

  /* 주인장 전용: 지우지 않고 방문자에게서만 가립니다. */
  const toggleHidden = async () => {
    setError(null);
    try {
      await setDrawingHidden(item.id, !item.hidden);
    } catch (e) {
      setError(errorText(e, "처리하지 못했어요."));
    }
  };

  const removeReply = async (replyId: string) => {
    try {
      await deleteReply(replyId);
    } catch (e) {
      setError(errorText(e, "처리하지 못했어요."));
    }
  };

  return (
    <div className="cy-oe-detail">
      <div className="cy-oe-detail-head">
        <button type="button" className="cy-oe-btn" onClick={onClose}>
          목록으로
        </button>
        {ops ? (
          <button type="button" className="cy-oe-btn" onClick={() => setOps(null)}>
            그림 보기
          </button>
        ) : (
          <button type="button" className="cy-oe-btn" onClick={play} disabled={busy}>
            그리는 과정 재생
          </button>
        )}
        {isOwner ? (
          <button type="button" className="cy-oe-btn" onClick={toggleHidden} aria-pressed={item.hidden}>
            {item.hidden ? "가림 풀기" : "가림 처리"}
          </button>
        ) : null}
        {item.mine || isOwner ? (
          <button type="button" className="cy-oe-btn" onClick={removeDrawing}>
            그림 삭제
          </button>
        ) : null}
      </div>

      {item.hidden ? <p className="cy-oe-hidden-note">가림 처리된 그림입니다. 주인장에게만 보입니다.</p> : null}

      {ops ? (
        <OekakiPlayer image={item.image} ops={ops} />
      ) : (
        <img className="cy-oe-big" src={item.image} alt={item.comment || `${item.author} 님의 그림`} />
      )}

      <div className="cy-oe-detail-meta">
        {item.comment ? <span className="cy-oe-title-text">{item.comment}</span> : null}
        <span className="cy-oe-author">{item.author}</span>
        <span className="cy-oe-date">
          {item.date} {item.time}
        </span>
      </div>

      <div className="cy-oe-replies">
        {item.replies.length === 0 ? (
          <div className="cy-gb-loading">아직 덧글이 없어요.</div>
        ) : (
          item.replies.map(r => (
            <div key={r.id} className="cy-oe-reply">
              <span className="cy-oe-reply-author">{r.author}</span>
              <span className="cy-oe-reply-text">{r.text}</span>
              <span className="cy-oe-date">
                {r.date} {r.time}
                {r.mine || item.mine || isOwner ? (
                  <button type="button" className="cg-act" onClick={() => removeReply(r.id)}>
                    삭제
                  </button>
                ) : null}
              </span>
            </div>
          ))
        )}
      </div>

      <form
        className="cy-oe-row"
        onSubmit={event => {
          event.preventDefault();
          send();
        }}
      >
        <input
          id={`${fieldId}-reply-author`}
          name="oekaki-reply-author"
          className="cy-oe-author-input"
          value={replyAuthor}
          onChange={e => setReplyAuthor(e.target.value)}
          placeholder="이름"
          maxLength={OEKAKI_LIMITS.author}
          aria-label="덧글 이름"
          autoComplete="nickname"
        />
        <input
          id={`${fieldId}-reply`}
          name="oekaki-reply"
          className="cy-oe-comment"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="덧글을 남겨주세요"
          maxLength={OEKAKI_LIMITS.reply}
          aria-label="덧글"
          autoComplete="off"
        />
        <button type="submit" className="cy-gb-submit" disabled={busy}>
          덧글
        </button>
      </form>

      {error ? (
        <span className="cy-gb-message is-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/* 낙서장(오에카키) — 그림으로 남기는 방명록입니다.
   원본은 구글 로그인 후 올립니다. 여기서는 바로 그릴 수 있고, 남긴 그림은 모든 방문자에게 보입니다. */
export default function Oekaki() {
  /* null: 아직 불러오는 중 */
  const [items, setItems] = useState<OekakiEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const helpId = useId();

  useEffect(
    () =>
      subscribeOekaki(
        next => {
          setItems(next);
          setLoadError(null);
        },
        error => setLoadError(errorText(error, "낙서장을 불러오지 못했어요."))
      ),
    []
  );

  /* 실패하면 OekakiPad 가 오류를 보여 주도록 다시 던집니다. 그린 그림은 그대로 남습니다. */
  const save = async (result: PadResult) => {
    try {
      await addDrawing(result);
    } catch (error) {
      throw new Error(errorText(error, "그림을 남기지 못했어요. 잠시 뒤 다시 시도해 주세요."));
    }
    saveAuthor(getStorage(), result.author);
    setOpen(false);
    setPage(0);
    setNotice("그림을 남겼어요. 고맙습니다!");
  };

  const list = items ?? [];
  const viewing = list.find(i => i.id === openId) ?? null;
  const { pageCount, current, items: shown } = paginate(list, page, PAGE_SIZE);

  return (
    <div className="cy-content-box">
      <div className="cy-section-title">
        <span>오에카키</span>
        <span className="cy-sub-text">그림으로 남기는 방명록</span>
        <button
          type="button"
          className="cy-oe-help-btn"
          onClick={() => setHelp(v => !v)}
          aria-expanded={help}
          aria-controls={helpId}
          aria-label="오에카키가 무엇인지 보기"
          title="이게 뭔가요?"
        >
          ?
        </button>
      </div>

      {help ? (
        <div className="cy-oe-help" id={helpId}>
          <p>
            <b>오에카키(お絵かき)</b>는 2000년대 초 게시판에서 유행하던 그림 방명록입니다. 따로 프로그램을 깔지 않고
            웹페이지에서 바로 그려 올리고, 서로 덧글을 달았습니다.
          </p>
          <p>잘 그릴 필요 없습니다. 낙서가 제 맛입니다. 지나간 자리에 그림 한 장 남겨 주세요.</p>
          <p className="cy-oe-help-tip">
            펜·직선·사각형·원으로 그리고, 채우기로 안쪽을 칠합니다. 사각형과 원은 채움을 켜면 속까지 칠해집니다.
            스포이드는 이미 쓴 색을 다시 집고, 흐리게는 지나간 자리를 부드럽게 만듭니다. 농도를 낮추면 수채처럼
            겹쳐집니다. 레이어를 나누면 밑그림 위에 덧그렸다가 밑그림만 끌 수 있어요.
          </p>
          <p className="cy-oe-help-tip">
            남긴 그림을 눌러 <b>그리는 과정 재생</b>을 누르면 선이 하나씩 그어지는 걸 볼 수 있어요. 흐리게로 칠한
            부분은 재생에서 건너뜁니다.
          </p>
        </div>
      ) : null}

      {viewing ? (
        <OekakiDetail key={viewing.id} item={viewing} onClose={() => setOpenId(null)} />
      ) : (
        <>
          {open ? (
            <OekakiPad defaultAuthor={loadAuthor(getStorage())} onDone={save} onCancel={() => setOpen(false)} />
          ) : (
            <div className="cy-oe-start">
              <button
                type="button"
                className="cy-gb-submit"
                onClick={() => {
                  setNotice(null);
                  setOpen(true);
                }}
              >
                그림 그리기
              </button>
              {notice ? (
                <span className="cy-gb-message" role="status">
                  {notice}
                </span>
              ) : null}
            </div>
          )}

          {loadError ? (
            <div className="cy-gb-loading" role="alert">
              {loadError}
            </div>
          ) : items === null ? (
            <div className="cy-gb-loading">낙서장을 불러오는 중이에요…</div>
          ) : list.length === 0 ? (
            <div className="cy-gb-loading">아직 그림이 없어요.</div>
          ) : (
            <>
              <ul className="cy-oe-list">
                {shown.map(item => (
                  <OekakiRow key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
                ))}
              </ul>
              <Pagination pageCount={pageCount} current={current} onChange={setPage} label="낙서장 쪽 번호" />
            </>
          )}
        </>
      )}
    </div>
  );
}
