/* firestore.rules 검사입니다. Firestore 에뮬레이터가 필요해서 npm test 와 따로 돌립니다.
   npm run test:rules  (Java 가 필요합니다) */
import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, Timestamp } from "firebase/firestore";

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-portfolio",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 }
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const guest = () => env.unauthenticatedContext().firestore();
const google = (uid: string, email: string, verified = true) =>
  env.authenticatedContext(uid, { email, email_verified: verified, firebase: { sign_in_provider: "google.com" } }).firestore();
const owner = () => google("owner", "milk454537@gmail.com");
const owner2 = () => google("owner2", "milk45453@gmail.com");
const png = "data:image/png;base64,iVBORw0KGgo=";

const entry = (uid: string, over: Record<string, unknown> = {}) => ({
  author: "친구",
  text: "놀러 왔어요",
  uid,
  createdAt: serverTimestamp(),
  ...over
});
const drawing = (uid: string, over: Record<string, unknown> = {}) => ({
  author: "친구",
  comment: "",
  image: png,
  hasReplay: false,
  hidden: false,
  uid,
  createdAt: serverTimestamp(),
  ...over
});

test("anyone can read; only signed-in visitors can write, as themselves", async () => {
  await assertSucceeds(getDoc(doc(guest(), "guestbook/x")));
  await assertFails(setDoc(doc(guest(), "guestbook/a"), entry("nobody")));
  await assertFails(setDoc(doc(as("alice"), "guestbook/a"), entry("bob")));
  await assertSucceeds(setDoc(doc(as("alice"), "guestbook/a"), entry("alice")));
});

test("guestbook entries are validated", async () => {
  const db = as("alice");
  await assertFails(setDoc(doc(db, "guestbook/1"), entry("alice", { text: "   " })));
  await assertFails(setDoc(doc(db, "guestbook/2"), entry("alice", { text: "가".repeat(101) })));
  await assertFails(setDoc(doc(db, "guestbook/3"), entry("alice", { author: "가".repeat(21) })));
  await assertFails(setDoc(doc(db, "guestbook/4"), entry("alice", { createdAt: Timestamp.fromMillis(0) })));
  await assertFails(setDoc(doc(db, "guestbook/5"), entry("alice", { admin: true })));
  await assertSucceeds(setDoc(doc(db, "guestbook/6"), entry("alice", { text: "가".repeat(100) })));
});

test("no edits; only the writer deletes their entry", async () => {
  await assertSucceeds(setDoc(doc(as("alice"), "guestbook/a"), entry("alice")));
  await assertFails(updateDoc(doc(as("alice"), "guestbook/a"), { text: "고침" }));
  await assertFails(deleteDoc(doc(as("bob"), "guestbook/a")));
  await assertFails(deleteDoc(doc(guest(), "guestbook/a")));
  await assertSucceeds(deleteDoc(doc(as("alice"), "guestbook/a")));
});

test("replies need an existing entry; reply writer or entry writer can delete", async () => {
  await assertSucceeds(setDoc(doc(as("alice"), "guestbook/a"), entry("alice")));
  const reply = (uid: string, entryId = "a") => ({ entryId, author: "밥", text: "안녕", uid, createdAt: serverTimestamp() });
  await assertFails(setDoc(doc(as("bob"), "guestbookReplies/none"), reply("bob", "missing")));
  await assertSucceeds(setDoc(doc(as("bob"), "guestbookReplies/r1"), reply("bob")));
  await assertSucceeds(setDoc(doc(as("bob"), "guestbookReplies/r2"), reply("bob")));
  await assertFails(deleteDoc(doc(as("carol"), "guestbookReplies/r1")));
  await assertSucceeds(deleteDoc(doc(as("bob"), "guestbookReplies/r1")));

  const alice = as("alice");
  const batch = writeBatch(alice);
  batch.delete(doc(alice, "guestbookReplies/r2"));
  batch.delete(doc(alice, "guestbook/a"));
  await assertSucceeds(batch.commit());
});

test("drawings: png data only, size-limited; replay saved with its drawing", async () => {
  const db = as("alice");
  await assertFails(setDoc(doc(db, "oekaki/bad"), drawing("alice", { image: "javascript:alert(1)" })));
  await assertFails(setDoc(doc(db, "oekaki/big"), drawing("alice", { image: png + "A".repeat(300000) })));
  await assertFails(setDoc(doc(db, "oekaki/long"), drawing("alice", { comment: "가".repeat(61) })));

  const batch = writeBatch(db);
  batch.set(doc(db, "oekaki/d1"), drawing("alice", { hasReplay: true }));
  batch.set(doc(db, "oekakiReplays/d1"), { replay: "[]", uid: "alice" });
  await assertSucceeds(batch.commit());

  await assertFails(setDoc(doc(as("bob"), "oekakiReplays/d1-x"), { replay: "[]", uid: "bob" }));
  await assertFails(setDoc(doc(as("bob"), "oekakiReplays/d1"), { replay: "[]", uid: "bob" }));
  await assertFails(deleteDoc(doc(as("bob"), "oekaki/d1")));

  const reply = { drawingId: "d1", author: "밥", text: "귀여워요", uid: "bob", createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(as("bob"), "oekakiReplies/r1"), reply));

  const remove = writeBatch(db);
  remove.delete(doc(db, "oekakiReplies/r1"));
  remove.delete(doc(db, "oekakiReplays/d1"));
  remove.delete(doc(db, "oekaki/d1"));
  await assertSucceeds(remove.commit());
});

