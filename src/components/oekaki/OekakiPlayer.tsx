import { useEffect, useRef, useState } from "react";
import {
  BACKGROUND,
  OP,
  SHAPE_STEPS,
  SIZE,
  applyMask,
  decodePoints,
  floodMask,
  polylinePrefix,
  rectPath,
  segmentsOf,
  segmentsPerFrame,
  type ReplayOp
} from "../../lib/oekaki/draw.ts";

function strokePath(c: CanvasRenderingContext2D, pts: readonly [number, number][]) {
  if (pts.length === 0) return;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}

/* ---------------------------------------------------------------
   그리는 과정 재생 (원본 Oekaki.tsx 의 OekakiPlayer)

   기록에는 벡터로 되는 도구만 담겨 있습니다. 흐리게는 자리만 있고 건너뜁니다.
   재생이 끝나면 저장된 그림으로 바꿔서 마지막 장면은 늘 정확합니다.
   --------------------------------------------------------------- */
export default function OekakiPlayer({ image, ops }: { image: string; ops: ReplayOp[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const view = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !view) return;
    let raf = 0;
    let stopped = false;
    setDone(false);

    /* 한 획을 그리는 동안에는 그 획 직전 그림(base)을 매 프레임 깔고 그 위에 지금까지 그은 만큼을
       얹습니다. 덧그리기만 하면 농도가 낮을 때 겹쳐서 점점 짙어집니다. */
    const make = () => {
      const c = document.createElement("canvas");
      c.width = SIZE;
      c.height = SIZE;
      return c;
    };
    const base = make();
    const temp = make();
    const baseC = base.getContext("2d");
    const tempC = temp.getContext("2d");
    if (!baseC || !tempC) return;

    const clear = (c: CanvasRenderingContext2D) => c.clearRect(0, 0, SIZE, SIZE);
    baseC.fillStyle = BACKGROUND;
    baseC.fillRect(0, 0, SIZE, SIZE);

    const perFrame = segmentsPerFrame(ops);
    let opIdx = 0;
    let segIdx = 0;

    /* 지금 획을 임시 판에 불투명으로 그립니다. 농도는 얹을 때 한 번만 씁니다. */
    const paintTemp = (o: ReplayOp, upto: number) => {
      clear(tempC);
      tempC.strokeStyle = o.c ?? "#000000";
      tempC.fillStyle = o.c ?? "#000000";
      tempC.lineWidth = o.k === OP.eraser ? (o.w ?? 7) * 2 : (o.w ?? 7);
      tempC.lineCap = "round";
      tempC.lineJoin = "round";

      const p = o.p ?? [];
      if (o.k === OP.pen || o.k === OP.eraser) {
        const pts = decodePoints(p);
        if (pts.length === 0) return;
        if (pts.length === 1) {
          strokePath(tempC, [pts[0], [pts[0][0] + 0.01, pts[0][1]]]);
          return;
        }
        strokePath(tempC, pts.slice(0, upto + 1));
        return;
      }

      if (p.length < 4) return;
      const [x1, y1, x2, y2] = p;
      const t = Math.min(1, upto / SHAPE_STEPS);

      /* 채움은 테두리를 다 두른 뒤에 칠합니다. */
      if (o.f && t >= 1) {
        tempC.beginPath();
        if (o.k === OP.rect) {
          tempC.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        } else {
          tempC.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
        }
        tempC.fill();
      }

      if (o.k === OP.line) {
        strokePath(tempC, polylinePrefix([[x1, y1], [x2, y2]], t));
      } else if (o.k === OP.rect) {
        strokePath(tempC, polylinePrefix(rectPath(x1, y1, x2, y2), t));
      } else {
        /* 타원은 위에서 시작해 시계 방향으로 돌립니다. */
        tempC.beginPath();
        tempC.ellipse(
          (x1 + x2) / 2,
          (y1 + y2) / 2,
          Math.abs(x2 - x1) / 2,
          Math.abs(y2 - y1) / 2,
          0,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * t
        );
        tempC.stroke();
      }
    };

    const show = (o: ReplayOp | null) => {
      view.globalAlpha = 1;
      view.globalCompositeOperation = "source-over";
      view.clearRect(0, 0, SIZE, SIZE);
      view.drawImage(base, 0, 0);
      if (!o) return;
      view.globalAlpha = (o.o ?? 100) / 100;
      view.globalCompositeOperation = o.k === OP.eraser ? "destination-out" : "source-over";
      view.drawImage(temp, 0, 0);
      view.globalAlpha = 1;
      view.globalCompositeOperation = "source-over";
    };

    const keep = () => {
      clear(baseC);
      baseC.drawImage(canvas, 0, 0);
    };

    const step = () => {
      if (stopped) return;
      let budget = perFrame;

      while (budget > 0 && opIdx < ops.length) {
        const o = ops[opIdx];

        if (o.k === OP.blur) {
          opIdx += 1;
          continue;
        }

        if (o.k === OP.fill) {
          show(null);
          const p = o.p ?? [];
          const img = view.getImageData(0, 0, SIZE, SIZE);
          applyMask(img, floodMask(img, p[0] ?? 0, p[1] ?? 0), o.c ?? "#000000");
          view.putImageData(img, 0, 0);
          keep();
          opIdx += 1;
          budget -= 1;
          continue;
        }

        const segs = segmentsOf(o);
        segIdx += 1;
        paintTemp(o, segIdx);
        show(o);
        budget -= 1;

        if (segIdx >= segs) {
          keep();
          opIdx += 1;
          segIdx = 0;
        }
      }

      if (opIdx >= ops.length) {
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(step);
    };

    show(null);
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [ops, round]);

  return (
    <div className="cy-oe-player">
      {/* 재생이 끝나면 저장된 그림을 위에 얹습니다. 캔버스는 감추기만 하고 자리에 남겨 둬야
          "다시 재생" 때 그릴 대상이 남아 있습니다. */}
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className={"cy-oe-big" + (done ? " is-hidden" : "")}
        role="img"
        aria-label="그리는 과정 재생 중"
      />
      {done ? <img className="cy-oe-big" src={image} alt="다 그려진 그림" /> : null}
      <button type="button" className="cy-oe-btn" onClick={() => setRound(r => r + 1)}>
        {done ? "다시 재생" : "처음부터"}
      </button>
    </div>
  );
}
