/* public/ 폴더 파일 경로 앞에 배포 기준 경로(Vite base)를 붙입니다.
   vite.config.ts 의 base 가 "./" 라서, 빌드 결과물을 어느 하위 경로에 올려도
   <img src> 와 인라인 background-image 가 깨지지 않습니다. */
export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
