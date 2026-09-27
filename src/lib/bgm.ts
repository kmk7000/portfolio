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
