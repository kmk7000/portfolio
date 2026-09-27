import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GREETING_MODE_ID, characterModes } from "../../config/character.ts";
import { furnitureItems } from "../../config/furniture.ts";
import { profile } from "../../config/site.ts";
import { asset } from "../../lib/asset.ts";
import type { FurnitureLayout } from "../../lib/site-content.ts";
import { useSite } from "../../lib/site-context.tsx";
import {
  BUBBLE_DURATION_MS,
  START_POSITION,
  WALK_SPEED,
  clampToFloor,
  facingToward,
  findNearby,
  isTap,
  isArrowKey,
  isEditableTarget,
  pointToPercent,
  stepCharacter,
  walkToward,
  type Point
} from "../../lib/miniroom.ts";

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Press = { id: number; x: number; y: number; at: number; dragging: boolean };

const GREETING_DELAY_MS = 400;

/* 방향키로 움직이고 클릭하면 모드(포즈+멘트)가 바뀌는 미니룸 캐릭터입니다.
   가구와 캐릭터는 방 그림 위의 % 좌표로 놓여서, 미니룸 크기가 바뀌어도 비율이 같습니다. */
export default function MiniRoom({ greet, onGreeted }: { greet: boolean; onGreeted: () => void }) {
  const [pos, setPos] = useState<Point>(START_POSITION);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [modeIndex, setModeIndex] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  /* 가구 배치는 주인장이 편집 모드에서 끌어 옮기면 저장됩니다(site/content.furniture).
     ?edit=1 은 원본의 개발용 미리보기로, 옮겨도 저장되지 않습니다. */
  const { content, update, editing: ownerEditing } = useSite();
  const [canPreview] = useState(() => new URLSearchParams(window.location.search).get("edit") === "1");
  const [previewMode, setPreviewMode] = useState(false);
  const editMode = ownerEditing || previewMode;
  const [layout, setLayout] = useState<FurnitureLayout>(content.furniture);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const saveRef = useRef<(next: FurnitureLayout) => void>(() => {});
  saveRef.current = next => {
    if (ownerEditing) update({ furniture: next });
  };

  /* 저장된 배치가 바뀌면(다른 기기에서 고쳤거나 처음 불러왔을 때) 따라갑니다. 끄는 중에는 기다립니다. */
  useEffect(() => {
    if (!draggingId && !previewMode) setLayout(content.furniture);
  }, [content.furniture, draggingId, previewMode]);

  /* 미니홈피에 처음 들어온 순간 인사 멘트를 띄웁니다. 이 멘트는 타이머로 사라지지 않고,
     캐릭터를 클릭해서 모드를 바꾸기 전까지 떠 있습니다. */
  useEffect(() => {
    if (!greet) return;
    const waveIndex = characterModes.findIndex(m => m.id === GREETING_MODE_ID);
    if (waveIndex === -1) {
      onGreeted();
      return;
    }
    const timer = setTimeout(() => {
      setModeIndex(waveIndex);
      setBubble(characterModes[waveIndex].lines[0]);
      onGreeted();
    }, GREETING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [greet, onGreeted]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isArrowKey(event.key)) return;
      /* 글자 입력·볼륨 슬라이더·선택 상자에서는 방향키를 그 칸에 양보하고,
         Alt+← 같은 브라우저 단축키도 막지 않습니다. */
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
      event.preventDefault();
      stopWalking();
      const key = event.key;
      if (key === "ArrowLeft") setFacing("left");
      if (key === "ArrowRight") setFacing("right");
      setPos(prev => stepCharacter(prev, key));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(
    () => () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    },
    []
  );

  /* 편집모드에서 가구 끌기 */
  useEffect(() => {
    if (!draggingId) return;
    function onMove(event: PointerEvent) {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = pointToPercent(event.clientX, event.clientY, rect);
      setLayout(prev => ({ ...prev, [draggingId as string]: { ...prev[draggingId as string], ...point } }));
    }
    function onUp() {
      setDraggingId(null);
      saveRef.current(layoutRef.current);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingId]);

  const startDrag = (id: string) => (event: ReactPointerEvent) => {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingId(id);
  };

  const toggleFlip = (id: string) => {
    const next = { ...layoutRef.current, [id]: { ...layoutRef.current[id], flip: !layoutRef.current[id].flip } };
    setLayout(next);
    saveRef.current(next);
  };

  /* ---------------- 마우스·터치로 움직이기 ----------------
     - 바닥을 누르면(클릭/톡) 그 자리로 걸어갑니다.
     - 캐릭터를 끌면 손가락·마우스를 따라옵니다. 톡 누르면 지금처럼 모드가 바뀝니다.
     - 누른 채 움직이면 "누르기" 로 보지 않아서, 모바일에서 미니룸 위를 쓸어도 페이지가 그대로 스크롤됩니다. */
  const [walking, setWalking] = useState(false);
  const [draggingChar, setDraggingChar] = useState(false);
  const posRef = useRef(pos);
  posRef.current = pos;
  const walkFrame = useRef<number | null>(null);
  const floorPress = useRef<Press | null>(null);
  const charPress = useRef<Press | null>(null);
  /* 끌기가 끝난 직후 따라오는 click 으로 모드가 바뀌지 않게 막습니다. */
  const suppressClick = useRef(false);

  function stopWalking() {
    if (walkFrame.current !== null) cancelAnimationFrame(walkFrame.current);
    walkFrame.current = null;
    setWalking(false);
  }

  useEffect(() => () => stopWalking(), []);

  const stagePoint = (clientX: number, clientY: number): Point | null => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const p = pointToPercent(clientX, clientY, rect);
    return clampToFloor(p.x, p.y);
  };

  function walkTo(target: Point) {
    stopWalking();
    setFacing(f => facingToward(posRef.current, target, f));
    if (prefersReducedMotion()) {
      setPos(target);
      return;
    }
    setWalking(true);
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const next = walkToward(posRef.current, target, WALK_SPEED * dt);
      posRef.current = next.pos;
      setPos(next.pos);
      if (next.arrived) {
        walkFrame.current = null;
        setWalking(false);
      } else {
        walkFrame.current = requestAnimationFrame(step);
      }
    };
    walkFrame.current = requestAnimationFrame(step);
  }

  /* 바닥 누르기 — 캐릭터·버튼·가구 편집 중에는 무시합니다. */
  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (editMode || !event.isPrimary || event.button > 0) return;
    if ((event.target as Element).closest("button, a, input, .is-editable")) return;
    floorPress.current = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), dragging: false };
  };
  const onStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const press = floorPress.current;
    floorPress.current = null;
    if (!press || press.id !== event.pointerId) return;
    if (!isTap(event.clientX - press.x, event.clientY - press.y, performance.now() - press.at)) return;
    const target = stagePoint(event.clientX, event.clientY);
    if (target) walkTo(target);
  };

  /* 캐릭터 끌기 */
  const onCharPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (editMode || !event.isPrimary || event.button > 0) return;
    /* 터치로 끈 뒤에는 브라우저가 click 을 안 보내기도 해서, 새로 누를 때 막음 표시를 지웁니다. */
    suppressClick.current = false;
    charPress.current = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onCharPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = charPress.current;
    if (!press || press.id !== event.pointerId) return;
    if (!press.dragging) {
      if (isTap(event.clientX - press.x, event.clientY - press.y, 0)) return;
      press.dragging = true;
      stopWalking();
      setDraggingChar(true);
    }
    const target = stagePoint(event.clientX, event.clientY);
    if (!target) return;
    setFacing(f => facingToward(posRef.current, target, f));
    posRef.current = target;
    setPos(target);
  };
  const endCharPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = charPress.current;
    if (!press || press.id !== event.pointerId) return;
    charPress.current = null;
    if (press.dragging) {
      suppressClick.current = true;
      setDraggingChar(false);
    }
  };
  const onCharClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    cycleMode();
  };

  const mode = characterModes[modeIndex];

  /* 캐릭터와 가장 가까운 가구의 상호작용 문구입니다. 클릭으로 뜬 모드 멘트가 먼저입니다. */
  const nearbyItem = useMemo(() => findNearby(pos, furnitureItems, layout), [pos, layout]);
  const displayBubble = bubble ?? nearbyItem?.hint ?? null;

  function cycleMode() {
    const nextIndex = (modeIndex + 1) % characterModes.length;
    const nextMode = characterModes[nextIndex];
    setModeIndex(nextIndex);
    setBubble(nextMode.lines[Math.floor(Math.random() * nextMode.lines.length)]);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_DURATION_MS);
  }

  const flipScale = facing === "right" ? -1 : 1;

  return (
    <div
      className={"cy-miniroom-stage" + (editMode ? "" : " is-walkable")}
      ref={stageRef}
      onPointerDown={onStagePointerDown}
      onPointerUp={onStagePointerUp}
      onPointerCancel={() => {
        floorPress.current = null;
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <img className="cy-miniroom-bg" src={asset(profile.miniroom.src)} alt={profile.miniroom.alt} />

      {furnitureItems.map(item => {
        const placed = layout[item.id];
        return (
          <div
            key={item.id}
            className={"cy-miniroom-furniture-wrap" + (editMode ? " is-editable" : "")}
            style={{ left: `${placed.x}%`, top: `${placed.y}%`, height: `${item.heightPercent}%` }}
            onPointerDown={startDrag(item.id)}
          >
            <img
              className="cy-miniroom-furniture"
              src={asset(item.src)}
              alt={item.alt}
              draggable={false}
              style={{ transform: `scaleX(${placed.flip ? -1 : 1})` }}
            />
            {editMode ? (
              <div className="cy-edit-tag">
                <span>
                  {item.id} · {placed.x.toFixed(1)}, {placed.y.toFixed(1)}
                </span>
                <button
                  type="button"
                  onPointerDown={event => event.stopPropagation()}
                  onClick={event => {
                    event.stopPropagation();
                    toggleFlip(item.id);
                  }}
                  title="좌우 반전"
                  aria-label={`${item.alt} 좌우 반전`}
                >
                  ⇋
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      {editMode ? (
        <div className="cy-miniroom-character-tag" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
          캐릭터 · {pos.x.toFixed(1)}, {pos.y.toFixed(1)}
        </div>
      ) : null}

      {canPreview && !ownerEditing ? (
        <button type="button" className="cy-miniroom-edit-toggle" onClick={() => setPreviewMode(v => !v)}>
          {previewMode ? "편집모드 끄기" : "편집모드"}
        </button>
      ) : null}
      {ownerEditing ? (
        <div className="cy-miniroom-edit-toggle" role="note">
          가구를 끌어 옮기면 저장돼요
        </div>
      ) : null}

      {(hovering || focused) && !editMode ? (
        <div className="cy-miniroom-hint" aria-hidden="true">
          바닥을 누르거나 방향키로 이동 · 캐릭터를 누르면 모드가 바뀌어요
        </div>
      ) : null}

      <button
        type="button"
        className={
          "cy-miniroom-character" +
          (walking ? " is-walking" : "") +
          (draggingChar ? " is-dragging" : "") +
          (mode.float ? " is-floating" : "")
        }
        onPointerDown={onCharPointerDown}
        onPointerMove={onCharPointerMove}
        onPointerUp={endCharPress}
        onPointerCancel={endCharPress}
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          /* 포즈마다 그림 높이가 달라서, 사람 크기가 같아 보이도록 비율대로 줄입니다. (CSS 기본값 × scale) */
          height: `calc(var(--char-h) * ${mode.scale})`,
          minHeight: `calc(var(--char-min) * ${mode.scale})`,
          maxHeight: `calc(var(--char-max) * ${mode.scale})`,
          transform: `translate(-50%, -100%) scaleX(${flipScale})`
        }}
        onClick={onCharClick}
        aria-label={`캐릭터 모드 바꾸기 (현재: ${mode.label})`}
      >
        {displayBubble ? (
          <span
            className={`cy-character-bubble${!bubble ? " is-hint" : ""}`}
            style={{ transform: `translateX(-50%) scaleX(${flipScale})` }}
          >
            {displayBubble}
          </span>
        ) : null}
        {mode.float ? <span className="cy-char-shadow" aria-hidden="true" /> : null}
        <img src={asset(mode.src)} alt={`미니미 - ${mode.label}`} draggable={false} />
      </button>

      {/* 말풍선 내용을 화면 낭독기에도 알려 줍니다. */}
      <span className="cy-visually-hidden" aria-live="polite">
        {displayBubble ?? ""}
      </span>
    </div>
  );
}
