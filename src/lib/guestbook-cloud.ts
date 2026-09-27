/* 방명록을 Firestore 와 주고받습니다. 화면은 subscribeGuestbook 으로 실시간 목록을 받습니다. */
import { cloud, currentUid, ensureUid, type Cloud } from "./firebase.ts";
import {
  GUESTBOOK_MAX_ENTRIES,
  GUESTBOOK_MAX_REPLIES,
  buildEntries,
  validateGuestbookInput,
  validateReplyInput,
  type GuestbookEntry,
  type Row
} from "./guestbook.ts";

type Snap = { docs: { id: string; data(options: { serverTimestamps: "estimate" }): Record<string, unknown> }[] };

/* 아직 서버 시각이 안 찍힌(방금 쓴) 문서도 추정 시각으로 바로 보이게 합니다. */
export function toRows(snap: Snap): Row[] {
  return snap.docs.map(d => {
    const data = d.data({ serverTimestamps: "estimate" });
    const at = data.createdAt as { toMillis?: () => number } | null | undefined;
    return { id: d.id, data: { ...data, createdAt: at?.toMillis ? at.toMillis() : Date.now() } };
  });
}

/* uid 가 바뀌면(첫 글을 써서 익명 계정이 생기면) "내 글" 표시도 다시 계산합니다. */
export function subscribeGuestbook(onData: (entries: GuestbookEntry[]) => void, onError: (error: unknown) => void) {
  let stopped = false;
  const stops: (() => void)[] = [];

  cloud()
    .then(async ({ db, fs, auth }: Cloud) => {
      if (stopped) return;
      let uid = await currentUid();
      let entries: Row[] | null = null;
      let replies: Row[] | null = null;
      const emit = () => {
        if (entries && replies) onData(buildEntries(entries, replies, uid));
      };
      const { query, collection, orderBy, limit, onSnapshot } = fs;
      stops.push(
        onSnapshot(
          query(collection(db, "guestbook"), orderBy("createdAt", "desc"), limit(GUESTBOOK_MAX_ENTRIES)),
          snap => {
            entries = toRows(snap);
            emit();
          },
          onError
        ),
        onSnapshot(
          query(collection(db, "guestbookReplies"), orderBy("createdAt", "desc"), limit(GUESTBOOK_MAX_REPLIES)),
          snap => {
            replies = toRows(snap);
            emit();
          },
          onError
        ),
        auth.onIdTokenChanged(user => {
          uid = user?.uid ?? null;
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

export async function addEntry(author: string, text: string): Promise<void> {
  const valid = validateGuestbookInput(author, text);
  const uid = await ensureUid();
  const { db, fs } = await cloud();
  await fs.addDoc(fs.collection(db, "guestbook"), { ...valid, uid, createdAt: fs.serverTimestamp() });
}

export async function addReply(entryId: string, author: string, text: string): Promise<void> {
  const valid = validateReplyInput(author, text);
  const uid = await ensureUid();
  const { db, fs } = await cloud();
  await fs.addDoc(fs.collection(db, "guestbookReplies"), { entryId, ...valid, uid, createdAt: fs.serverTimestamp() });
}

/* 글을 지우면 그 아래 댓글도 함께 지웁니다. (글쓴이는 규칙상 댓글도 지울 수 있습니다) */
export async function removeEntry(entry: GuestbookEntry): Promise<void> {
  const { db, fs } = await cloud();
  const batch = fs.writeBatch(db);
  const replies = await fs.getDocs(fs.query(fs.collection(db, "guestbookReplies"), fs.where("entryId", "==", entry.id)));
  replies.docs.forEach(r => batch.delete(r.ref));
  batch.delete(fs.doc(db, "guestbook", entry.id));
  await batch.commit();
}

export async function removeReply(replyId: string): Promise<void> {
  const { db, fs } = await cloud();
  await fs.deleteDoc(fs.doc(db, "guestbookReplies", replyId));
}
