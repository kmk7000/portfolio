/* public/ 폴더 파일 경로 앞에 배포 기준 경로(Vite base)를 붙입니다.
   vite.config.ts 의 base 가 "./" 라서, 빌드 결과물을 어느 하위 경로에 올려도
   <img src> 와 인라인 background-image 가 깨지지 않습니다.
   빌드할 때 만든 파일 내용 해시가 있으면 ?v=해시 를 붙여, 그림을 바꿔 배포하면 바로 새 그림이 보이게 합니다. */
declare const __ASSET_HASHES__: Record<string, string> | undefined;

const hashes: Record<string, string> = typeof __ASSET_HASHES__ === "undefined" ? {} : __ASSET_HASHES__;

export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const v = hashes[clean];
  return `${base}${clean}${v ? `?v=${v}` : ""}`;
}
