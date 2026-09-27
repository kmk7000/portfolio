/* 프로필·사진첩 블록과 탭 딥링크에서 쓰는 계산입니다. */
import type { ContentBlock, TabDef } from "../config/site.ts";

export const UNSORTED_YEAR = "기타";

/* 연도별 보기: 연도가 큰 순서로 묶고, 연도가 없는 건 맨 뒤 "기타" 로 보냅니다. */
export function groupByYear(blocks: readonly ContentBlock[]): [string, ContentBlock[]][] {
  const map = new Map<string, ContentBlock[]>();
  blocks.forEach(block => {
    const key = (block.year ?? "").trim() || UNSORTED_YEAR;
    map.set(key, [...(map.get(key) ?? []), block]);
  });
  return Array.from(map.entries()).sort(([a], [b]) => {
    if (a === UNSORTED_YEAR) return 1;
    if (b === UNSORTED_YEAR) return -1;
    return b.localeCompare(a);
  });
}

/* ?tab=board 나 ?tab=게시판 처럼 들어온 값을 탭으로 바꿉니다. 모르는 값이면 첫 탭입니다. */
export function resolveTab(param: string | null, tabs: readonly TabDef[]): TabDef {
  const wanted = (param ?? "").trim();
  return tabs.find(t => t.id === wanted || t.label === wanted) ?? tabs[0];
}
