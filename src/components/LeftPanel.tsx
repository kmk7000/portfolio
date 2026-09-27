import type { Ref } from "react";
import { profile as staticProfile } from "../config/site.ts";
import { asset } from "../lib/asset.ts";
import type { ProfileKey } from "../lib/site-content.ts";
import { useSite } from "../lib/site-context.tsx";
import BgmPlayer, { type BgmHandle } from "./BgmPlayer.tsx";
import EditableText from "./Editable.tsx";
import VisitCounter from "./VisitCounter.tsx";
import WaveSelect from "./WaveSelect.tsx";

/* 다이어리 왼쪽 면: 방문 수, 오늘의 날씨, 프로필 사진·소개, BGM, 이름, 파도타기 */
export default function LeftPanel({ bgmRef }: { bgmRef: Ref<BgmHandle> }) {
  const { content, update, editing } = useSite();
  const p = content.profile;
  const save = (key: ProfileKey) => (value: string) => update({ profile: { ...content.profile, [key]: value } });

  return (
    <div className="cy-left-panel">
      <div className="cy-left-header">
        <VisitCounter />
      </div>
      <div className="cy-left-content">
        <div className="cy-today-is">
          TODAY IS..{" "}
          <EditableText
            className="text-orange"
            value={p.todayIs}
            editing={editing}
            placeholder="오늘의 기분"
            onSave={save("todayIs")}
            maxLength={20}
          />
        </div>

        <div className="cy-profile-pic">
          <img src={asset(staticProfile.photo.src)} alt={staticProfile.photo.alt} />
        </div>

        <EditableText
          as="div"
          className="cy-intro-text"
          value={p.introDescription}
          editing={editing}
          multiline
          placeholder="소개 문구를 적어 주세요"
          onSave={save("introDescription")}
        />

        <BgmPlayer ref={bgmRef} />

        <div className="cy-profile-name">
          <EditableText
            as="div"
            className="name-bold"
            value={p.ownerName}
            editing={editing}
            placeholder="이름"
            onSave={save("ownerName")}
            maxLength={30}
          />
          <EditableText
            as="div"
            className="title-sub"
            value={p.catalogDescription}
            editing={editing}
            placeholder="한 줄 설명"
            onSave={save("catalogDescription")}
          />
        </div>

        <div className="cy-left-dropdown">
          <WaveSelect />
        </div>
      </div>
    </div>
  );
}
