import { test } from "node:test";
import assert from "node:assert/strict";
import { clock, secondsAt, trackIndexAt } from "../src/lib/bgm.ts";
import { UNSORTED_YEAR, groupByYear, resolveTab } from "../src/lib/blocks.ts";
import { formatDate, formatTime, seoulDay } from "../src/lib/format.ts";
import { StorageFullError, createMemoryStorage, readJson, writeJson, type KeyValueStorage } from "../src/lib/storage.ts";
import { VISIT_KEY, nextVisitCounts, recordVisit } from "../src/lib/visits.ts";
import { loadAuthor, saveAuthor } from "../src/lib/author.ts";
import type { ContentBlock, TabDef } from "../src/config/site.ts";

test("visit counter increments today on the same Seoul day and resets on a new day", () => {
  assert.deepEqual(nextVisitCounts(null, "2026-09-27"), { total: 1, today: 1, day: "2026-09-27" });
  assert.deepEqual(nextVisitCounts({ total: 602, today: 13, day: "2026-09-27" }, "2026-09-27"), {
    total: 603,
    today: 14,
    day: "2026-09-27"
  });
  assert.deepEqual(nextVisitCounts({ total: 602, today: 13, day: "2026-09-26" }, "2026-09-27"), {
    total: 603,
    today: 1,
    day: "2026-09-27"
  });
  assert.deepEqual(nextVisitCounts({ total: "x", today: 1, day: "d" }, "2026-09-27").total, 1);
});

test("recordVisit persists counts", () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-09-27T03:00:00Z");
  assert.deepEqual(recordVisit(storage, now), { total: 1, today: 1 });
  assert.deepEqual(recordVisit(storage, now), { total: 2, today: 2 });
  assert.equal(readJson<{ day: string }>(storage, VISIT_KEY, { day: "" }).day, "2026-09-27");
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
