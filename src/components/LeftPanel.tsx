import type { Ref } from "react";
import { profile } from "../config/site.ts";
import { asset } from "../lib/asset.ts";
import BgmPlayer, { type BgmHandle } from "./BgmPlayer.tsx";
import VisitCounter from "./VisitCounter.tsx";
import WaveSelect from "./WaveSelect.tsx";

/* 다이어리 왼쪽 면: 방문 수, 오늘의 날씨, 프로필 사진·소개, BGM, 이름, 파도타기 */
export default function LeftPanel({ bgmRef }: { bgmRef: Ref<BgmHandle> }) {
  return (
    <div className="cy-left-panel">
      <div className="cy-left-header">
        <VisitCounter />
      </div>
      <div className="cy-left-content">
        <div className="cy-today-is">
          TODAY IS.. <span className="text-orange">{profile.todayIs}</span>
        </div>

        <div className="cy-profile-pic">
          <img src={asset(profile.photo.src)} alt={profile.photo.alt} />
        </div>

        <div className="cy-intro-text">{profile.introDescription}</div>

        <BgmPlayer ref={bgmRef} />

        <div className="cy-profile-name">
          <div className="name-bold">{profile.ownerName}</div>
          <div className="title-sub">{profile.catalogDescription}</div>
        </div>

        <div className="cy-left-dropdown">
          <WaveSelect />
        </div>
      </div>
    </div>
  );
}
