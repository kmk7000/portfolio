import { waveLinks } from "../config/site.ts";

/* 왼쪽 아래 파도타기 목록입니다. 고르면 새 탭으로 열고, 선택 상자는 다시 "파도타기" 로 돌아갑니다.
   메일 주소(mailto:)는 빈 탭 없이 메일 앱을 엽니다. */
export default function WaveSelect() {
  return (
    <select
      value=""
      aria-label="파도타기"
      onChange={event => {
        const target = waveLinks.find(w => w.id === event.target.value);
        if (!target) return;
        if (target.href.startsWith("mailto:")) window.location.href = target.href;
        else window.open(target.href, "_blank", "noopener,noreferrer");
      }}
    >
      <option value="" disabled>
        파도타기
      </option>
      {waveLinks.map(wave => (
        <option key={wave.id} value={wave.id}>
          {wave.label}
        </option>
      ))}
    </select>
  );
}
