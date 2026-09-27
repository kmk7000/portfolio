import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { bgmTracks } from "../config/site.ts";
import { clock, trackIndexAt } from "../lib/bgm.ts";
import { PLAYER_STATE, loadYouTubeApi, type YouTubePlayer } from "../lib/youtube.ts";

/* 인트로 버튼을 누르는 순간 재생을 시작하려고 부모에게 start 를 넘겨줍니다.
   브라우저는 클릭 같은 사용자 동작 안에서만 소리 나는 재생을 허용합니다. */
export type BgmHandle = { start: () => void };

const DEFAULT_VOLUME = 40;
/* 재생을 걸어 놓고 이만큼 지켜봐도 실제로 재생되지 않으면 막힌 것으로 봅니다. */
const BLOCK_CHECK_MS = 900;
const BLOCK_CHECK_TRIES = 6;

export default function BgmPlayer({ ref }: { ref?: Ref<BgmHandle> }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  /* 플레이어가 준비되기 전에 재생을 누른 경우를 기억해 둡니다. */
  const wantsPlayRef = useRef(false);
  /* 준비되기 전에 바꾼 볼륨·음소거도 준비되는 순간 반영합니다. */
  const volumeRef = useRef(DEFAULT_VOLUME);
  const mutedRef = useRef(false);
  const blockTimerRef = useRef<number | null>(null);
  /* 지금 플레이어에 올라가 있는 영상입니다. 같은 영상 안의 곡이면 다시 불러오지 않고 위치만 옮깁니다. */
  const loadedVideoRef = useRef(bgmTracks[0]?.videoId ?? "");

  const stopWatching = () => {
    if (blockTimerRef.current !== null) window.clearInterval(blockTimerRef.current);
    blockTimerRef.current = null;
  };

  useEffect(() => {
    if (bgmTracks.length === 0) return;

    let cancelled = false;
    let player: YouTubePlayer | null = null;

    loadYouTubeApi()
      .then(api => {
        if (cancelled || !stageRef.current) return;
        /* 유튜브가 자리 표시 요소를 iframe 으로 바꿔 끼웁니다. React 가 관리하는 노드를
           건드리지 않도록 안쪽에 새 요소를 만들어 넘깁니다. */
        const mount = document.createElement("div");
        stageRef.current.replaceChildren(mount);

        player = new api.Player(mount, {
          videoId: bgmTracks[0].videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1
          },
          events: {
            onReady: () => {
              if (cancelled || !player) return;
              player.setVolume(volumeRef.current);
              if (mutedRef.current) player.mute();
              /* 준비가 끝난 뒤에만 바깥에서 쓰게 넘겨 둡니다. onReady 전에는 playVideo 같은
                 함수가 아직 붙어 있지 않아서, 그 사이에 누르면 오류가 납니다. */
              playerRef.current = player;
              if (wantsPlayRef.current) player.playVideo();
            },
            onStateChange: event => {
              if (event.data === PLAYER_STATE.playing) {
                setPlaying(true);
                setBlocked(false);
              } else if (event.data === PLAYER_STATE.paused) {
                setPlaying(false);
              } else if (event.data === PLAYER_STATE.ended) {
                /* 영상이 끝났습니다. 처음 곡으로 돌아가 다시 틉니다. */
                setIndex(0);
                loadedVideoRef.current = bgmTracks[0].videoId;
                playerRef.current?.loadVideoById({
                  videoId: bgmTracks[0].videoId,
                  startSeconds: bgmTracks[0].startAt ?? 0
                });
              }
            },
            onError: event => {
              /* 100/101/150 은 영상이 없거나 임베드가 막힌 경우입니다. 원인을 남겨 둡니다. */
              setErrorCode(event?.data ?? null);
              setFailed(true);
              setPlaying(false);
            }
          }
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      stopWatching();
      if (typeof player?.destroy === "function") player.destroy();
      playerRef.current = null;
    };
  }, []);

  /* 한 영상 안에 여러 곡이 들어 있는 경우, 재생이 흘러가는 대로 현재 곡 표시를 옮깁니다. */
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const found = trackIndexAt(bgmTracks, loadedVideoRef.current, player.getCurrentTime());
      if (found >= 0) setIndex(current => (current === found ? current : found));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  /* 재생을 건 뒤 실제로 소리가 나는지 확인합니다. iOS 처럼 클릭이 있어도 막는 경우가 있습니다. */
  const watchForBlock = useCallback(() => {
    stopWatching();
    let tries = 0;
    blockTimerRef.current = window.setInterval(() => {
      tries += 1;
      if (playerRef.current?.getPlayerState() === PLAYER_STATE.playing) {
        stopWatching();
        return;
      }
      if (tries >= BLOCK_CHECK_TRIES) {
        stopWatching();
        setBlocked(true);
      }
    }, BLOCK_CHECK_MS);
  }, []);

  const start = useCallback(() => {
    wantsPlayRef.current = true;
    playerRef.current?.playVideo();
    watchForBlock();
  }, [watchForBlock]);

  useImperativeHandle(ref, () => ({ start }), [start]);

  const toggle = () => {
    const player = playerRef.current;
    if (!player) {
      /* 아직 플레이어가 준비되지 않았습니다. 준비되는 대로 재생하도록 기억해 둡니다. */
      wantsPlayRef.current = true;
      setBlocked(false);
      return;
    }
    if (playing) {
      /* 사용자가 직접 멈춘 것이므로 차단 안내를 띄우지 않습니다. */
      stopWatching();
      wantsPlayRef.current = false;
      player.pauseVideo();
    } else {
      setBlocked(false);
      wantsPlayRef.current = true;
      player.playVideo();
      watchForBlock();
    }
  };

  const selectTrack = (next: number) => {
    const track = bgmTracks[next];
    setIndex(next);
    setBlocked(false);

    const player = playerRef.current;
    if (!player) return;

    if (track.videoId === loadedVideoRef.current) {
      player.seekTo(track.startAt ?? 0, true);
      player.playVideo();
    } else {
      /* 다른 영상이면 곡만 바꿔 끼웁니다. 플레이어를 새로 만들지 않아야 끊기지 않습니다. */
      loadedVideoRef.current = track.videoId;
      player.loadVideoById({ videoId: track.videoId, startSeconds: track.startAt ?? 0 });
    }
    watchForBlock();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    const player = playerRef.current;
    if (!player) return;
    if (next) player.mute();
    else player.unMute();
  };

  const changeVolume = (next: number) => {
    setVolume(next);
    volumeRef.current = next;
    const player = playerRef.current;
    player?.setVolume(next);
    if (next > 0 && muted) {
      player?.unMute();
      setMuted(false);
      mutedRef.current = false;
    }
  };

  if (bgmTracks.length === 0) return null;

  const current = bgmTracks[index];

  return (
    <div className="cy-bgm">
      <div className="cy-bgm-heading">♬ MINI HOMPY BGM</div>

      <ul className="cy-bgm-list">
        {bgmTracks.map((track, i) => (
          <li key={track.id}>
            <button
              type="button"
              className={"cy-bgm-track" + (i === index ? " is-current" : "")}
              onClick={() => selectTrack(i)}
              title={track.artist ? `${track.title} / ${track.artist}` : track.title}
              aria-current={i === index ? "true" : undefined}
            >
              <span className="cy-bgm-mark" aria-hidden="true">
                {i === index && playing ? "▶" : ""}
              </span>
              <span className="cy-bgm-no">{String(i + 1).padStart(2, "0")}.</span>
              <span className="cy-bgm-name">{track.title}</span>
              {track.startAt ? <span className="cy-bgm-time">{clock(track.startAt)}</span> : null}
            </button>
          </li>
        ))}
      </ul>

      <div className="cy-bgm-controls">
        <button type="button" onClick={toggle} aria-label={playing ? "정지" : "재생"}>
          {playing ? "❚❚" : "▶"}
        </button>
        {bgmTracks.length > 1 ? (
          <button type="button" onClick={() => selectTrack((index + 1) % bgmTracks.length)} aria-label="다음곡">
            ▶▶
          </button>
        ) : null}
        <button type="button" onClick={toggleMute} aria-label={muted ? "음소거 해제" : "음소거"}>
          {muted ? "🔇" : "🔊"}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={event => changeVolume(Number(event.target.value))}
          aria-label="볼륨"
          aria-valuetext={`${volume}%`}
        />
      </div>

      {current.artist ? <div className="cy-bgm-artist">{current.artist}</div> : null}

      {failed ? (
        <div className="cy-bgm-note" role="status">
          BGM 을 불러오지 못했어요{errorCode !== null ? ` (${errorCode})` : ""}.
        </div>
      ) : blocked ? (
        <div className="cy-bgm-note" role="status">
          재생 버튼을 눌러 주세요.
        </div>
      ) : null}

      {/* 유튜브가 이 자리를 iframe 으로 바꿉니다. 소리만 쓰므로 항상 화면 밖에 둡니다. */}
      <div className="cy-bgm-stage" aria-hidden="true">
        <div ref={stageRef} />
      </div>
    </div>
  );
}
