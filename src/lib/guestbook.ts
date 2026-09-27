/* 홈 탭 "What friends say" 방명록입니다.
   글과 댓글은 Firestore(guestbook, guestbookReplies)에 담겨 모든 방문자에게 보입니다.
   여기에는 입력 검사와, 받아 온 문서를 화면용 목록으로 바꾸는 순수한 계산만 둡니다.
   (주고받기는 guestbook-cloud.ts) */
import { formatDate } from "./format.ts";

export const GUESTBOOK_LIMITS = { author: 20, text: 100 } as const;
export const REPLY_LIMITS = { author: 20, text: 100 } as const;
/* 최근 30개까지 불러오고, 한 쪽에 5개씩 보여 줍니다. */
export const GUESTBOOK_MAX_ENTRIES = 30;
export const GUESTBOOK_MAX_REPLIES = 300;
export const GUESTBOOK_PAGE_SIZE = 5;

export type GuestbookReply = {
  id: string;
  author: string;
  text: string;
  date: string;
  createdAt: number;
  /* 이 브라우저(익명 계정)에서 쓴 댓글인지 */
  mine: boolean;
};

export type GuestbookEntry = {
  id: string;
  author: string;
  text: string;
  date: string;
  /* 이 브라우저에서 남긴 글인지. 지우기 버튼은 내 글에만 보입니다. */
  mine: boolean;
  /* 예시 글은 댓글을 달 수 없습니다. */
  seed?: boolean;
  createdAt: number;
  replies: GuestbookReply[];
};

/* Firestore 에서 받은 문서 한 개(시각은 밀리초로 바꾼 것) */
export type Row = { id: string; data: Record<string, unknown> };

type Limits = { author: number; text: number };

function validate(author: string, text: string, limits: Limits, noun: string) {
  const trimmedAuthor = author.trim();
  const trimmedText = text.trim();
  if (!trimmedAuthor || !trimmedText) throw new Error(`이름과 ${noun}을 모두 적어 주세요.`);
  if (trimmedAuthor.length > limits.author) throw new Error(`이름은 ${limits.author}자까지 쓸 수 있어요.`);
  if (trimmedText.length > limits.text) throw new Error(`${noun}은 ${limits.text}자까지 쓸 수 있어요.`);
  return { author: trimmedAuthor, text: trimmedText };
}

export function validateGuestbookInput(author: string, text: string) {
  return validate(author, text, GUESTBOOK_LIMITS, "방명록");
}

export function validateReplyInput(author: string, text: string) {
  return validate(author, text, REPLY_LIMITS, "댓글");
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const millis = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Date.now());

/* 문서 목록 → 화면용 목록. 최근 글이 위, 댓글은 오래된 것이 위입니다.
   글이 지워진 뒤 남은 댓글은 보이지 않습니다. */
export function buildEntries(entries: readonly Row[], replies: readonly Row[], myUid: string | null): GuestbookEntry[] {
  const byEntry = new Map<string, GuestbookReply[]>();
  for (const r of replies) {
    const entryId = str(r.data.entryId);
    const author = str(r.data.author);
    const text = str(r.data.text);
    if (!entryId || !author || !text) continue;
    const createdAt = millis(r.data.createdAt);
    const list = byEntry.get(entryId) ?? [];
    list.push({ id: r.id, author, text, createdAt, date: formatDate(new Date(createdAt)), mine: !!myUid && r.data.uid === myUid });
    byEntry.set(entryId, list);
  }
  return entries
    .filter(e => str(e.data.author) && str(e.data.text))
    .map(e => {
      const createdAt = millis(e.data.createdAt);
      return {
        id: e.id,
        author: str(e.data.author),
        text: str(e.data.text),
        createdAt,
        date: formatDate(new Date(createdAt)),
        mine: !!myUid && e.data.uid === myUid,
        replies: (byEntry.get(e.id) ?? []).sort((a, b) => a.createdAt - b.createdAt)
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, GUESTBOOK_MAX_ENTRIES);
}

/* 최근 글이 위로 오고, 예시 글(가장 오래된 글)은 맨 아래에 붙습니다. */
export function mergeWithSeed(
  entries: GuestbookEntry[],
  seed: readonly { id: string; author: string; text: string; date: string }[]
): GuestbookEntry[] {
  return [...entries, ...seed.map(s => ({ ...s, mine: false, seed: true, createdAt: 0, replies: [] }))];
}

export function paginate<T>(items: readonly T[], page: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(0, page), pageCount - 1);
  return {
    pageCount,
    current,
    items: items.slice(current * size, current * size + size)
  };
}
