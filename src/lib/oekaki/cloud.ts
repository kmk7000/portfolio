/* 낙서장을 Firestore 와 주고받습니다. 낙서장 탭을 열었을 때만 불러옵니다. */
import { cloud, currentUid, ensureUid, type Cloud } from "../firebase.ts";
import { isOwnerUser } from "../site-content.ts";
import { toRows } from "../guestbook-cloud.ts";
import type { Row } from "../guestbook.ts";
import {
  OEKAKI_MAX_ITEMS,
  OEKAKI_MAX_REPLIES,
  buildDrawings,
  validateDrawing,
  validateOekakiReply,
  type DrawingInput,
  type OekakiEntry
} from "./store.ts";

export function subscribeOekaki(onData: (items: OekakiEntry[]) => void, onError: (error: unknown) => void) {
  let stopped = false;
  const stops: (() => void)[] = [];

  cloud()
    .then(async ({ db, fs, auth }: Cloud) => {
      if (stopped) return;
      let uid = await currentUid();
      let drawings: Row[] | null = null;
      let replies: Row[] | null = null;
      const emit = () => {
        if (drawings && replies) onData(buildDrawings(drawings, replies, uid));
      };
      const { query, collection, orderBy, limit, where, onSnapshot } = fs;
      /* 가린 그림은 주인장만 읽을 수 있어서, 방문자는 hidden == false 로 걸러야 규칙이 통과시킵니다.
         로그인 상태가 바뀌면(주인장 로그인/로그아웃) 목록 구독을 다시 겁니다. */
      let owner: boolean | null = null;
      let stopDrawings: (() => void) | null = null;
      const listen = (asOwner: boolean) => {
        if (owner === asOwner) return;
        owner = asOwner;
        stopDrawings?.();
        drawings = null;
        const q = asOwner
          ? query(collection(db, "oekaki"), orderBy("createdAt", "desc"), limit(OEKAKI_MAX_ITEMS))
          : query(collection(db, "oekaki"), where("hidden", "==", false), orderBy("createdAt", "desc"), limit(OEKAKI_MAX_ITEMS));
        stopDrawings = onSnapshot(
          q,
          snap => {
            drawings = toRows(snap);
            emit();
          },
          onError
        );
      };
      listen(isOwnerUser(auth.currentUser));
      stops.push(
        () => stopDrawings?.(),
        onSnapshot(
          query(collection(db, "oekakiReplies"), orderBy("createdAt", "desc"), limit(OEKAKI_MAX_REPLIES)),
          snap => {
            replies = toRows(snap);
            emit();
          },
          onError
        ),
        auth.onIdTokenChanged(user => {
          uid = user?.uid ?? null;
          listen(isOwnerUser(user));
          emit();
        })
      );
      if (stopped) stops.forEach(stop => stop());
    })
    .catch(onError);

  return () => {
    stopped = true;
    stops.forEach(stop => stop());
  };
}

/* 그림과 그리는 과정 기록을 한 번에 올립니다. */
export async function addDrawing(input: DrawingInput): Promise<void> {
  const valid = validateDrawing(input);
  const uid = await ensureUid();
  const { db, fs } = await cloud();
  const ref = fs.doc(fs.collection(db, "oekaki"));
  const batch = fs.writeBatch(db);
  batch.set(ref, {
    author: valid.author,
    comment: valid.comment,
    image: valid.image,
    hasReplay: !!valid.replay,
    hidden: false,
    uid,
    createdAt: fs.serverTimestamp()
  });
  if (valid.replay) batch.set(fs.doc(db, "oekakiReplays", ref.id), { replay: valid.replay, uid });
  await batch.commit();
}

/* 그림을 지우면 과정 기록과 덧글도 함께 지웁니다. */
export async function deleteDrawing(item: OekakiEntry): Promise<void> {
  const { db, fs } = await cloud();
  const batch = fs.writeBatch(db);
  const replies = await fs.getDocs(fs.query(fs.collection(db, "oekakiReplies"), fs.where("drawingId", "==", item.id)));
  replies.docs.forEach(r => batch.delete(r.ref));
  if (item.hasReplay) batch.delete(fs.doc(db, "oekakiReplays", item.id));
  batch.delete(fs.doc(db, "oekaki", item.id));
  await batch.commit();
}

export async function addReply(drawingId: string, input: { author: string; text: string }): Promise<void> {
  const valid = validateOekakiReply(input);
  const uid = await ensureUid();
  const { db, fs } = await cloud();
  await fs.addDoc(fs.collection(db, "oekakiReplies"), { drawingId, ...valid, uid, createdAt: fs.serverTimestamp() });
}

export async function deleteReply(replyId: string): Promise<void> {
  const { db, fs } = await cloud();
  await fs.deleteDoc(fs.doc(db, "oekakiReplies", replyId));
}

/* 주인장 전용: 그림 가리기/풀기 */
export async function setDrawingHidden(id: string, hidden: boolean): Promise<void> {
  const { db, fs } = await cloud();
  await fs.updateDoc(fs.doc(db, "oekaki", id), { hidden });
}

export async function loadReplay(drawingId: string): Promise<string | null> {
  const { db, fs } = await cloud();
  const snap = await fs.getDoc(fs.doc(db, "oekakiReplays", drawingId));
  const replay = snap.exists() ? snap.data().replay : null;
  return typeof replay === "string" ? replay : null;
}
