/* 주인장이 화면에서 직접 고칠 수 있는 내용입니다. (원본 src/lib/site-content.ts 와 같은 구조)

   - 내용은 Firestore 문서 하나(site/content)에 담깁니다.
   - 아직 저장한 적이 없는 항목은 src/config/*.ts 의 값이 그대로 기본값이 됩니다.
     즉 편집을 한 번도 안 하면 지금과 똑같이 보입니다.
   - 프로젝트 탭 내용은 코드(src/config/site.ts 의 projects)로만 관리합니다.
   - 올린 사진은 문서 크기 제한(1MB) 때문에 images 컬렉션에 한 장씩 따로 두고,
     블록에는 "img:<문서 id>" 로 가리킵니다. "/assets/..." 는 저장소에 들어 있는 파일입니다.

   이 파일은 Firebase 없이 계산만 합니다(테스트하기 쉽게). 주고받기는 site-content-cloud.ts */
import { furnitureItems } from "../config/furniture.ts";
import {
  bgmTracks as staticBgm,
  photoBlocks,
  profile as staticProfile,
  profileBlocks,
  tabs as staticTabs,
  waveLinks as staticWaveLinks,
  type BgmTrack,
  type ContentBlock,
  type TabDef,
  type TabKind,
  type TabView,
  type WaveLink
} from "../config/site.ts";

export const EDITABLE_PROFILE_KEYS = [
  "ownerName",
  "introTitle",
  "introDescription",
  "catalogDescription",
  "todayIs",
  "displayUrl",
  "miniroomTitle",
  "miniroomSub",
  "guestbookTitle",
  "guestbookSub",
  "projectsSubtitle",
  "photoSubtitle"
] as const;

export type ProfileKey = (typeof EDITABLE_PROFILE_KEYS)[number];
export type SiteProfile = Record<ProfileKey, string>;
export type FurniturePlacement = { x: number; y: number; flip: boolean };
export type FurnitureLayout = Record<string, FurniturePlacement>;

export type SiteContent = {
  profile: SiteProfile;
  tabs: TabDef[];
  /* 탭 id 별 블록입니다. 프로필·사진첩·직접 만든 탭이 씁니다. */
  blocks: Record<string, ContentBlock[]>;
  waveLinks: WaveLink[];
  furniture: FurnitureLayout;
  /* 왼쪽 BGM 목록(유튜브 영상) */
  bgm: BgmTrack[];
};

export type SiteContentPatch = Partial<SiteContent>;

export const IMAGE_REF_PREFIX = "img:";

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultFurniture(): FurnitureLayout {
  return Object.fromEntries(furnitureItems.map(item => [item.id, { x: item.x, y: item.y, flip: Boolean(item.flip) }]));
}

export function defaultContent(): SiteContent {
  const profile = Object.fromEntries(EDITABLE_PROFILE_KEYS.map(k => [k, staticProfile[k]])) as SiteProfile;
  return {
    profile,
    tabs: staticTabs.map(t => ({ ...t })),
    blocks: { profile: profileBlocks.map(b => ({ ...b })), photo: photoBlocks.map(b => ({ ...b })) },
    waveLinks: staticWaveLinks.map(w => ({ ...w })),
    furniture: defaultFurniture(),
    bgm: staticBgm.map(t => ({ ...t }))
  };
}

/* ------------------------------------------------------------------ */
/* 저장된 값 정리 — 모양이 어긋난 값이 있어도 화면이 깨지지 않게 합니다    */
/* ------------------------------------------------------------------ */

const TAB_KINDS: readonly TabKind[] = ["home", "profile", "projects", "photo", "oekaki", "custom"];
const TAB_VIEWS: readonly TabView[] = ["list", "album", "year"];
/* 코드가 내용을 책임지는 탭입니다. 저장된 목록에서 빠져 있어도 다시 붙입니다. */
const REQUIRED_KINDS: readonly TabKind[] = ["home", "projects", "oekaki"];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