test("other collections are closed", async () => {
  await assertFails(setDoc(doc(as("alice"), "counters/site"), { total: 1 }));
  await assertFails(getDoc(doc(guest(), "users/alice")));
});

test("only the two owner Google accounts can edit site content and upload images", async () => {
  const content = { profile: { ownerName: "민규" }, tabs: [], blocks: {}, waveLinks: [] };
  await assertSucceeds(getDoc(doc(guest(), "site/content")));
  await assertFails(setDoc(doc(as("alice"), "site/content"), content));
  await assertFails(setDoc(doc(google("x", "someone@gmail.com"), "site/content"), content));
  await assertFails(setDoc(doc(google("y", "milk454537@gmail.com", false), "site/content"), content));
  const anonWithEmail = env.authenticatedContext("z", { email: "milk454537@gmail.com", email_verified: true, firebase: { sign_in_provider: "anonymous" } }).firestore();
  await assertFails(setDoc(doc(anonWithEmail, "site/content"), content));
  await assertSucceeds(setDoc(doc(owner(), "site/content"), content));
  await assertSucceeds(setDoc(doc(owner2(), "site/content"), { furniture: {} }, { merge: true }));
  await assertSucceeds(setDoc(doc(owner(), "site/content"), { bgm: [{ id: "a", title: "Myself", videoId: "Yh14pDsD5DQ" }] }, { merge: true }));
  await assertFails(setDoc(doc(as("alice"), "site/content"), { bgm: [] }, { merge: true }));
  await assertFails(setDoc(doc(owner(), "site/content"), { ownerUid: "hijack" }, { merge: true }));
  await assertFails(deleteDoc(doc(owner(), "site/content")));

  const jpg = "data:image/jpeg;base64,/9j/4AAQ";
  await assertFails(setDoc(doc(as("alice"), "images/a"), { dataUrl: jpg }));
  await assertFails(setDoc(doc(owner(), "images/svg"), { dataUrl: "data:image/svg+xml;base64,PHN2Zz4=" }));
  await assertSucceeds(setDoc(doc(owner(), "images/a"), { dataUrl: jpg }));
  await assertSucceeds(getDoc(doc(guest(), "images/a")));
  await assertFails(deleteDoc(doc(as("alice"), "images/a")));
  await assertSucceeds(deleteDoc(doc(owner(), "images/a")));
});

test("owner can delete anyone's guestbook entries and replies", async () => {
  await assertSucceeds(setDoc(doc(as("alice"), "guestbook/a"), entry("alice")));
  await assertSucceeds(
    setDoc(doc(as("bob"), "guestbookReplies/r"), { entryId: "a", author: "밥", text: "안녕", uid: "bob", createdAt: serverTimestamp() })
  );
  await assertFails(updateDoc(doc(owner(), "guestbook/a"), { text: "고침" }));
  await assertSucceeds(deleteDoc(doc(owner(), "guestbookReplies/r")));
  await assertSucceeds(deleteDoc(doc(owner(), "guestbook/a")));
});

test("owner can hide drawings; hidden drawings and replays are owner-only", async () => {
  const db = as("alice");
  await assertFails(setDoc(doc(db, "oekaki/h"), drawing("alice", { hidden: true })));
  const batch = writeBatch(db);
  batch.set(doc(db, "oekaki/d"), drawing("alice", { hasReplay: true }));
  batch.set(doc(db, "oekakiReplays/d"), { replay: "[]", uid: "alice" });
  await assertSucceeds(batch.commit());

  await assertFails(updateDoc(doc(db, "oekaki/d"), { hidden: true }));
  await assertFails(updateDoc(doc(owner(), "oekaki/d"), { hidden: true, comment: "x" }));
  await assertSucceeds(updateDoc(doc(owner(), "oekaki/d"), { hidden: true }));

  await assertFails(getDoc(doc(guest(), "oekaki/d")));
  await assertFails(getDoc(doc(guest(), "oekakiReplays/d")));
  await assertSucceeds(getDocs(query(collection(guest(), "oekaki"), where("hidden", "==", false))));
  await assertFails(getDocs(collection(guest(), "oekaki")));
  await assertSucceeds(getDoc(doc(owner(), "oekaki/d")));
  await assertSucceeds(getDoc(doc(owner(), "oekakiReplays/d")));
  await assertSucceeds(getDocs(collection(owner(), "oekaki")));

  const o = owner();
  const remove = writeBatch(o);
  remove.delete(doc(o, "oekakiReplays/d"));
  remove.delete(doc(o, "oekaki/d"));
  await assertSucceeds(remove.commit());
});
