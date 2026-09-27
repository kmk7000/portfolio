import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* public/ 파일마다 내용 해시(앞 8자)를 만들어 둡니다. src/lib/asset.ts 가 주소 끝에 ?v=해시 를 붙여서,
   같은 이름의 그림을 새로 바꿔 배포해도 브라우저가 예전 그림을 캐시에서 꺼내 쓰지 않게 합니다.
   (GitHub Pages 는 파일을 10분 동안 캐시하라고 알려 줍니다) */
function publicHashes(dir = "public"): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out["/" + relative(dir, full).split(sep).join("/")] = createHash("sha1").update(readFileSync(full)).digest("hex").slice(0, 8);
    }
  };
  walk(dir);
  return out;
}

// base 를 상대 경로로 두면 GitHub Pages 처럼 하위 경로(/저장소이름/)에 올려도
// 빌드 결과물을 그대로 쓸 수 있습니다. public/ 이미지는 src/lib/asset.ts 가 경로를 맞춥니다.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __ASSET_HASHES__: JSON.stringify(publicHashes())
  }
});
