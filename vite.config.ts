import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base 를 상대 경로로 두면 GitHub Pages 처럼 하위 경로(/저장소이름/)에 올려도
// 빌드 결과물을 그대로 쓸 수 있습니다. public/ 이미지는 src/lib/asset.ts 가 경로를 맞춥니다.
export default defineConfig({
  base: "./",
  plugins: [react()]
});
