import type { WaveLink } from "../config/site.ts";
import { isSafeHref, moveItem, newId } from "../lib/site-content.ts";
import { useSite } from "../lib/site-context.tsx";
import EditableText from "./Editable.tsx";

/* 파도타기를 고칠 때 쓰는 줄 목록입니다. (원본과 같은 모양) */
function WaveEditor() {
  const { content, update } = useSite();
  const links = content.waveLinks;

  const replace = (id: string, patch: Partial<WaveLink>) =>
    update({ waveLinks: links.map(w => (w.id === id ? { ...w, ...patch } : w)) });

  const setHref = (id: string, href: string) => {
    if (href && !isSafeHref(href)) {
      window.alert("https:// 로 시작하는 주소나 mailto: 메일 주소만 넣을 수 있어요.");
      return;
    }
    replace(id, { href });
  };

  return (
    <div className="cy-wave-edit">
      {links.map((wave, index) => (
        <div key={wave.id} className="cy-wave-edit-row">
          <EditableText
            className="cy-wave-label"
            value={wave.label}
            editing
            placeholder="이름"
            label="파도타기 이름"
            onSave={label => replace(wave.id, { label })}
            maxLength={40}
          />
          <EditableText
            className="cy-block-href"
            value={wave.href}
            editing
            placeholder="https://..."
            label="파도타기 주소"
            onSave={href => setHref(wave.id, href)}
          />
          <div className="cy-block-tools cy-wave-tools">
            <button type="button" onClick={() => update({ waveLinks: moveItem(links, index, -1) })} aria-label={`${wave.label} 위로`}>
              ↑
            </button>
            <button type="button" onClick={() => update({ waveLinks: moveItem(links, index, 1) })} aria-label={`${wave.label} 아래로`}>
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("이 링크를 지울까요?")) update({ waveLinks: links.filter(w => w.id !== wave.id) });
              }}
              aria-label={`${wave.label} 지우기`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="cy-wave-add"
        onClick={() => update({ waveLinks: [...links, { id: newId("wave"), label: "새 링크", href: "" }] })}
      >
        + 링크 추가
      </button>
    </div>
  );
}

/* 왼쪽 아래 파도타기 목록입니다. 고르면 새 탭으로 열고, 선택 상자는 다시 "파도타기" 로 돌아갑니다.
   메일 주소(mailto:)는 빈 탭 없이 메일 앱을 엽니다. */
export default function WaveSelect() {
  const { content, editing } = useSite();
  if (editing) return <WaveEditor />;
  const links = content.waveLinks.filter(w => isSafeHref(w.href));

  return (
    <select
      value=""
      aria-label="파도타기"
      onChange={event => {
        const target = links.find(w => w.id === event.target.value);
        if (!target) return;
        if (target.href.startsWith("mailto:")) window.location.href = target.href;
        else window.open(target.href, "_blank", "noopener,noreferrer");
      }}
    >
      <option value="" disabled>
        파도타기
      </option>
      {links.map(wave => (
        <option key={wave.id} value={wave.id}>
          {wave.label}
        </option>
      ))}
    </select>
  );
}
