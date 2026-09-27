import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  BACKGROUND,
  BLUR_RADIUS,
  BLUR_STRENGTH,
  COLORS,
  MAX_LAYERS,
  MAX_UNDO,
  OP,
  SHAPE_TOOLS,
  SIZE,
  WIDTHS,
  applyMask,
  floodMask,
  rgbToHex,
  trackPoint,
  type ReplayOp,
  type Tool
} from "../../lib/oekaki/draw.ts";
import { OEKAKI_LIMITS } from "../../lib/oekaki/store.ts";
import { BlurIcon, BucketIcon, EllipseIcon, EraserIcon, LineIcon, PenIcon, PickIcon, RectIcon, UndoIcon } from "./icons.tsx";

type LayerMeta = { id: number; visible: boolean };
type Snapshot = { layerId: number; data: ImageData };
type P = { x: number; y: number };

export type PadResult = { image: string; comment: string; author: string; replay: string };

/* 픽셀을 자주 읽는 캔버스라 willReadFrequently 로 엽니다. (읽기 경고와 느려짐 방지) */
function ctx2d(canvas: HTMLCanvasElement | null | undefined) {
  return canvas?.getContext("2d", { willReadFrequently: true }) ?? null;
}

function makeCanvas() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  return c;
}

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "pen", label: "펜", icon: <PenIcon /> },
  { id: "line", label: "직선", icon: <LineIcon /> },
  { id: "rect", label: "사각형", icon: <RectIcon /> },
  { id: "ellipse", label: "원", icon: <EllipseIcon /> },
  { id: "fill", label: "채우기", icon: <BucketIcon /> },
  { id: "blur", label: "흐리게", icon: <BlurIcon /> },
  { id: "pick", label: "스포이드", icon: <PickIcon /> },
  { id: "eraser", label: "지우개", icon: <EraserIcon /> }
];

/* ---------------------------------------------------------------
   그림판 (원본 Oekaki.tsx 의 OekakiPad)

   레이어마다 투명한 오프스크린 캔버스를 하나씩 두고, 화면 캔버스에는
   흰 바탕 위로 보이는 레이어를 순서대로 합쳐 올립니다.
   되돌리기는 연산 직전 레이어 픽셀을 저장해 두었다가 복원합니다.
   --------------------------------------------------------------- */
