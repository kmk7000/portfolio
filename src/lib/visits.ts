/* 미니홈피 왼쪽 위 TODAY / TOTAL 방문 수입니다.
   원본은 Firestore counters/site 문서에 total, today, day 를 담습니다. 여기서는 같은 모양을
   localStorage 에 담습니다. 서버가 없으므로 "이 브라우저에서 들어온 횟수" 입니다. */
import { seoulDay } from "./format.ts";
import { readJson, writeJson, type KeyValueStorage } from "./storage.ts";

export const VISIT_KEY = "cy-visits";

export type VisitCounts = { total: number; today: number };
type StoredCounts = VisitCounts & { day: string };

function isStored(value: unknown): value is StoredCounts {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Number.isFinite(v.total) &&
    Number.isFinite(v.today) &&
    typeof v.day === "string" &&
    (v.total as number) >= 0 &&
    (v.today as number) >= 0
  );
}

/* 날짜가 바뀐 뒤 첫 방문이면 오늘 수를 1부터 다시 셉니다. */
export function nextVisitCounts(previous: unknown, day: string): StoredCounts {
  if (!isStored(previous)) return { total: 1, today: 1, day };
  return {
    total: previous.total + 1,
    today: previous.day === day ? previous.today + 1 : 1,
    day
  };
}

export function recordVisit(storage: KeyValueStorage, now: Date = new Date()): VisitCounts {
  const next = nextVisitCounts(readJson<unknown>(storage, VISIT_KEY, null), seoulDay(now));
  try {
    writeJson(storage, VISIT_KEY, next);
  } catch {
    /* 저장을 못 해도 이번 화면에는 숫자를 보여 줍니다. */
  }
  return { total: next.total, today: next.today };
}
