import { useId, useState, type FormEvent } from "react";
import { guestbookSeed } from "../../config/site.ts";
import { loadAuthor, saveAuthor } from "../../lib/author.ts";
import {
  GUESTBOOK_LIMITS,
  GUESTBOOK_PAGE_SIZE,
  REPLY_LIMITS,
  addLocalEntry,
  addLocalReply,
  loadLocalEntries,
  mergeWithSeed,
  paginate,
  removeLocalEntry,
  removeLocalReply,
  type GuestbookEntry
} from "../../lib/guestbook.ts";
import { getStorage } from "../../lib/storage.ts";
import Pagination from "../Pagination.tsx";

type Message = { kind: "ok" | "error"; text: string };

const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

/* 방명록 입력 칸입니다. 원본은 구글 로그인 뒤에 보이지만, 여기서는 바로 남길 수 있고
   이 브라우저(localStorage)에만 저장됩니다. */
function GuestbookForm({ onSaved }: { onSaved: (entries: GuestbookEntry[]) => void }) {
  const fieldId = useId();
  const [author, setAuthor] = useState(() => loadAuthor(getStorage()));
  const [text, setText] = useState("");
  const [message, setMessage] = useState<Message | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const storage = getStorage();
      onSaved(addLocalEntry(storage, author, text));
      saveAuthor(storage, author);
      setText("");
      setMessage({ kind: "ok", text: "방명록을 남겼어요. 고맙습니다!" });
    } catch (error) {
      setMessage({ kind: "error", text: errorText(error, "남기지 못했어요. 잠시 뒤 다시 시도해 주세요.") });
    }
  };

  return (
    <form className="cy-guestbook-form" onSubmit={submit}>
      <input
        id={`${fieldId}-author`}
        name="guestbook-author"
        className="cy-gb-author"
        value={author}
        onChange={e => setAuthor(e.target.value)}
        placeholder="이름"
        maxLength={GUESTBOOK_LIMITS.author}
        aria-label="이름"
        autoComplete="nickname"
      />
      <input
        id={`${fieldId}-text`}
        name="guestbook-text"
        className="cy-gb-text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="방명록을 남겨주세요"
        maxLength={GUESTBOOK_LIMITS.text}
        aria-label="방명록"
        autoComplete="off"
      />
      <button className="cy-gb-submit" type="submit">
        남기기
      </button>
      {message ? (
        <span className={`cy-gb-message${message.kind === "error" ? " is-error" : ""}`} aria-hidden="true">
          {message.text}
        </span>
      ) : null}
      {/* 결과 안내를 화면 낭독기에 알립니다. 늘 자리에 있어야 바뀐 내용이 읽힙니다. */}
      <span className="cy-visually-hidden" role="status">
        {message?.text ?? ""}
      </span>
    </form>
  );
}

/* 방명록 글 하나에 달린 댓글 목록 + 댓글 쓰기 칸입니다. */
function ReplyThread({ entry, onChange }: { entry: GuestbookEntry; onChange: (entries: GuestbookEntry[]) => void }) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState(() => loadAuthor(getStorage()));
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bodyId = `${fieldId}-body`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const storage = getStorage();
      onChange(addLocalReply(storage, entry.id, author, text));
      saveAuthor(storage, author);
      setText("");
    } catch (e) {
      setError(errorText(e, "댓글을 남기지 못했어요."));
    }
  };

  const remove = (replyId: string) => {
    if (!window.confirm("이 댓글을 지울까요?")) return;
    try {
      onChange(removeLocalReply(getStorage(), entry.id, replyId));
    } catch {
      window.alert("지우지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  return (
    <div className="cy-reply-thread">
      <button
        type="button"
        className="cy-reply-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
      >
        {open ? "└ 댓글 닫기" : `└ 댓글 ${entry.replies.length}`}
      </button>

      {open ? (
        <div className="cy-reply-body" id={bodyId}>
          {entry.replies.map(r => (
            <div key={r.id} className="cy-reply-item">
              <span className="cy-reply-author">{r.author}</span>
              <span className="cy-reply-text">{r.text}</span>
              <span className="cg-date">({r.date})</span>
              <button type="button" className="cg-delete" onClick={() => remove(r.id)}>
                삭제
              </button>
            </div>
          ))}

          <form className="cy-reply-form" onSubmit={submit}>
            <input
              id={`${fieldId}-author`}
              name="reply-author"
              className="cy-gb-author"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="이름"
              maxLength={REPLY_LIMITS.author}
              aria-label="댓글 이름"
              autoComplete="nickname"
            />
            <input
              id={`${fieldId}-text`}
              name="reply-text"
              className="cy-gb-text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="댓글을 남겨주세요"
              maxLength={REPLY_LIMITS.text}
              aria-label="댓글"
              autoComplete="off"
            />
            <button className="cy-gb-submit" type="submit">
              달기
            </button>
            {error ? (
              <span className="cy-gb-message is-error" role="alert">
                {error}
              </span>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}

/* 홈 탭 "What friends say" 목록입니다. 최근 글이 위, 예시 글이 맨 아래이고 5개씩 쪽을 나눕니다. */
export default function Guestbook() {
  const [local, setLocal] = useState(() => loadLocalEntries(getStorage()));
  const [page, setPage] = useState(0);

  const entries = mergeWithSeed(local, guestbookSeed);
  const { pageCount, current, items } = paginate(entries, page, GUESTBOOK_PAGE_SIZE);

  const removeEntry = (id: string) => {
    if (!window.confirm("이 방명록을 지울까요?")) return;
    try {
      setLocal(removeLocalEntry(getStorage(), id));
    } catch {
      window.alert("지우지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  return (
    <>
      <div className="cy-guestbook-list">
        {entries.length === 0 ? (
          <div className="cy-gb-loading">아직 방명록이 없어요. 첫 줄을 남겨 주세요!</div>
        ) : (
          items.map(c => (
            <div key={c.id} className="cy-guestbook-item">
              <span className="cg-author">
                {c.author} <span className="cg-colon">:</span>{" "}
              </span>
              <span className="cg-text">{c.text}</span>
              <span className="cg-date">({c.date})</span>
              {c.mine ? (
                <>
                  <button type="button" className="cg-delete" onClick={() => removeEntry(c.id)}>
                    삭제
                  </button>
                  <ReplyThread entry={c} onChange={setLocal} />
                </>
              ) : null}
            </div>
          ))
        )}
      </div>

      <Pagination pageCount={pageCount} current={current} onChange={setPage} label="방명록 쪽 번호" />

      <GuestbookForm
        onSaved={next => {
          setLocal(next);
          setPage(0);
        }}
      />
    </>
  );
}
