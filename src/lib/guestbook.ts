/* 홈 탭 "What friends say" 방명록입니다.
   원본은 구글 로그인 후 Firestore 에 남깁니다. 여기서는 같은 제한(이름 20자, 글 100자)으로
   localStorage 에 남기고, 이 브라우저에서 쓴 글과 댓글만 지울 수 있게 합니다. */
import { formatDate } from "./format.ts";
import { makeId, readJson, writeJson, type KeyValueStorage } from "./storage.ts";

export const GUESTBOOK_KEY = "cy-guestbook";
export const GUESTBOOK_LIMITS = { author: 20, text: 100 } as const;
export const REPLY_LIMITS = { author: 20, text: 100 } as const;
/* 원본과 같이 최근 30개까지만 들고 있고, 한 쪽에 5개씩 보여 줍니다. */
export const GUESTBOOK_MAX_ENTRIES = 30;
export const GUESTBOOK_PAGE_SIZE = 5;

export type GuestbookReply = {
  id: string;
  author: string;
  text: string;
  date: string;
  createdAt: number;
};

export type GuestbookEntry = {
  id: string;
  author: string;
  text: string;
  date: string;
  /* 이 브라우저에서 남긴 글인지. 예시 글은 false 이고 삭제·댓글이 없습니다. */
  mine: boolean;
  createdAt: number;
  replies: GuestbookReply[];
};

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

export function createGuestbookEntry(author: string, text: string, now: Date = new Date()): GuestbookEntry {
  const valid = validateGuestbookInput(author, text);
  return {
    id: makeId("gb"),
    author: valid.author,
    text: valid.text,
    date: formatDate(now),
    mine: true,
    createdAt: now.getTime(),
    replies: []
  };
}

function isReply(value: unknown): value is GuestbookReply {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.author === "string" &&
    typeof v.text === "string" &&
    typeof v.date === "string" &&
    typeof v.createdAt === "number"
  );
}

function isEntry(value: unknown): value is Omit<GuestbookEntry, "replies"> & { replies?: unknown } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.author === "string" &&
    typeof v.text === "string" &&
    typeof v.date === "string" &&
    typeof v.createdAt === "number"
  );
}

export function loadLocalEntries(storage: KeyValueStorage): GuestbookEntry[] {
  const raw = readJson<unknown>(storage, GUESTBOOK_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isEntry)
    .map(e => ({
      id: e.id,
      author: e.author,
      text: e.text,
      date: e.date,
      createdAt: e.createdAt,
      mine: true,
      replies: Array.isArray(e.replies)
        ? e.replies.filter(isReply).sort((a, b) => a.createdAt - b.createdAt)
        : []
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, GUESTBOOK_MAX_ENTRIES);
}

export function saveLocalEntries(storage: KeyValueStorage, entries: GuestbookEntry[]): void {
  writeJson(storage, GUESTBOOK_KEY, entries.slice(0, GUESTBOOK_MAX_ENTRIES));
}

/* 새 글을 맨 앞에 붙이고 저장한 뒤, 저장된 목록을 돌려줍니다. */
export function addLocalEntry(storage: KeyValueStorage, author: string, text: string, now = new Date()) {
  const entry = createGuestbookEntry(author, text, now);
  const next = [entry, ...loadLocalEntries(storage)].slice(0, GUESTBOOK_MAX_ENTRIES);
  saveLocalEntries(storage, next);
  return next;
}

export function removeLocalEntry(storage: KeyValueStorage, id: string) {
  const next = loadLocalEntries(storage).filter(e => e.id !== id);
  saveLocalEntries(storage, next);
  return next;
}

export function addLocalReply(storage: KeyValueStorage, entryId: string, author: string, text: string, now = new Date()) {
  const valid = validateReplyInput(author, text);
  const reply: GuestbookReply = {
    id: makeId("re"),
    author: valid.author,
    text: valid.text,
    date: formatDate(now),
    createdAt: now.getTime()
  };
  const next = loadLocalEntries(storage).map(e =>
    e.id === entryId ? { ...e, replies: [...e.replies, reply] } : e
  );
  saveLocalEntries(storage, next);
  return next;
}

export function removeLocalReply(storage: KeyValueStorage, entryId: string, replyId: string) {
  const next = loadLocalEntries(storage).map(e =>
    e.id === entryId ? { ...e, replies: e.replies.filter(r => r.id !== replyId) } : e
  );
  saveLocalEntries(storage, next);
  return next;
}

/* 최근 글이 위로 오고, 예시 글(가장 오래된 글)은 맨 아래에 붙습니다. */
export function mergeWithSeed(
  local: GuestbookEntry[],
  seed: readonly { id: string; author: string; text: string; date: string }[]
): GuestbookEntry[] {
  return [...local, ...seed.map(s => ({ ...s, mine: false, createdAt: 0, replies: [] }))];
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
