/* 낙서장(오에카키) 그림과 덧글입니다. Firestore(oekaki, oekakiReplies, oekakiReplays)에 담겨
   모든 방문자에게 보입니다. 여기에는 입력 검사와 받아 온 문서를 화면용으로 바꾸는 계산만 둡니다.
   (주고받기는 cloud.ts) 제한 값은 원본 OEKAKI_LIMITS 와 같습니다. */
import { formatDate, formatTime } from "../format.ts";
import type { Row } from "../guestbook.ts";

export const OEKAKI_LIMITS = {
  comment: 60,
  image: 300000,
  reply: 100,
  replay: 400000,
  author: 20
} as const;
/* 원본은 최근 60장을 불러옵니다. */
export const OEKAKI_MAX_ITEMS = 60;
export const OEKAKI_MAX_REPLIES = 300;

const PNG_PREFIX = "data:image/png;base64,";

export type OekakiReply = {
  id: string;
  author: string;
  text: string;
  date: string;
  time: string;
  at: number;
  mine: boolean;
};

export type OekakiEntry = {
  id: string;
  author: string;
  comment: string;
  image: string;
  /* 그리는 과정 기록이 따로(oekakiReplays) 있는지. 재생할 때만 불러옵니다. */
  hasReplay: boolean;
  date: string;
  time: string;
  at: number;
  mine: boolean;
  replies: OekakiReply[];
};

export type DrawingInput = { image: string; comment: string; author: string; replay?: string };

export function cleanAuthor(author: string): string {
  const name = author.trim().slice(0, OEKAKI_LIMITS.author);
  if (!name) throw new Error("이름을 적어 주세요.");
  return name;
}

/* 올리기 전 검사. 그림 과정 기록은 덤이라 너무 크면 빼고 그림만 올립니다. */
export function validateDrawing(input: DrawingInput) {
  if (!input.image.startsWith(PNG_PREFIX)) throw new Error("그림을 만들지 못했어요.");
  if (input.image.length > OEKAKI_LIMITS.image) {
    throw new Error("그림이 너무 복잡해요. 조금 지우고 다시 남겨 주세요.");
  }
  return {
    author: cleanAuthor(input.author),
    comment: input.comment.trim().slice(0, OEKAKI_LIMITS.comment),
    image: input.image,
    replay: input.replay && input.replay.length <= OEKAKI_LIMITS.replay ? input.replay : undefined
  };
}

export function validateOekakiReply(input: { author: string; text: string }) {
  const text = input.text.trim();
  if (!text) throw new Error("댓글을 적어 주세요.");
  if (text.length > OEKAKI_LIMITS.reply) throw new Error(`댓글은 ${OEKAKI_LIMITS.reply}자까지 쓸 수 있어요.`);
  return { author: cleanAuthor(input.author), text };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const millis = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Date.now());

/* 문서 목록 → 화면용 목록. 최근 그림이 위, 덧글은 오래된 것이 위입니다.
   PNG 가 아닌 그림과 지워진 그림의 덧글은 보이지 않습니다. */
export function buildDrawings(drawings: readonly Row[], replies: readonly Row[], myUid: string | null): OekakiEntry[] {
  const byDrawing = new Map<string, OekakiReply[]>();
  for (const r of replies) {
    const drawingId = str(r.data.drawingId);
    const author = str(r.data.author);
    const text = str(r.data.text);
    if (!drawingId || !author || !text) continue;
    const at = millis(r.data.createdAt);
    const list = byDrawing.get(drawingId) ?? [];
    list.push({
      id: r.id,
      author,
      text,
      at,
      date: formatDate(new Date(at)),
      time: formatTime(new Date(at)),
      mine: !!myUid && r.data.uid === myUid
    });
    byDrawing.set(drawingId, list);
  }
  return drawings
    .filter(d => str(d.data.author) && str(d.data.image).startsWith(PNG_PREFIX))
    .map(d => {
      const at = millis(d.data.createdAt);
      return {
        id: d.id,
        author: str(d.data.author),
        comment: str(d.data.comment),
        image: str(d.data.image),
        hasReplay: d.data.hasReplay === true,
        at,
        date: formatDate(new Date(at)),
        time: formatTime(new Date(at)),
        mine: !!myUid && d.data.uid === myUid,
        replies: (byDrawing.get(d.id) ?? []).sort((a, b) => a.at - b.at)
      };
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, OEKAKI_MAX_ITEMS);
}
