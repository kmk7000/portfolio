/* BGM 플레이어에서 쓰는 계산입니다. 원본 BgmPlayer.tsx / linktree.ts 에서 옮겼습니다. */

/* 초를 3:21 처럼 보여 줍니다. 한 시간이 넘으면 1:02:27 처럼 시까지 붙입니다. */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const tail = `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${tail}` : `${minutes}:${String(rest).padStart(2, "0")}`;
}

/* "3:21" 이나 "1:02:30" 을 초로 바꿉니다. */
export function secondsAt(timestamp: string): number {
  return timestamp
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

/* 한 영상 안에 여러 곡이 들어 있을 때, 지금 재생 위치에 해당하는 곡 번호를 찾습니다.
   같은 영상의 곡들은 startAt 이 작은 것부터 차례로 적혀 있다고 봅니다. 없으면 -1 입니다. */
export function trackIndexAt(
  tracks: readonly { videoId: string; startAt?: number }[],
  videoId: string,
  at: number
): number {
  let found = -1;
  tracks.forEach((track, i) => {
    if (track.videoId !== videoId) return;
    if ((track.startAt ?? 0) <= at + 0.5) found = i;
  });
  return found;
}

/* 영상이 끝났을 때 틀 다음 곡입니다. 목록 순서대로 가고, 마지막 다음은 첫 곡입니다.
   - 지금 곡을 모르면(목록이 바뀌어 사라졌으면) 끝난 영상의 마지막 곡을 기준으로 삼습니다.
   - 한 영상에 여러 곡이 있으면 영상이 끝난 것은 그 영상의 마지막 곡이 끝난 것이므로,
     같은 영상의 뒤쪽 곡은 건너뛰고 그다음 곡으로 갑니다. */
export function nextTrackAfterEnd<T extends { id: string; videoId: string }>(
  tracks: readonly T[],
  currentId: string | null,
  endedVideoId: string
): T | null {
  if (tracks.length === 0) return null;
  let i = tracks.findIndex(t => t.id === currentId);
  if (i < 0 || tracks[i].videoId !== endedVideoId) {
    i = -1;
    tracks.forEach((t, j) => {
      if (t.videoId === endedVideoId) i = j;
    });
  }
  if (i < 0) return tracks[0];
  for (let step = 1; step <= tracks.length; step++) {
    const next = tracks[(i + step) % tracks.length];
    /* 같은 영상의 바로 뒤 곡들은 이미 재생된 것으로 봅니다(한 곡뿐이면 그 곡을 다시 틉니다). */
    if (next.videoId !== endedVideoId || step === tracks.length || (i + step) % tracks.length <= i) return next;
  }
  return tracks[0];
}
