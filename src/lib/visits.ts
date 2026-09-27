/* 미니홈피 왼쪽 위 TODAY / TOTAL 방문 수입니다.
   GitHub Pages 에는 서버가 없어서, 모든 방문자가 같은 숫자를 보도록 무료 카운터 서비스
   Abacus(https://abacus.jasoncameron.dev, 가입·키 불필요)에 숫자를 담습니다.
   - TOTAL: "total" 카운터
   - TODAY: 서울 날짜별 카운터 "day-2026-09-27" (날짜가 바뀌면 자연히 0부터 다시 셉니다)
   싸이월드처럼 한 브라우저는 하루에 한 번만 셉니다. 새로고침할 때마다 오르지 않도록
   오늘 이미 셌는지를 localStorage 에 적어 둡니다. */
import { seoulDay } from "./format.ts";
import { readJson, writeJson, type KeyValueStorage } from "./storage.ts";

export const VISIT_KEY = "cy-visited-day";
export const COUNTER_BASE = "https://abacus.jasoncameron.dev";
/* 실제 사이트(kmk7000.github.io)가 아닌 곳, 예를 들어 로컬 개발·미리보기에서 들어온 방문은
   실제 숫자에 섞이지 않게 따로 셉니다. */
const LIVE_HOST = "kmk7000.github.io";
const isLive = typeof location !== "undefined" && location.hostname === LIVE_HOST;
export const COUNTER_NAMESPACE = isLive ? "kmk7000.github.io-portfolio" : "kmk7000.github.io-portfolio-dev";

export type VisitCounts = { total: number; today: number };
type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export function counterUrl(action: "hit" | "get", key: string): string {
  return `${COUNTER_BASE}/${action}/${COUNTER_NAMESPACE}/${key}`;
}

export function dayKey(day: string): string {
  return `day-${day}`;
}

/* 오늘 이 브라우저에서 이미 셌으면 숫자만 읽고(get), 아니면 1 올립니다(hit). */
export function shouldCount(storage: KeyValueStorage, day: string): boolean {
  return readJson<unknown>(storage, VISIT_KEY, null) !== day;
}

/* 아직 한 번도 안 올린 카운터는 404 이므로 0 으로 봅니다. 그 밖의 실패는 던집니다. */
async function readCounter(fetcher: FetchLike, url: string): Promise<number> {
  const res = await fetcher(url);
  if (res.status === 404) return 0;
  if (!res.ok) throw new Error(`counter ${res.status}`);
  const body = (await res.json()) as { value?: unknown };
  const value = Number(body?.value);
  if (!Number.isFinite(value) || value < 0) throw new Error("counter: bad value");
  return value;
}

export async function recordVisit(
  storage: KeyValueStorage,
  fetcher: FetchLike = url => fetch(url),
  now: Date = new Date()
): Promise<VisitCounts> {
  const day = seoulDay(now);
  const count = shouldCount(storage, day);
  const action = count ? "hit" : "get";
  const [total, today] = await Promise.all([
    readCounter(fetcher, counterUrl(action, "total")),
    readCounter(fetcher, counterUrl(action, dayKey(day)))
  ]);
  if (count) {
    try {
      writeJson(storage, VISIT_KEY, day);
    } catch {
      /* 적지 못하면 다음 방문 때 한 번 더 셀 뿐입니다. */
    }
  }
  return { total, today };
}
