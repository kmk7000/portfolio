import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GUESTBOOK_KEY,
  GUESTBOOK_LIMITS,
  GUESTBOOK_MAX_ENTRIES,
  addLocalEntry,
  addLocalReply,
  loadLocalEntries,
  mergeWithSeed,
  paginate,
  removeLocalEntry,
  removeLocalReply,
  validateGuestbookInput,
  validateReplyInput
} from "../src/lib/guestbook.ts";
import { createMemoryStorage } from "../src/lib/storage.ts";

const seed = [{ id: "seed-1", author: "민규", text: "안녕하세요", date: "2026-08-30" }];

test("validation trims input and rejects empty or too long values", () => {
  assert.deepEqual(validateGuestbookInput("  이나 ", " 퍼가요~♡ "), { author: "이나", text: "퍼가요~♡" });
  assert.throws(() => validateGuestbookInput(" ", "글"), /이름과 방명록을 모두/);
  assert.throws(() => validateGuestbookInput("이름", "   "), /이름과 방명록을 모두/);
  assert.throws(() => validateGuestbookInput("가".repeat(GUESTBOOK_LIMITS.author + 1), "글"), /이름은 20자/);
  assert.throws(() => validateGuestbookInput("이름", "가".repeat(GUESTBOOK_LIMITS.text + 1)), /방명록은 100자/);
  assert.throws(() => validateReplyInput("이름", ""), /이름과 댓글을 모두/);
});

test("entries are saved newest first with a dotted date", () => {
  const storage = createMemoryStorage();
  addLocalEntry(storage, "첫째", "하나", new Date(2026, 8, 1, 10, 0));
  const list = addLocalEntry(storage, "둘째", "둘", new Date(2026, 8, 7, 9, 5));
  assert.deepEqual(list.map(e => e.author), ["둘째", "첫째"]);
  assert.equal(list[0].date, "2026.09.07");
  assert.ok(list.every(e => e.mine && e.replies.length === 0));
  assert.deepEqual(loadLocalEntries(storage).map(e => e.author), ["둘째", "첫째"]);
});

test("entries are capped at the maximum and can be removed", () => {
  const storage = createMemoryStorage();
  for (let i = 0; i < GUESTBOOK_MAX_ENTRIES + 5; i++) addLocalEntry(storage, `이름${i}`, "글", new Date(2026, 0, 1, 0, i));
  const list = loadLocalEntries(storage);
  assert.equal(list.length, GUESTBOOK_MAX_ENTRIES);
  assert.equal(list[0].author, `이름${GUESTBOOK_MAX_ENTRIES + 4}`);
  const after = removeLocalEntry(storage, list[0].id);
  assert.equal(after.length, GUESTBOOK_MAX_ENTRIES - 1);
  assert.equal(after.some(e => e.id === list[0].id), false);
});

test("replies are attached to their entry and can be deleted", () => {
  const storage = createMemoryStorage();
  const [entry] = addLocalEntry(storage, "창욱", "노래 좋아요");
  let list = addLocalReply(storage, entry.id, "N", "고마워요", new Date(2026, 8, 7));
  list = addLocalReply(storage, entry.id, "이나", "저도요", new Date(2026, 8, 8));
  assert.deepEqual(list[0].replies.map(r => r.text), ["고마워요", "저도요"]);
  list = removeLocalReply(storage, entry.id, list[0].replies[0].id);
  assert.deepEqual(list[0].replies.map(r => r.text), ["저도요"]);
});

test("corrupt or foreign storage values are ignored", () => {
  const storage = createMemoryStorage();
  storage.setItem(GUESTBOOK_KEY, "{not json");
  assert.deepEqual(loadLocalEntries(storage), []);
  storage.setItem(GUESTBOOK_KEY, JSON.stringify({ hello: 1 }));
  assert.deepEqual(loadLocalEntries(storage), []);
  storage.setItem(GUESTBOOK_KEY, JSON.stringify([{ id: 1 }, { id: "ok", author: "a", text: "b", date: "d", createdAt: 1 }]));
  const list = loadLocalEntries(storage);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].replies, []);
});

test("mergeWithSeed puts the seed after local entries without delete rights", () => {
  const storage = createMemoryStorage();
  const local = addLocalEntry(storage, "이나", "퍼가요");
  const merged = mergeWithSeed(local, seed);
  assert.deepEqual(merged.map(e => e.author), ["이나", "민규"]);
  assert.equal(merged[1].mine, false);
  assert.deepEqual(mergeWithSeed([], seed).map(e => e.id), ["seed-1"]);
});

test("paginate clamps the page and slices five per page", () => {
  const items = Array.from({ length: 12 }, (_, i) => i);
  assert.deepEqual(paginate(items, 0, 5), { pageCount: 3, current: 0, items: [0, 1, 2, 3, 4] });
  assert.deepEqual(paginate(items, 2, 5).items, [10, 11]);
  assert.equal(paginate(items, 9, 5).current, 2);
  assert.equal(paginate(items, -1, 5).current, 0);
  assert.deepEqual(paginate([], 0, 5), { pageCount: 1, current: 0, items: [] });
});