export default function OekakiPad({
  defaultAuthor,
  onDone,
  onCancel
}: {
  defaultAuthor: string;
  /* 저장에 실패하면 예외를 던집니다. 그림판이 안내 문구로 보여 줍니다. */
  onDone: (result: PadResult) => void;
  onCancel: () => void;
}) {
  const fieldId = useId();
  const viewRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  /* 지금 그리는 획만 담는 임시 판입니다. 획이 끝나면 한 번에 레이어로 옮겨 농도가 고릅니다. */
  const tempRef = useRef<HTMLCanvasElement | null>(null);
  const blurRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef<P | null>(null);
  const lastRef = useRef<P | null>(null);
  /* 그리는 과정 기록입니다. 되돌리기와 개수가 어긋나면 안 되므로 같이 움직입니다. */
  const opsRef = useRef<ReplayOp[]>([]);
  const redoOpsRef = useRef<ReplayOp[]>([]);
  const pointsRef = useRef<number[]>([]);
  const undoRef = useRef<Snapshot[]>([]);
  const redoRef = useRef<Snapshot[]>([]);

  const [layers, setLayers] = useState<LayerMeta[]>([{ id: 1, visible: true }]);
  const [activeId, setActiveId] = useState(1);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState<number>(WIDTHS[1]);
  const [opacity, setOpacity] = useState(1);
  const [filled, setFilled] = useState(false);
  const [comment, setComment] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [steps, setSteps] = useState({ undo: 0, redo: 0 });

  const layerCanvas = useCallback((id: number) => {
    let c = layerRef.current.get(id);
    if (!c) {
      c = makeCanvas();
      layerRef.current.set(id, c);
    }
    return c;
  }, []);

  const scratch = (ref: { current: HTMLCanvasElement | null }) => {
    if (!ref.current) ref.current = makeCanvas();
    return ref.current;
  };

  /* 흰 바탕 위에 보이는 레이어를 순서대로 얹습니다. 그리는 중인 획은
     선택한 레이어 바로 위에 설정한 농도로 얹습니다. */
  const composite = useCallback(() => {
    const view = ctx2d(viewRef.current);
    if (!view) return;
    view.globalAlpha = 1;
    view.globalCompositeOperation = "source-over";
    view.fillStyle = BACKGROUND;
    view.fillRect(0, 0, SIZE, SIZE);
    layers.forEach(l => {
      if (!l.visible) return;
      view.drawImage(layerCanvas(l.id), 0, 0);
      if (l.id === activeId && tempRef.current) {
        view.globalAlpha = opacity;
        view.drawImage(tempRef.current, 0, 0);
        view.globalAlpha = 1;
      }
    });
  }, [layers, layerCanvas, activeId, opacity]);

  useEffect(() => {
    composite();
  }, [composite]);

  const pushUndo = () => {
    const c = ctx2d(layerCanvas(activeId));
    if (!c) return;
    undoRef.current.push({ layerId: activeId, data: c.getImageData(0, 0, SIZE, SIZE) });
    if (undoRef.current.length > MAX_UNDO) {
      undoRef.current.shift();
      /* 가장 오래된 단계를 버렸으면 그 기록은 이제 되돌릴 수 없으니 그대로 둡니다. */
    }
    redoRef.current = [];
    redoOpsRef.current = [];
    setSteps({ undo: undoRef.current.length, redo: 0 });
  };

  const pushOp = (op: ReplayOp) => opsRef.current.push(op);

  const restore = (from: typeof undoRef, to: typeof redoRef) => {
    const step = from.current.pop();
    if (!step) return;
    const fromOps = from === undoRef ? opsRef : redoOpsRef;
    const toOps = from === undoRef ? redoOpsRef : opsRef;
    const movedOp = fromOps.current.pop();
    if (movedOp) toOps.current.push(movedOp);
    const c = ctx2d(layerCanvas(step.layerId));
    if (!c) return;
    to.current.push({ layerId: step.layerId, data: c.getImageData(0, 0, SIZE, SIZE) });
    c.putImageData(step.data, 0, 0);
    setSteps({ undo: undoRef.current.length, redo: redoRef.current.length });
    composite();
  };

  const toCanvas = (e: ReactPointerEvent<HTMLCanvasElement>): P => {
    const r = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(SIZE - 1, Math.max(0, v));
    return {
      x: clamp(Math.floor(((e.clientX - r.left) / r.width) * SIZE)),
      y: clamp(Math.floor(((e.clientY - r.top) / r.height) * SIZE))
    };
  };

  const drawOnTemp = (draw: (c: CanvasRenderingContext2D) => void) => {
    const c = ctx2d(scratch(tempRef));
    if (!c) return;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    draw(c);
    composite();
  };

  const clearTemp = () => ctx2d(tempRef.current)?.clearRect(0, 0, SIZE, SIZE);

  const commitTemp = () => {
    const temp = tempRef.current;
    const c = ctx2d(layerCanvas(activeId));
    if (!temp || !c) return;
    c.globalAlpha = opacity;
    c.globalCompositeOperation = "source-over";
    c.drawImage(temp, 0, 0);
    c.globalAlpha = 1;
    clearTemp();
    composite();
  };

  /* 지우개는 흰색 덧칠이 아니라 투명 지우기입니다. 흰색으로 칠하면 아래 레이어까지 가려집니다. */
  const eraseTo = (from: P, to: P) => {
    const c = ctx2d(layerCanvas(activeId));
    if (!c) return;
    c.globalCompositeOperation = "destination-out";
    c.lineWidth = width * 2;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
    c.globalCompositeOperation = "source-over";
    composite();
  };

  /* 흐리게는 획을 시작할 때 레이어를 한 번 흐려 두고, 지나가는 자리에만 그 결과를 찍습니다. */
  const blurAt = (p: P) => {
    const src = blurRef.current;
    const c = ctx2d(layerCanvas(activeId));
    if (!src || !c) return;
    c.save();
    c.beginPath();
    c.arc(p.x, p.y, BLUR_RADIUS, 0, Math.PI * 2);
    c.clip();
    c.clearRect(p.x - BLUR_RADIUS, p.y - BLUR_RADIUS, BLUR_RADIUS * 2, BLUR_RADIUS * 2);
    c.drawImage(src, 0, 0);
    c.restore();
    composite();
  };

  const drawShape = (a: P, b: P) => {
    clearTemp();
    drawOnTemp(c => {
      c.beginPath();
      if (tool === "line") {
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
      } else if (tool === "rect") {
        c.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      } else {
        c.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      }
      /* 채울 때도 같은 색으로 테두리를 한 번 더 그려 가장자리를 매끈하게 합니다. */
      if (filled && tool !== "line") c.fill();
      c.stroke();
    });
  };

  const doFill = (p: P) => {
    const view = ctx2d(viewRef.current);
    const c = ctx2d(layerCanvas(activeId));
    if (!view || !c) return;
    const mask = floodMask(view.getImageData(0, 0, SIZE, SIZE), p.x, p.y);
    const target = c.getImageData(0, 0, SIZE, SIZE);
    applyMask(target, mask, color);
    c.putImageData(target, 0, 0);
    composite();
  };

  const doPick = (p: P) => {
    const view = ctx2d(viewRef.current);
    if (!view) return;
    const d = view.getImageData(p.x, p.y, 1, 1).data;
    setColor(rgbToHex(d[0], d[1], d[2]));
    setTool("pen");
  };

  const layerIndex = () => layers.findIndex(l => l.id === activeId);

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const layer = layers.find(l => l.id === activeId);
    if (!layer?.visible) return;
    const p = toCanvas(e);

    /* 스포이드는 그림을 바꾸지 않으므로 되돌리기 단계를 남기지 않습니다. */
    if (tool === "pick") {
      doPick(p);
      return;
    }

    pushUndo();
    setDirty(true);
    setError(null);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "fill") {
      pushOp({ k: OP.fill, l: layerIndex(), c: color, p: [p.x, p.y] });
      doFill(p);
      return;
    }

    if (tool === "blur") {
      pushOp({ k: OP.blur, l: layerIndex() });
      const dst = ctx2d(scratch(blurRef));
      if (dst) {
        dst.clearRect(0, 0, SIZE, SIZE);
        dst.filter = `blur(${BLUR_STRENGTH}px)`;
        dst.drawImage(layerCanvas(activeId), 0, 0);
        dst.filter = "none";
      }
      lastRef.current = p;
      blurAt(p);
      return;
    }

    clearTemp();
    startRef.current = p;
    lastRef.current = p;
    pointsRef.current = [];
    trackPoint(pointsRef.current, p);

    if (SHAPE_TOOLS.includes(tool)) {
      drawShape(p, p);
    } else if (tool === "eraser") {
      eraseTo(p, { x: p.x + 0.01, y: p.y });
    } else {
      drawOnTemp(c => {
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x + 0.01, p.y);
        c.stroke();
      });
    }
  };

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const from = lastRef.current;
    if (!from) return;
    const p = toCanvas(e);

    if (tool === "eraser") {
      trackPoint(pointsRef.current, p);
      eraseTo(from, p);
    } else if (tool === "blur") {
      blurAt(p);
    } else if (SHAPE_TOOLS.includes(tool)) {
      if (startRef.current) drawShape(startRef.current, p);
    } else {
      trackPoint(pointsRef.current, p);
      drawOnTemp(c => {
        c.beginPath();
        c.moveTo(from.x, from.y);
        c.lineTo(p.x, p.y);
        c.stroke();
      });
    }
    lastRef.current = p;
  };

  const onUp = () => {
    const start = startRef.current;
    const end = lastRef.current;
    if (!end) return;
    lastRef.current = null;
    startRef.current = null;

    if (tool === "eraser") {
      pushOp({ k: OP.eraser, l: layerIndex(), w: width, p: [...pointsRef.current] });
    } else if (SHAPE_TOOLS.includes(tool) && start) {
      const k = tool === "line" ? OP.line : tool === "rect" ? OP.rect : OP.ellipse;
      pushOp({
        k,
        l: layerIndex(),
        c: color,
        w: width,
        o: Math.round(opacity * 100),
        p: [start.x, start.y, end.x, end.y],
        ...(filled && tool !== "line" ? { f: 1 as const } : {})
      });
    } else if (tool === "pen") {
      pushOp({ k: OP.pen, l: layerIndex(), c: color, w: width, o: Math.round(opacity * 100), p: [...pointsRef.current] });
    }
    pointsRef.current = [];

    if (tool !== "eraser" && tool !== "blur" && tool !== "fill") commitTemp();
  };

  const addLayer = () => {
    if (layers.length >= MAX_LAYERS) return;
    const id = Math.max(...layers.map(l => l.id)) + 1;
    setLayers(prev => [...prev, { id, visible: true }]);
    setActiveId(id);
  };

  const removeLayer = (id: number) => {
    if (layers.length <= 1) return;
    layerRef.current.delete(id);
    undoRef.current = undoRef.current.filter(s => s.layerId !== id);
    redoRef.current = redoRef.current.filter(s => s.layerId !== id);
    setSteps({ undo: undoRef.current.length, redo: redoRef.current.length });
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeId === id) setActiveId(layers.find(l => l.id !== id)!.id);
  };

  const submit = () => {
    if (!dirty) {
      setError("그림을 그려 주세요.");
      return;
    }
    const canvas = viewRef.current;
    if (!canvas) return;
    setError(null);
    try {
      /* 화면에 보이는 그대로, 즉 켜져 있는 레이어를 합친 결과가 저장됩니다. */
      const image = canvas.toDataURL("image/png");
      if (image.length > OEKAKI_LIMITS.image) {
        throw new Error("그림이 너무 복잡해요. 조금 지우고 다시 남겨 주세요.");
      }
      /* 숨긴 레이어에 그린 획은 결과에 없으므로 기록에서도 뺍니다. */
      const shown = new Set(layers.map((l, i) => (l.visible ? i : -1)).filter(i => i >= 0));
      const ops = opsRef.current.filter(o => shown.has(o.l));
      onDone({ image, comment, author, replay: JSON.stringify(ops) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "남기지 못했어요.");
    }
  };

  const activeVisible = layers.find(l => l.id === activeId)?.visible ?? true;

  return (
    <div className="cy-oe-pad">
      <canvas
        ref={viewRef}
        width={SIZE}
        height={SIZE}
        className="cy-oe-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="img"
        aria-label="그림판"
      />

      <div className="cy-oe-tools">
        <div className="cy-oe-colors" role="group" aria-label="색">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={"cy-oe-color" + (c === color ? " is-on" : "")}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`색 ${c}`}
              aria-pressed={c === color}
            />
          ))}
        </div>

        <div className="cy-oe-row">
          {TOOLS.map(t => (
            <button
              key={t.id}
              type="button"
              className={"cy-oe-icon" + (tool === t.id ? " is-on" : "")}
              onClick={() => setTool(t.id)}
              aria-pressed={tool === t.id}
              aria-label={t.label}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}

          {WIDTHS.map(w => (
            <button
              key={w}
              type="button"
              className={"cy-oe-width" + (w === width ? " is-on" : "")}
              onClick={() => setWidth(w)}
              aria-label={`굵기 ${w}`}
              aria-pressed={w === width}
            >
              <span style={{ width: w + 2, height: w + 2 }} />
            </button>
          ))}

          {tool === "rect" || tool === "ellipse" ? (
            <button
              type="button"
              className={"cy-oe-btn" + (filled ? " is-on" : "")}
              onClick={() => setFilled(v => !v)}
              aria-pressed={filled}
              title="도형 속까지 칠하기"
            >
              채움
            </button>
          ) : null}

          <label className="cy-oe-opacity" title={`농도 ${Math.round(opacity * 100)}%`}>
            <span aria-hidden="true">농도</span>
            <input
              id={`${fieldId}-opacity`}
              name="oekaki-opacity"
              type="range"
              min={10}
              max={100}
              step={10}
              value={Math.round(opacity * 100)}
              onChange={e => setOpacity(Number(e.target.value) / 100)}
              aria-label={`농도 ${Math.round(opacity * 100)}퍼센트`}
            />
          </label>

          <button
            type="button"
            className="cy-oe-icon"
            onClick={() => restore(undoRef, redoRef)}
            disabled={steps.undo === 0}
            aria-label="되돌리기"
            title="되돌리기"
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className="cy-oe-icon"
            onClick={() => restore(redoRef, undoRef)}
            disabled={steps.redo === 0}
            aria-label="다시하기"
            title="다시하기"
          >
            <UndoIcon flip />
          </button>
        </div>

        <div className="cy-oe-row">
          <span className="cy-oe-layers">
            {layers.map((l, i) => (
              <span key={l.id} className="cy-oe-layer">
                <button
                  type="button"
                  className={"cy-oe-layer-pick" + (l.id === activeId ? " is-on" : "")}
                  onClick={() => setActiveId(l.id)}
                  aria-pressed={l.id === activeId}
                  title={`레이어 ${i + 1} 선택`}
                  aria-label={`레이어 ${i + 1} 선택`}
                >
                  {i + 1}
                </button>
                <button
                  type="button"
                  className={"cy-oe-layer-eye" + (l.visible ? "" : " is-off")}
                  onClick={() => setLayers(prev => prev.map(x => (x.id === l.id ? { ...x, visible: !x.visible } : x)))}
                  aria-label={`레이어 ${i + 1} ${l.visible ? "숨기기" : "보이기"}`}
                  title={l.visible ? "숨기기" : "보이기"}
                >
                  {l.visible ? "◉" : "○"}
                </button>
                {layers.length > 1 ? (
                  <button
                    type="button"
                    className="cy-oe-layer-del"
                    onClick={() => removeLayer(l.id)}
                    aria-label={`레이어 ${i + 1} 지우기`}
                    title="이 레이어 지우기"
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
            {layers.length < MAX_LAYERS ? (
              <button type="button" className="cy-oe-icon" onClick={addLayer} title="레이어 추가" aria-label="레이어 추가">
                +
              </button>
            ) : null}
          </span>
        </div>

        {!activeVisible ? <p className="cy-oe-hidden-note">선택한 레이어가 숨겨져 있어 그릴 수 없어요.</p> : null}

        <div className="cy-oe-row">
          <input
            id={`${fieldId}-author`}
            name="oekaki-author"
            className="cy-oe-author-input"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="이름"
            maxLength={OEKAKI_LIMITS.author}
            aria-label="이름"
            autoComplete="nickname"
          />
          <input
            id={`${fieldId}-title`}
            name="oekaki-title"
            className="cy-oe-comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="제목 (안 써도 됩니다)"
            maxLength={OEKAKI_LIMITS.comment}
            aria-label="그림 제목"
            autoComplete="off"
          />
          <button type="button" className="cy-gb-submit" onClick={submit}>
            남기기
          </button>
          <button type="button" className="cy-oe-btn" onClick={onCancel}>
            닫기
          </button>
        </div>

        {error ? (
          <span className="cy-gb-message is-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
