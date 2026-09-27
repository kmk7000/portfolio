/* 원본은 방명록 댓글·낙서장 이름 칸을 구글 계정 이름으로 채워 줍니다.
   로그인이 없는 이 프로젝트에서는 마지막으로 쓴 이름을 기억했다가 채웁니다. */
import { readJson, writeJson, type KeyValueStorage } from "./storage.ts";

export const AUTHOR_KEY = "cy-author";

export function loadAuthor(storage: KeyValueStorage): string {
  const value = readJson<unknown>(storage, AUTHOR_KEY, "");
  return typeof value === "string" ? value.slice(0, 20) : "";
}

export function saveAuthor(storage: KeyValueStorage, name: string): void {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return;
  try {
    writeJson(storage, AUTHOR_KEY, trimmed);
  } catch {
    /* 이름 기억은 덤이라 실패해도 넘어갑니다. */
  }
}
