import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { characterModes } from "../../config/character.ts";
import { furnitureItems } from "../../config/furniture.ts";
import { profile } from "../../config/site.ts";
import { asset } from "../../lib/asset.ts";
import {
  BUBBLE_DURATION_MS,
  START_POSITION,
  findNearby,
  isArrowKey,
  isEditableTarget,
  pointToPercent,
  stepCharacter,
  type Point
} from "../../lib/miniroom.ts";

type FurnitureLayout = Record<string, Point & { flip: boolean }>;

function initialLayout(): FurnitureLayout {
  return Object.fromEntries(furnitureItems.map(item => [item.id, { x: item.x, y: item.y, flip: Boolean(item.flip) }]));
}

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

  /* 편집모드: 가구를 끌어 옮기고 좌우 반전을 미리 볼 수 있습니다(원본과 같은 개발용 기능).
     여기서 옮긴 값은 저장되지 않으니, 마음에 드는 좌표를 src/config/furniture.ts 에 적으세요.
     주소 끝에 ?edit=1 을 붙였을 때만 켜는 버튼이 보입니다. */
  const [canEdit] = useState(() => new URLSearchParams(window.location.search).get("edit") === "1");
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<FurnitureLayout>(initialLayout);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  /* 미니홈피에 처음 들어온 순간 인사 멘트를 띄웁니다. 이 멘트는 타이머로 사라지지 않고,
     캐릭터를 클릭해서 모드를 바꾸기 전까지 떠 있습니다. */
  useEffect(() => {
    if (!greet) return;
    const waveIndex = characterModes.findIndex(m => m.id === "waving");
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

  const toggleFlip = (id: string) =>
    setLayout(prev => ({ ...prev, [id]: { ...prev[id], flip: !prev[id].flip } }));

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
      className="cy-miniroom-stage"
      ref={stageRef}
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

      {canEdit ? (
        <button type="button" className="cy-miniroom-edit-toggle" onClick={() => setEditMode(v => !v)}>
          {editMode ? "편집모드 끄기" : "편집모드"}
        </button>
      ) : null}

      {(hovering || focused) && !editMode ? (
        <div className="cy-miniroom-hint" aria-hidden="true">
          방향키로 이동 · 클릭하면 모드가 바뀌어요
        </div>
      ) : null}

      <button
        type="button"
        className="cy-miniroom-character"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: `translate(-50%, -100%) scaleX(${flipScale})`
        }}
        onClick={cycleMode}
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
        <img src={asset(mode.src)} alt={`미니미 - ${mode.label}`} draggable={false} />
      </button>

      {/* 말풍선 내용을 화면 낭독기에도 알려 줍니다. */}
      <span className="cy-visually-hidden" aria-live="polite">
        {displayBubble ?? ""}
      </span>
    </div>
  );
}
