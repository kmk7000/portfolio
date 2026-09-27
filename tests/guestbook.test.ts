import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GUESTBOOK_LIMITS,
  GUESTBOOK_MAX_ENTRIES,
  buildEntries,
  mergeWithSeed,
  paginate,
  validateGuestbookInput,
  validateReplyInput
} from "../src/lib/guestbook.ts";

const seed = [{ id: "seed-1", author: "민규", text: "안녕하세요", date: "2026-08-30" }];

test("validation trims input and rejects empty or too long values", () => {
  assert.deepEqual(validateGuestbookInput("  이나 ", " 퍼가요~♡ "), { author: "이나", text: "퍼가요~♡" });
  assert.throws(() => validateGuestbookInput(" ", "글"), /이름과 방명록을 모두/);
  assert.throws(() => validateGuestbookInput("이름", "   "), /이름과 방명록을 모두/);
  assert.throws(() => validateGuestbookInput("가".repeat(GUESTBOOK_LIMITS.author + 1), "글"), /이름은 20자/);
  assert.throws(() => validateGuestbookInput("이름", "가".repeat(GUESTBOOK_LIMITS.text + 1)), /방명록은 100자/);
  assert.throws(() => validateReplyInput("이름", ""), /이름과 댓글을 모두/);
});

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime();
const row = (id: string, data: Record<string, unknown>) => ({ id, data });

test("buildEntries sorts newest first, dates entries and marks my own", () => {
  const list = buildEntries(
    [
      row("a", { author: "첫째", text: "하나", uid: "me", createdAt: at(2026, 8, 1, 10) }),
      row("b", { author: "둘째", text: "둘", uid: "you", createdAt: at(2026, 8, 7, 9, 5) })
    ],
    [],
    "me"
  );
  assert.deepEqual(list.map(e => e.author), ["둘째", "첫째"]);
  assert.equal(list[0].date, "2026.09.07");
  assert.deepEqual(list.map(e => e.mine), [false, true]);
  assert.equal(buildEntries(list.map(e => row(e.id, { ...e, uid: "me" })), [], null).some(e => e.mine), false);
});

test("buildEntries attaches replies oldest first and drops orphans and bad rows", () => {
  const list = buildEntries(
    [row("a", { author: "창욱", text: "노래 좋아요", uid: "x", createdAt: at(2026, 8, 7) }), row("bad", { author: 1 })],
    [
      row("r2", { entryId: "a", author: "이나", text: "저도요", uid: "me", createdAt: at(2026, 8, 8) }),
      row("r1", { entryId: "a", author: "민규", text: "고마워요", uid: "y", createdAt: at(2026, 8, 7, 1) }),
      row("r3", { entryId: "gone", author: "누구", text: "고아", uid: "y", createdAt: at(2026, 8, 9) }),
      row("r4", { entryId: "a", author: "", text: "빈 이름", createdAt: at(2026, 8, 9) })
    ],
    "me"
  );
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].replies.map(r => r.text), ["고마워요", "저도요"]);
  assert.deepEqual(list[0].replies.map(r => r.mine), [false, true]);
});

test("buildEntries keeps only the newest entries up to the maximum", () => {
  const rows = Array.from({ length: GUESTBOOK_MAX_ENTRIES + 5 }, (_, i) =>
    row(`e${i}`, { author: `이름${i}`, text: "글", createdAt: at(2026, 0, 1, 0, i) })
  );
  const list = buildEntries(rows, [], null);
  assert.equal(list.length, GUESTBOOK_MAX_ENTRIES);
  assert.equal(list[0].author, `이름${GUESTBOOK_MAX_ENTRIES + 4}`);
});

test("mergeWithSeed puts the seed last, not deletable and without replies", () => {
  const shared = buildEntries([row("a", { author: "이나", text: "퍼가요", uid: "me", createdAt: 1 })], [], "me");
  const merged = mergeWithSeed(shared, seed);
  assert.deepEqual(merged.map(e => e.author), ["이나", "민규"]);
  assert.equal(merged[1].mine, false);
  assert.equal(merged[1].seed, true);
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
