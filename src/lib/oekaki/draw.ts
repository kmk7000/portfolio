/* 낙서장(오에카키) 그림판의 계산 부분입니다.
   원본 Oekaki.tsx(progh2/mini-homepage 에서 가져온 MIT 코드)의 상수와 순수 함수만 떼어 냈습니다.
   캔버스 없이도 돌아가서 테스트할 수 있습니다. */

/* 캔버스 한 변입니다. 데스크톱 우측 패널에서는 1:1 로 보입니다. */
export const SIZE = 360;

/* 옛날 오에카키 팔레트처럼 회색 한 줄에 색상 세 줄입니다. */
export const COLORS = [
  "#000000", "#444444", "#888888", "#bbbbbb", "#e5e5e5", "#ffffff",
  "#7f1d1d", "#dc2626", "#f87171", "#ea580c", "#f59e0b", "#fcd34d",
  "#14532d", "#16a34a", "#4ade80", "#0e7490", "#06b6d4", "#67e8f9",
  "#1e3a8a", "#2563eb", "#60a5fa", "#6d28d9", "#a855f7", "#ec4899"
] as const;

/* 캔버스 기준 굵기라 화면이 줄어도 비율이 같습니다. */
export const WIDTHS = [3, 7, 16] as const;
export const BACKGROUND = "#ffffff";
export const MAX_LAYERS = 4;
export const PAGE_SIZE = 5;
/* 되돌리기 한 단계가 360x360 RGBA 로 518KB 입니다. 15단계면 약 7.8MB 입니다. */
export const MAX_UNDO = 15;
/* 채우기 허용 오차입니다. 선 가장자리가 부드럽게 처리돼 있어 0 이면 경계에 흰 테가 남습니다. */
export const FILL_TOLERANCE = 48;
export const BLUR_RADIUS = 18;
export const BLUR_STRENGTH = 4;
/* 3px 넘게 움직였을 때만 점을 남깁니다. 이보다 촘촘하면 기록만 커집니다. */
export const POINT_GAP = 3;
/* 재생은 그림 크기와 상관없이 대략 이 시간 안에 끝나게 속도를 맞춥니다. */
export const REPLAY_SECONDS = 6;
/* 도형은 시작점과 끝점만 기록되므로 테두리를 이만큼 나눠 조금씩 긋습니다. */
export const SHAPE_STEPS = 20;

export type Tool = "pen" | "eraser" | "fill" | "pick" | "line" | "rect" | "ellipse" | "blur";
export const SHAPE_TOOLS: readonly Tool[] = ["line", "rect", "ellipse"];

/* 그리는 과정 기록입니다. 도구마다 번호를 붙여 짧게 적습니다.
   흐리게(6)는 자리만 남기고 재생 때 건너뜁니다. */
export const OP = { pen: 0, line: 1, rect: 2, ellipse: 3, eraser: 4, fill: 5, blur: 6 } as const;

export type ReplayOp = {
  k: number;
  l: number;
  c?: string;
  w?: number;
  o?: number;
  /* 펜과 지우개는 첫 점만 절대좌표이고 나머지는 차분입니다. 도형은 [x1,y1,x2,y2] 입니다. */
  p?: number[];
  /* 도형을 속까지 칠했는지. 테두리만이면 없습니다. */
  f?: 1;
};

export type ImageDataLike = { width: number; height: number; data: Uint8ClampedArray };

export function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

/* 화면에 보이는 그림(합쳐진 결과)에서 누른 지점과 이어진 영역을 찾습니다.
   찾은 영역만 1 로 표시한 배열을 돌려주고, 실제 색칠은 선택한 레이어에 합니다. */
export function floodMask(src: ImageDataLike, startX: number, startY: number, tolerance = FILL_TOLERANCE) {
  const { width: w, height: h, data } = src;
  const mask = new Uint8Array(w * h);
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return mask;

  const s = (startY * w + startX) * 4;
  const sr = data[s], sg = data[s + 1], sb = data[s + 2];
  const seen = new Uint8Array(w * h);
  const stack: number[] = [startY * w + startX];
  seen[startY * w + startX] = 1;

  while (stack.length) {
    const idx = stack.pop() as number;
    const x = idx % w;
    const y = (idx - x) / w;
    const p = idx * 4;
    /* 세 채널 차이의 합으로 견줍니다. 사람 눈에 충분하고 계산이 쌉니다. */
    const diff = Math.abs(data[p] - sr) + Math.abs(data[p + 1] - sg) + Math.abs(data[p + 2] - sb);
    if (diff > tolerance) continue;

    mask[idx] = 1;

    if (x > 0 && !seen[idx - 1]) { seen[idx - 1] = 1; stack.push(idx - 1); }
    if (x < w - 1 && !seen[idx + 1]) { seen[idx + 1] = 1; stack.push(idx + 1); }
    if (y > 0 && !seen[idx - w]) { seen[idx - w] = 1; stack.push(idx - w); }
    if (y < h - 1 && !seen[idx + w]) { seen[idx + w] = 1; stack.push(idx + w); }
  }
  return mask;
}

