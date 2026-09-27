/* YouTube IFrame Player API 로더입니다. 원본 src/lib/youtube.ts 를 옮겼습니다.
   BGM 을 음원 파일 대신 유튜브 영상으로 재생합니다. 스크립트는 페이지당 한 번만 불러옵니다. */

export const PLAYER_STATE = {
  unstarted: -1,
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3,
  cued: 5
} as const;

/* 실제로 쓰는 것만 적었습니다. @types/youtube 를 따로 받지 않으려는 의도입니다. */
export type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (target: string | { videoId: string; startSeconds?: number }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
  destroy: () => void;
};

type PlayerOptions = {
  videoId: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
};

export type YouTubeApi = {
  Player: new (element: HTMLElement, options: PlayerOptions) => YouTubePlayer;
};

type YouTubeWindow = Window & {
  YT?: YouTubeApi;
  onYouTubeIframeAPIReady?: () => void;
};

const SCRIPT_SRC = "https://www.youtube.com/iframe_api";

let pending: Promise<YouTubeApi> | null = null;

export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 불러올 수 있습니다."));
  }
  if (pending) return pending;

  const win = window as YouTubeWindow;

  pending = new Promise<YouTubeApi>((resolve, reject) => {
    if (win.YT?.Player) {
      resolve(win.YT);
      return;
    }

    /* 스크립트가 준비되면 유튜브가 이 전역 함수를 불러 줍니다.
       다른 코드가 먼저 걸어 둔 것이 있으면 같이 실행합니다. */
    const previous = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (win.YT?.Player) resolve(win.YT);
      else reject(new Error("유튜브 플레이어를 준비하지 못했습니다."));
    };

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("유튜브 스크립트를 불러오지 못했습니다."));
      document.head.appendChild(script);
    }
  });

  /* 실패하면 다음에 다시 시도할 수 있게 캐시를 비웁니다. */
  pending.catch(() => {
    pending = null;
  });

  return pending;
}