function cleanTab(v: unknown): TabDef | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const kind = v.kind as TabKind;
  if (!id || !TAB_KINDS.includes(kind)) return null;
  const tab: TabDef = { id, label: str(v.label) || "탭", kind };
  if (TAB_VIEWS.includes(v.view as TabView)) tab.view = v.view as TabView;
  return tab;
}

function cleanTabs(raw: unknown, base: TabDef[]): TabDef[] {
  if (!Array.isArray(raw)) return base;
  const seen = new Set<string>();
  const tabs = raw.map(cleanTab).filter((t): t is TabDef => !!t && !seen.has(t.id) && !!seen.add(t.id));
  for (const kind of REQUIRED_KINDS) {
    if (!tabs.some(t => t.kind === kind)) {
      const fallback = base.find(t => t.kind === kind);
      if (fallback && !seen.has(fallback.id)) tabs.push({ ...fallback });
    }
  }
  /* 홈은 늘 맨 앞입니다. */
  tabs.sort((a, b) => Number(b.kind === "home") - Number(a.kind === "home"));
  return tabs.length > 0 ? tabs : base;
}

function cleanBlock(v: unknown): ContentBlock | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  if (!id) return null;
  const year = str(v.year) || undefined;
  const base = year ? { id, year } : { id };
  switch (v.type) {
    case "heading":
    case "text":
      return { ...base, type: v.type, text: str(v.text) };
    case "list":
      return { ...base, type: "list", items: Array.isArray(v.items) ? v.items.map(str) : [] };
    case "link":
      return { ...base, type: "link", label: str(v.label), href: str(v.href) };
    case "image":
      return {
        ...base,
        type: "image",
        images: Array.isArray(v.images) ? v.images.map(str).filter(Boolean) : [],
        caption: str(v.caption)
      };
    default:
      return null;
  }
}

function cleanBlocks(raw: unknown, base: Record<string, ContentBlock[]>): Record<string, ContentBlock[]> {
  if (!isObj(raw)) return base;
  const out: Record<string, ContentBlock[]> = {};
  for (const [tabId, list] of Object.entries(raw)) {
    if (Array.isArray(list)) out[tabId] = list.map(cleanBlock).filter((b): b is ContentBlock => !!b);
  }
  return out;
}

function cleanWaves(raw: unknown, base: WaveLink[]): WaveLink[] {
  if (!Array.isArray(raw)) return base;
  return raw
    .filter(isObj)
    .map(w => ({ id: str(w.id), label: str(w.label), href: str(w.href) }))
    .filter(w => w.id);
}

function cleanFurniture(raw: unknown, base: FurnitureLayout): FurnitureLayout {
  const out: FurnitureLayout = { ...base };
  if (!isObj(raw)) return out;
  for (const id of Object.keys(base)) {
    const p = raw[id];
    if (isObj(p) && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      out[id] = {
        x: Math.min(100, Math.max(0, p.x as number)),
        y: Math.min(100, Math.max(0, p.y as number)),
        flip: p.flip === true
      };
    }
  }
  return out;
}

/* 유튜브 영상 id 는 11자(영문·숫자·-·_)입니다. */
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function cleanBgm(raw: unknown, base: BgmTrack[]): BgmTrack[] {
  if (!Array.isArray(raw)) return base;
  const seen = new Set<string>();
  const out: BgmTrack[] = [];
  for (const t of raw) {
    if (!isObj(t)) continue;
    const id = str(t.id);
    const videoId = str(t.videoId);
    if (!id || seen.has(id) || !YOUTUBE_ID.test(videoId)) continue;
    seen.add(id);
    const track: BgmTrack = { id, title: str(t.title) || "제목 없음", videoId };
    if (str(t.artist)) track.artist = str(t.artist);
    if (Number.isFinite(t.startAt) && (t.startAt as number) > 0) track.startAt = Math.floor(t.startAt as number);
    out.push(track);
  }
  return out;
}

/* 붙여 넣은 유튜브 주소에서 영상 id 와 시작 위치(t=)를 꺼냅니다. 못 알아보면 null 입니다.
   youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, music.youtube.com 을 받습니다. */