/* 마스크가 1 인 픽셀을 불투명한 색으로 칠합니다. */
export function applyMask(target: ImageDataLike, mask: Uint8Array, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const q = i * 4;
    target.data[q] = r;
    target.data[q + 1] = g;
    target.data[q + 2] = b;
    target.data[q + 3] = 255;
  }
  return target;
}

/* 점을 POINT_GAP 마다만 모으고 차분으로 적습니다. buf 를 직접 고칩니다. */
export function trackPoint(buf: number[], p: { x: number; y: number }, gap = POINT_GAP) {
  if (buf.length === 0) {
    buf.push(p.x, p.y);
    return buf;
  }
  let ax = buf[0], ay = buf[1];
  for (let i = 2; i < buf.length; i += 2) {
    ax += buf[i];
    ay += buf[i + 1];
  }
  if (Math.abs(p.x - ax) + Math.abs(p.y - ay) < gap) return buf;
  buf.push(p.x - ax, p.y - ay);
  return buf;
}

/* 차분으로 적힌 점을 절대좌표 목록으로 되돌립니다. */
export function decodePoints(p: readonly number[]): [number, number][] {
  if (p.length < 2) return [];
  const out: [number, number][] = [[p[0], p[1]]];
  let x = p[0], y = p[1];
  for (let i = 2; i + 1 < p.length; i += 2) {
    x += p[i];
    y += p[i + 1];
    out.push([x, y]);
  }
  return out;
}

/* 사각형 테두리를 한 줄로 편 좌표입니다. 부분만 그리기가 쉽습니다. */
export function rectPath(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  const l = Math.min(x1, x2), r = Math.max(x1, x2);
  const t = Math.min(y1, y2), b = Math.max(y1, y2);
  return [[l, t], [r, t], [r, b], [l, b], [l, t]];
}

/* 이어진 선을 앞에서부터 비율(t, 0~1)만큼만 잘라 낸 좌표입니다. */
export function polylinePrefix(pts: readonly [number, number][], t: number): [number, number][] {
  if (pts.length === 0) return [];
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  let left = total * Math.min(1, Math.max(0, t));
  const out: [number, number][] = [pts[0]];
  for (let i = 0; i < lens.length && left > 0; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (left >= lens[i]) {
      out.push([bx, by]);
      left -= lens[i];
    } else {
      const k = left / lens[i];
      out.push([ax + (bx - ax) * k, ay + (by - ay) * k]);
      left = 0;
    }
  }
  return out;
}

/* 재생할 때 기록 하나를 몇 번에 나눠 그릴지입니다. */
export function segmentsOf(o: ReplayOp): number {
  if (o.k === OP.blur) return 0;
  if (o.k === OP.fill) return 1;
  if (o.k === OP.pen || o.k === OP.eraser) return Math.max(1, (o.p?.length ?? 2) / 2 - 1);
  return SHAPE_STEPS;
}

/* 한 프레임에 몇 조각씩 그려야 REPLAY_SECONDS 안에 끝나는지입니다. */
export function segmentsPerFrame(ops: readonly ReplayOp[], fps = 60): number {
  const total = ops.reduce((n, o) => n + segmentsOf(o), 0);
  return Math.max(1, Math.ceil(total / (fps * REPLAY_SECONDS)));
}

/* 저장된 기록을 읽습니다. 모양이 틀린 항목은 버립니다. */
export function parseReplay(json: string): ReplayOp[] {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (o): o is ReplayOp =>
        Boolean(o) && typeof o === "object" && typeof (o as ReplayOp).k === "number" && typeof (o as ReplayOp).l === "number"
    );
  } catch {
    return [];
  }
}
