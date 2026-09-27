import { useId, useState, type FormEvent } from "react";
import type { BgmTrack } from "../config/site.ts";
import { clock } from "../lib/bgm.ts";
import { moveItem, newId, parseYouTubeUrl } from "../lib/site-content.ts";
import { useSite } from "../lib/site-context.tsx";
import { fetchYouTubeInfo } from "../lib/youtube.ts";
import EditableText from "./Editable.tsx";

/* 주인장 편집 모드에서만 보이는 BGM 목록 편집기입니다.
   곡 이름·가수를 고치고, 순서를 바꾸고, 지우고, 유튜브 주소를 붙여 넣어 곡을 더합니다.
   더할 때 유튜브에 물어봐서 다른 사이트에서 재생할 수 없는 영상이면 미리 막습니다. */
export default function BgmEditor() {
  const { content, update } = useSite();
  const tracks = content.bgm;
  const fieldId = useId();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const save = (next: BgmTrack[]) => update({ bgm: next });
  const replace = (id: string, patch: Partial<BgmTrack>) => save(tracks.map(t => (t.id === id ? { ...t, ...patch } : t)));

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = parseYouTubeUrl(url);
    if (!parsed) {
      setMessage({ error: true, text: "유튜브 주소를 알아보지 못했어요. 영상 주소를 그대로 붙여 넣어 주세요." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const info = await fetchYouTubeInfo(parsed.videoId);
      const track: BgmTrack = { id: newId("bgm"), title: info.title.slice(0, 80) || "새 곡", videoId: parsed.videoId };
      if (parsed.startAt) track.startAt = parsed.startAt;
      save([...tracks, track]);
      setUrl("");
      setMessage({ error: false, text: `"${track.title}" 을(를) 추가했어요. 곡 이름과 가수를 눌러 고칠 수 있어요.` });
    } catch (error) {
      setMessage({ error: true, text: error instanceof Error ? error.message : "추가하지 못했어요." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cy-bgm-edit">
      <div className="cy-bgm-edit-head">BGM 목록 편집</div>
      {tracks.length === 0 ? <div className="cy-bgm-edit-empty">곡이 없으면 플레이어가 숨겨져요.</div> : null}
      {tracks.map((track, index) => (
        <div key={track.id} className="cy-wave-edit-row cy-bgm-edit-row">
          <EditableText
            className="cy-wave-label"
            value={track.title}
            editing
            placeholder="곡 이름"
            label="곡 이름"
            maxLength={80}
            onSave={title => replace(track.id, { title: title || "제목 없음" })}
          />
          <EditableText
            className="cy-block-href"
            value={track.artist ?? ""}
            editing
            placeholder="가수 (비워도 돼요)"
            label="가수"
            maxLength={80}
            onSave={artist => replace(track.id, artist ? { artist } : { artist: undefined })}
          />
          <a
            className="cy-block-href"
            href={`https://www.youtube.com/watch?v=${track.videoId}${track.startAt ? `&t=${track.startAt}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            youtu.be/{track.videoId}
            {track.startAt ? ` · ${clock(track.startAt)}부터` : ""}
            <span className="cy-visually-hidden"> (새 창)</span>
          </a>
          <div className="cy-block-tools cy-wave-tools">
            <button type="button" onClick={() => save(moveItem(tracks, index, -1))} aria-label={`${track.title} 위로`}>
              ↑
            </button>
            <button type="button" onClick={() => save(moveItem(tracks, index, 1))} aria-label={`${track.title} 아래로`}>
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`"${track.title}" 을(를) 목록에서 뺄까요?`)) save(tracks.filter(t => t.id !== track.id));
              }}
              aria-label={`${track.title} 지우기`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <form className="cy-bgm-add" onSubmit={add}>
        <input
          id={`${fieldId}-url`}
          className="cy-edit-input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="유튜브 주소 붙여 넣기"
          aria-label="추가할 유튜브 주소"
          autoComplete="off"
        />
        <button type="submit" className="cy-wave-add" disabled={busy || !url.trim()}>
          {busy ? "확인 중…" : "+ 곡 추가"}
        </button>
      </form>
      <span className={`cy-bgm-edit-msg${message?.error ? " is-error" : ""}`} role="status">
        {message?.text ?? ""}
      </span>
    </div>
  );
}
