/* 낙서장 그림과 덧글을 localStorage 에 담습니다.
   원본은 Firestore 에 (구글 로그인 후) 올리고 모두가 봅니다. 여기서는 이 브라우저에만 남습니다.
   제한 값은 원본 OEKAKI_LIMITS 와 같습니다. */
import { formatDate, formatTime } from "../format.ts";
import { makeId, readJson, writeJson, type KeyValueStorage } from "../storage.ts";

export const OEKAKI_KEY = "cy-oekaki";
export const OEKAKI_LIMITS = {
  comment: 60,
  image: 300000,
  reply: 100,
  replay: 400000,
  author: 20
} as const;
/* 원본은 최근 60장을 불러옵니다. */
export const OEKAKI_MAX_ITEMS = 60;

export type OekakiReply = {
  id: string;
  author: string;
  text: string;
  date: string;
  time: string;
  at: number;
};

export type OekakiEntry = {
  id: string;
  author: string;
  comment: string;
  image: string;
  /* 그리는 과정 기록(JSON 문자열)입니다. 너무 크면 남기지 않습니다. */
  replay?: string;
  date: string;
  time: string;
  at: number;
  replies: OekakiReply[];
};

function isReply(value: unknown): value is OekakiReply {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.author === "string" && typeof v.text === "string" && typeof v.at === "number";
}

function isEntry(value: unknown): value is OekakiEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.author === "string" &&
    typeof v.image === "string" &&
    v.image.startsWith("data:image/png;base64,") &&
    typeof v.at === "number"
  );
}

export function loadDrawings(storage: KeyValueStorage): OekakiEntry[] {
  const raw = readJson<unknown>(storage, OEKAKI_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isEntry)
    .map(e => ({
      ...e,
      comment: typeof e.comment === "string" ? e.comment : "",
      date: typeof e.date === "string" ? e.date : formatDate(new Date(e.at)),
      time: typeof e.time === "string" ? e.time : formatTime(new Date(e.at)),
      replies: Array.isArray(e.replies) ? e.replies.filter(isReply) : []
    }))
    .sort((a, b) => b.at - a.at)
    .slice(0, OEKAKI_MAX_ITEMS);
}

function save(storage: KeyValueStorage, items: OekakiEntry[]) {
  writeJson(storage, OEKAKI_KEY, items.slice(0, OEKAKI_MAX_ITEMS));
  return items;
}

export function cleanAuthor(author: string): string {
  const name = author.trim().slice(0, OEKAKI_LIMITS.author);
  if (!name) throw new Error("이름을 적어 주세요.");
  return name;
}

export function addDrawing(
  storage: KeyValueStorage,
  input: { image: string; comment: string; author: string; replay?: string },
  now: Date = new Date()
): OekakiEntry[] {
  if (!input.image.startsWith("data:image/png;base64,")) throw new Error("그림을 만들지 못했어요.");
  if (input.image.length > OEKAKI_LIMITS.image) {
    throw new Error("그림이 너무 복잡해요. 조금 지우고 다시 남겨 주세요.");
  }
  const entry: OekakiEntry = {
    id: makeId("oe"),
    author: cleanAuthor(input.author),
    comment: input.comment.trim().slice(0, OEKAKI_LIMITS.comment),
    image: input.image,
    /* 재생은 덤입니다. 너무 크면 그림만 남깁니다. */
    replay: input.replay && input.replay.length <= OEKAKI_LIMITS.replay ? input.replay : undefined,
    date: formatDate(now),
    time: formatTime(now),
    at: now.getTime(),
    replies: []
  };
  return save(storage, [entry, ...loadDrawings(storage)]);
}

export function deleteDrawing(storage: KeyValueStorage, id: string): OekakiEntry[] {
  return save(storage, loadDrawings(storage).filter(e => e.id !== id));
}

export function addReply(
  storage: KeyValueStorage,
  drawingId: string,
  input: { author: string; text: string },
  now: Date = new Date()
): OekakiEntry[] {
  const text = input.text.trim();
  if (!text) throw new Error("댓글을 적어 주세요.");
  if (text.length > OEKAKI_LIMITS.reply) throw new Error(`댓글은 ${OEKAKI_LIMITS.reply}자까지 쓸 수 있어요.`);
  const author = cleanAuthor(input.author);
  const reply: OekakiReply = {
    id: makeId("re"),
    author,
    text,
    date: formatDate(now),
    time: formatTime(now),
    at: now.getTime()
  };
  return save(
    storage,
    loadDrawings(storage).map(e => (e.id === drawingId ? { ...e, replies: [...e.replies, reply] } : e))
  );
}

export function deleteReply(storage: KeyValueStorage, drawingId: string, replyId: string): OekakiEntry[] {
  return save(
    storage,
    loadDrawings(storage).map(e =>
      e.id === drawingId ? { ...e, replies: e.replies.filter(r => r.id !== replyId) } : e
    )
  );
}
