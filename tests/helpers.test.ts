import { test } from "node:test";
import assert from "node:assert/strict";
import { clock, secondsAt, trackIndexAt } from "../src/lib/bgm.ts";
import { UNSORTED_YEAR, groupByYear, resolveTab } from "../src/lib/blocks.ts";
import { formatDate, formatTime, seoulDay } from "../src/lib/format.ts";
import { StorageFullError, createMemoryStorage, readJson, writeJson, type KeyValueStorage } from "../src/lib/storage.ts";
import { COUNTER_NAMESPACE, VISIT_KEY, counterUrl, dayKey, recordVisit, shouldCount } from "../src/lib/visits.ts";
import { loadAuthor, saveAuthor } from "../src/lib/author.ts";
import type { ContentBlock, TabDef } from "../src/config/site.ts";

function fakeCounter(fail = false) {
  const values = new Map<string, number>();
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    if (fail) return { ok: false, status: 429, json: async () => ({ error: "Too many requests" }) };
    const [, action, ns, key] = new URL(url).pathname.split("/");
    const id = `${ns}/${key}`;
    if (action === "hit") values.set(id, (values.get(id) ?? 0) + 1);
    if (!values.has(id)) return { ok: false, status: 404, json: async () => ({ error: "Key not found" }) };
    return { ok: true, status: 200, json: async () => ({ value: values.get(id) }) };
  };
  return { fetcher, calls, values };
}

test("counter urls use the shared namespace and a Seoul-day key", () => {
  assert.equal(counterUrl("hit", "total"), `https://abacus.jasoncameron.dev/hit/${COUNTER_NAMESPACE}/total`);
  assert.equal(dayKey("2026-09-27"), "day-2026-09-27");
  assert.match(COUNTER_NAMESPACE, /^[A-Za-z0-9_.-]{3,64}$/);
});

test("recordVisit counts a browser once per Seoul day and shares numbers across browsers", async () => {
  const counter = fakeCounter();
  const alice = createMemoryStorage();
  const bob = createMemoryStorage();
  const day1 = new Date("2026-09-27T03:00:00Z");
  const day2 = new Date("2026-09-27T15:30:00Z"); // 서울 기준 9월 28일

  assert.deepEqual(await recordVisit(alice, counter.fetcher, day1), { total: 1, today: 1 });
  assert.deepEqual(await recordVisit(alice, counter.fetcher, day1), { total: 1, today: 1 }, "refresh does not count");
  assert.deepEqual(await recordVisit(bob, counter.fetcher, day1), { total: 2, today: 2 }, "another visitor is added");
  assert.equal(readJson(alice, VISIT_KEY, ""), "2026-09-27");
  assert.equal(shouldCount(alice, "2026-09-27"), false);

  assert.deepEqual(await recordVisit(alice, counter.fetcher, day2), { total: 3, today: 1 }, "today restarts on a new day");
  assert.deepEqual(await recordVisit(bob, counter.fetcher, day2), { total: 4, today: 2 });
});

test("recordVisit reads a missing today counter as 0 and rejects on service errors", async () => {
  const counter = fakeCounter();
  const storage = createMemoryStorage();
  const now = new Date("2026-09-27T03:00:00Z");
  counter.values.set(`${COUNTER_NAMESPACE}/total`, 10);
  storage.setItem(VISIT_KEY, JSON.stringify("2026-09-27"));
  assert.deepEqual(await recordVisit(storage, counter.fetcher, now), { total: 10, today: 0 });
  assert.ok(counter.calls.every(url => url.includes("/get/")), "already counted today: read only");

  const down = fakeCounter(true);
  const fresh = createMemoryStorage();
  await assert.rejects(recordVisit(fresh, down.fetcher, now));
  assert.equal(shouldCount(fresh, "2026-09-27"), true, "a failed visit is retried next time");
});

test("seoulDay uses Asia/Seoul regardless of the machine time zone", () => {
  assert.equal(seoulDay(new Date("2026-09-26T15:30:00Z")), "2026-09-27");
  assert.equal(seoulDay(new Date("2026-09-26T14:59:00Z")), "2026-09-26");
});

test("formatDate/formatTime match the reference yyyy.mm.dd / hh:mm shape", () => {
  const d = new Date(2026, 8, 7, 0, 49);
  assert.equal(formatDate(d), "2026.09.07");
  assert.equal(formatTime(d), "00:49");
});

