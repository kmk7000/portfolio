/* 미니룸 캐릭터 이동 규칙입니다. 원본 LinkTree.tsx 의 상수와 계산을 그대로 옮겼습니다.
   배경(miniroom-bg-cyberpunk.jpg)의 바닥은 위쪽 한 점(꼭짓점)에서 벌어지는 삼각형이라,
   벽으로 못 나가게 y 값에 따라 x 이동 범위를 좁혀서 바닥 모양대로 막습니다. */

export const CHARACTER_STEP = 3;
export const FLOOR_APEX_Y = 40; // 바닥이 시작되는 꼭짓점의 세로 위치(%)
export const FLOOR_MIN_Y = 43;
export const FLOOR_MAX_Y = 88;
export const FLOOR_SLOPE = 1.07; // 꼭짓점에서 1% 내려갈 때 바닥이 좌우로 넓어지는 폭(%)
export const FLOOR_EDGE_MARGIN = 5;
export const BUBBLE_DURATION_MS = 2600;
/* 캐릭터와 가구 사이 이 거리(%) 안에 들어오면 상호작용 문구를 띄웁니다. */
export const NEAR_DISTANCE = 14;
/* 처음 서 있는 자리입니다. */
export const START_POSITION = { x: 65, y: 88 } as const;

export type Point = { x: number; y: number };
export type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const ARROW_KEYS: readonly string[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export function isArrowKey(key: string): key is ArrowKey {
  return ARROW_KEYS.includes(key);
}

export function clampToFloor(x: number, y: number): Point {
  const clampedY = Math.min(FLOOR_MAX_Y, Math.max(FLOOR_MIN_Y, y));
  const halfWidth = FLOOR_SLOPE * (clampedY - FLOOR_APEX_Y);
  const minX = Math.max(FLOOR_EDGE_MARGIN, 50 - halfWidth);
  const maxX = Math.min(100 - FLOOR_EDGE_MARGIN, 50 + halfWidth);
  return { x: Math.min(maxX, Math.max(minX, x)), y: clampedY };
}

export function stepCharacter(pos: Point, key: ArrowKey, step = CHARACTER_STEP): Point {
  let { x, y } = pos;
  if (key === "ArrowUp") y -= step;
  if (key === "ArrowDown") y += step;
  if (key === "ArrowLeft") x -= step;
  if (key === "ArrowRight") x += step;
  return clampToFloor(x, y);
}

/* 캐릭터와 가장 가까운 가구를 찾습니다. NEAR_DISTANCE 안에 없으면 null 입니다. */
export function findNearby<T extends { id: string }>(
  pos: Point,
  items: readonly T[],
  layout: Record<string, Point | undefined>,
  maxDistance = NEAR_DISTANCE
): T | null {
  let closest: T | null = null;
  let closestDist = Infinity;
  for (const item of items) {
    const placed = layout[item.id];
    if (!placed) continue;
    const dist = Math.hypot(placed.x - pos.x, placed.y - pos.y);
    if (dist < maxDistance && dist < closestDist) {
      closest = item;
      closestDist = dist;
    }
  }
  return closest;
}

/* 화면 좌표를 미니룸 안의 % 좌표(0~100)로 바꿉니다. 편집모드의 가구 끌기에 씁니다. */
export function pointToPercent(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): Point {
  const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/* 입력 칸(글자 입력, 볼륨 슬라이더, 선택 상자)에 초점이 있을 때는 방향키를 그 칸에 양보합니다.
   원본은 페이지 어디서든 방향키를 가로채서 방명록 입력 중 커서를 못 옮기는 문제가 있었습니다. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
}