export function parseYouTubeUrl(input: string): { videoId: string; startAt?: number } | null {
  const text = input.trim();
  if (YOUTUBE_ID.test(text)) return { videoId: text };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? "";
    const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/]+)/);
    if (!id && m) id = m[2];
  }
  if (!YOUTUBE_ID.test(id)) return null;
  const t = url.searchParams.get("t") ?? url.searchParams.get("start");
  const seconds = t ? parseTimeParam(t) : 0;
  return seconds > 0 ? { videoId: id, startAt: seconds } : { videoId: id };
}

/* "90", "90s", "1m30s", "1h2m3s" → 초 */
function parseTimeParam(t: string): number {
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/* Firestore 에서 읽은 문서(없으면 undefined) → 화면에 쓸 내용 */
export function normalizeContent(raw: unknown): SiteContent {
  const base = defaultContent();
  if (!isObj(raw)) return base;
  const profile = { ...base.profile };
  if (isObj(raw.profile)) {
    for (const k of EDITABLE_PROFILE_KEYS) if (typeof raw.profile[k] === "string") profile[k] = raw.profile[k] as string;
  }
  return {
    profile,
    tabs: cleanTabs(raw.tabs, base.tabs),
    blocks: "blocks" in raw ? cleanBlocks(raw.blocks, base.blocks) : base.blocks,
    waveLinks: cleanWaves(raw.waveLinks, base.waveLinks),
    furniture: cleanFurniture(raw.furniture, base.furniture),
    bgm: cleanBgm(raw.bgm, base.bgm)
  };
}

/* ------------------------------------------------------------------ */
/* 사진 주소                                                            */
/* ------------------------------------------------------------------ */

export function imageRef(id: string): string {
  return IMAGE_REF_PREFIX + id;
}

export function uploadedImageId(ref: string): string | null {
  return ref.startsWith(IMAGE_REF_PREFIX) ? ref.slice(IMAGE_REF_PREFIX.length) : null;
}

/* 블록이 가리키는 사진의 실제 주소입니다. 올린 사진을 아직 못 불러왔으면 빈 문자열입니다.
   저장소 파일은 toAsset(배포 경로 붙이기)으로 바꿉니다. */
export function resolveImageSrc(
  ref: string,
  uploaded: Readonly<Record<string, string>>,
  toAsset: (path: string) => string
): string {
  const id = uploadedImageId(ref);
  return id ? (uploaded[id] ?? "") : toAsset(ref);
}

/* 내용 안에서 쓰는 "올린 사진" id 목록 (불러올 목록) */
export function uploadedIdsIn(blocks: Readonly<Record<string, readonly ContentBlock[]>>): string[] {
  const ids = new Set<string>();
  for (const list of Object.values(blocks)) {
    for (const b of list) if (b.type === "image") for (const ref of b.images) {
      const id = uploadedImageId(ref);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

/* ------------------------------------------------------------------ */
/* 주인장                                                              */
/* ------------------------------------------------------------------ */

/* firestore.rules 의 isOwner() 와 같은 목록이어야 합니다. */
export const OWNER_EMAILS: readonly string[] = ["milk45453@gmail.com", "milk454537@gmail.com"];

export type AuthUserLike = {
  isAnonymous: boolean;
  email: string | null;
  emailVerified: boolean;
  providerData: readonly { providerId: string }[];
};

export function isOwnerUser(user: AuthUserLike | null | undefined): boolean {
  if (!user || user.isAnonymous || !user.email || !user.emailVerified) return false;
  if (!user.providerData.some(p => p.providerId === "google.com")) return false;
  return OWNER_EMAILS.includes(user.email);
}

/* ------------------------------------------------------------------ */
/* 편집 도우미                                                          */
/* ------------------------------------------------------------------ */

export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const next = index + delta;
  if (index < 0 || index >= list.length || next < 0 || next >= list.length) return [...list];
  const copy = [...list];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

/* 편집 칸에 쓴 링크 주소를 안전한 것만 받습니다. (javascript: 같은 주소 막기) */
export function isSafeHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || /^mailto:[^\s]+$/i.test(href);
}

/* 목록 블록은 편집할 때 한 줄에 한 항목으로 적습니다. */
export function linesToItems(text: string): string[] {
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
}