test("readJson falls back on bad JSON and writeJson maps quota errors", () => {
  const storage = createMemoryStorage();
  storage.setItem("k", "{bad");
  assert.deepEqual(readJson(storage, "k", { a: 1 }), { a: 1 });
  writeJson(storage, "k", { b: 2 });
  assert.deepEqual(readJson(storage, "k", null), { b: 2 });

  const full: KeyValueStorage = {
    getItem: () => null,
    removeItem: () => {},
    setItem: () => {
      const error = new Error("The quota has been exceeded.");
      error.name = "QuotaExceededError";
      throw error;
    }
  };
  assert.throws(() => writeJson(full, "k", 1), StorageFullError);
});

test("author name is remembered, trimmed and capped", () => {
  const storage = createMemoryStorage();
  assert.equal(loadAuthor(storage), "");
  saveAuthor(storage, "  이나  ");
  assert.equal(loadAuthor(storage), "이나");
  saveAuthor(storage, "   ");
  assert.equal(loadAuthor(storage), "이나");
  saveAuthor(storage, "가".repeat(30));
  assert.equal(loadAuthor(storage).length, 20);
});

test("bgm clock and timestamp helpers", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(201), "3:21");
  assert.equal(clock(3747), "1:02:27");
  assert.equal(secondsAt("3:21"), 201);
  assert.equal(secondsAt("1:02:30"), 3750);
  const tracks = [
    { videoId: "v1" },
    { videoId: "v1", startAt: 200 },
    { videoId: "v2", startAt: 0 }
  ];
  assert.equal(trackIndexAt(tracks, "v1", 10), 0);
  assert.equal(trackIndexAt(tracks, "v1", 199.6), 1);
  assert.equal(trackIndexAt(tracks, "v2", 5), 2);
  assert.equal(trackIndexAt(tracks, "zz", 5), -1);
});

test("groupByYear sorts years descending with unsorted last", () => {
  const blocks: ContentBlock[] = [
    { id: "a", type: "text", text: "a", year: "2025" },
    { id: "b", type: "text", text: "b" },
    { id: "c", type: "text", text: "c", year: "2026" },
    { id: "d", type: "text", text: "d", year: " 2025 " }
  ];
  const groups = groupByYear(blocks);
  assert.deepEqual(groups.map(([year]) => year), ["2026", "2025", UNSORTED_YEAR]);
  assert.deepEqual(groups[1][1].map(b => b.id), ["a", "d"]);
});

test("resolveTab accepts ids and labels and falls back to the first tab", () => {
  const tabs: TabDef[] = [
    { id: "home", label: "홈", kind: "home" },
    { id: "projects", label: "프로젝트", kind: "projects" }
  ];
  assert.equal(resolveTab("projects", tabs).id, "projects");
  assert.equal(resolveTab("프로젝트", tabs).id, "projects");
  assert.equal(resolveTab("nope", tabs).id, "home");
  assert.equal(resolveTab(null, tabs).id, "home");
});

test("nextTrackAfterEnd follows list order and wraps to the first song", async () => {
  const { nextTrackAfterEnd } = await import("../src/lib/bgm.ts");
  const list = [
    { id: "a", videoId: "AAAAAAAAAAA" },
    { id: "b", videoId: "BBBBBBBBBBB" },
    { id: "c", videoId: "CCCCCCCCCCC" }
  ];
  assert.equal(nextTrackAfterEnd(list, "a", "AAAAAAAAAAA")?.id, "b");
  assert.equal(nextTrackAfterEnd(list, "b", "BBBBBBBBBBB")?.id, "c", "2 → 3, not back to 1");
  assert.equal(nextTrackAfterEnd(list, "c", "CCCCCCCCCCC")?.id, "a", "last → first");
  assert.equal(nextTrackAfterEnd(list, null, "BBBBBBBBBBB")?.id, "c", "unknown current: use the ended video");
  assert.equal(nextTrackAfterEnd(list, "gone", "ZZZZZZZZZZZ")?.id, "a");
  assert.equal(nextTrackAfterEnd([], "a", "AAAAAAAAAAA"), null);
  assert.equal(nextTrackAfterEnd([list[0]], "a", "AAAAAAAAAAA")?.id, "a", "single song repeats");

  // one long video holding two songs, then another video
  const multi = [
    { id: "m1", videoId: "MMMMMMMMMMM", startAt: 0 },
    { id: "m2", videoId: "MMMMMMMMMMM", startAt: 200 },
    { id: "x", videoId: "XXXXXXXXXXX" }
  ];
  assert.equal(nextTrackAfterEnd(multi, "m2", "MMMMMMMMMMM")?.id, "x");
  assert.equal(nextTrackAfterEnd(multi, "m1", "MMMMMMMMMMM")?.id, "x", "video ended: skip its later songs");
  assert.equal(nextTrackAfterEnd(multi, "x", "XXXXXXXXXXX")?.id, "m1");
});
