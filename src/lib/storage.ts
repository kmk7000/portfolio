/* 원본은 방명록·방문 수·낙서장을 Firestore 에 저장합니다. 이 프로젝트에는 서버가 없으므로
   방명록·낙서장은 브라우저 localStorage 에 담습니다. (이 브라우저에서만 보입니다.)
   방문 수는 공용 카운터를 씁니다(lib/visits.ts). 여기에는 "오늘 셌는지" 표시만 남깁니다.
   사파리 사생활 보호 모드처럼 localStorage 를 못 쓰는 환경에서는 메모리에만 담아
   화면은 그대로 동작하게 합니다. */

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: key => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: key => {
      map.delete(key);
    }
  };
}

let cached: KeyValueStorage | null = null;

export function getStorage(): KeyValueStorage {
  if (cached) return cached;
  try {
    const storage = window.localStorage;
    const probe = "__cy_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    cached = storage;
  } catch {
    cached = createMemoryStorage();
  }
  return cached;
}

export function readJson<T>(storage: KeyValueStorage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class StorageFullError extends Error {
  constructor(message = "저장 공간이 부족해요. 오래된 항목을 지우고 다시 시도해 주세요.") {
    super(message);
    this.name = "StorageFullError";
  }
}

/* 용량 초과(QuotaExceededError)는 사용자에게 보여 줄 수 있는 문구로 바꿔서 던집니다. */
export function writeJson(storage: KeyValueStorage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof Error && /quota/i.test(`${error.name} ${error.message}`)) {
      throw new StorageFullError();
    }
    throw error;
  }
}

/* 짧은 고유 id 입니다. 화면 key 와 로컬 저장용이라 암호학적일 필요는 없습니다. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
