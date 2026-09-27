/* 주인장이 고친 사이트 내용(site/content)과 올린 사진(images)을 Firestore 와 주고받습니다. */
import { cloud } from "./firebase.ts";
import { imageRef, type SiteContentPatch } from "./site-content.ts";

/* 문서가 없으면 undefined 를 넘깁니다. (그러면 코드의 기본 내용이 보입니다) */
export function subscribeSiteContent(onData: (raw: unknown) => void, onError: (error: unknown) => void): () => void {
  let stop: (() => void) | null = null;
  let stopped = false;
  cloud()
    .then(({ db, fs }) => {
      if (stopped) return;
      stop = fs.onSnapshot(fs.doc(db, "site", "content"), snap => onData(snap.data()), onError);
    })
    .catch(onError);
  return () => {
    stopped = true;
    stop?.();
  };
}

/* 넘긴 항목(profile, tabs, blocks …)만 통째로 바꿉니다. 나머지 항목은 그대로 둡니다.
   (merge: true 는 blocks 같은 지도를 깊게 합쳐서 지운 탭이 남으므로 mergeFields 를 씁니다) */
export async function saveSiteContent(patch: SiteContentPatch): Promise<void> {
  const { db, fs } = await cloud();
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  await fs.setDoc(
    fs.doc(db, "site", "content"),
    { ...patch, updatedAt: fs.serverTimestamp() },
    { mergeFields: [...fields, "updatedAt"] }
  );
}

/* ------------------------------------------------------------------ */
/* 사진                                                                */
/* ------------------------------------------------------------------ */

/* 문서 하나는 1MB 까지라, base64 로 불어나는 걸 감안해 이 정도에서 멈춥니다. (규칙은 900,000) */
const MAX_IMAGE_CHARS = 700_000;
const MAX_IMAGE_DIMENSION = 1400;

/* 고른 사진을 브라우저에서 줄이고 JPEG 로 압축합니다. 크면 화질을 낮춰 가며 다시 시도합니다. */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있어요.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 사진을 처리하지 못했어요.");
  /* 투명한 PNG 가 JPEG 에서 검게 되지 않도록 흰 바탕을 깝니다. */
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.7, 0.6, 0.5, 0.4, 0.3]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_IMAGE_CHARS) return dataUrl;
  }
  throw new Error("사진 용량이 너무 커요. 조금 더 작은 사진으로 올려 주세요.");
}

/* 올린 사진을 가리키는 "img:<id>" 와, 바로 보여 줄 수 있게 압축한 사진을 돌려줍니다. */
export async function uploadImage(file: File): Promise<{ id: string; ref: string; dataUrl: string }> {
  const dataUrl = await compressImage(file);
  const { db, fs } = await cloud();
  const doc = await fs.addDoc(fs.collection(db, "images"), { dataUrl });
  return { id: doc.id, ref: imageRef(doc.id), dataUrl };
}

/* 필요한 사진만 한 장씩 불러옵니다. 없는 사진은 빈 문자열로 둡니다. */
export async function fetchImages(ids: readonly string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { db, fs } = await cloud();
  const entries = await Promise.all(
    ids.map(async id => {
      try {
        const snap = await fs.getDoc(fs.doc(db, "images", id));
        const url = snap.exists() ? snap.data().dataUrl : "";
        return [id, typeof url === "string" ? url : ""] as const;
      } catch {
        return [id, ""] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}
