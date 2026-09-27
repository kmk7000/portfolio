/* 프로젝트 탭의 주소(?tab=projects&project=sellitmate)를 다루는 계산입니다. */
import type { Project } from "../config/site.ts";

export const PROJECT_PARAM = "project";

/* 주소에 들어온 값에 맞는 프로젝트입니다. 비었거나 모르는 값이면 null 입니다. */
export function findProject(list: readonly Project[], id: string | null | undefined): Project | null {
  const wanted = (id ?? "").trim();
  if (!wanted) return null;
  return list.find(project => project.id === wanted) ?? null;
}

/* 지금 주소의 쿼리에서 tab·project 만 바꾼 새 쿼리입니다. 다른 값(utm 등)은 그대로 둡니다.
   projectId 가 null 이면 project 를 지워 목록 주소가 됩니다. */
export function projectSearch(search: string, tabId: string, projectId: string | null): string {
  const params = new URLSearchParams(search);
  params.set("tab", tabId);
  if (projectId) params.set(PROJECT_PARAM, projectId);
  else params.delete(PROJECT_PARAM);
  return `?${params.toString()}`;
}
