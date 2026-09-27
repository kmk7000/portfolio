import type { ProfileKey } from "../../lib/site-content.ts";
import { useSite } from "../../lib/site-context.tsx";
import EditableText from "../Editable.tsx";
import SectionTitle from "../SectionTitle.tsx";
import Guestbook from "./Guestbook.tsx";
import MiniRoom from "./MiniRoom.tsx";

export default function HomeTab({ greet, onGreeted }: { greet: boolean; onGreeted: () => void }) {
  const { content, update, editing } = useSite();
  const p = content.profile;
  const field = (key: ProfileKey, placeholder: string) => (
    <EditableText
      value={p[key]}
      editing={editing}
      placeholder={placeholder}
      onSave={value => update({ profile: { ...content.profile, [key]: value } })}
      maxLength={40}
    />
  );

  return (
    <>
      <div className="cy-content-box cy-miniroom-box">
        <SectionTitle title={field("miniroomTitle", "Mini Room")} sub={field("miniroomSub", "미니룸")} />
        <div className="cy-miniroom-inner">
          <MiniRoom greet={greet} onGreeted={onGreeted} />
        </div>
      </div>

      <div className="cy-content-box">
        <SectionTitle title={field("guestbookTitle", "What friends say")} sub={field("guestbookSub", "한마디로 표현한다면~")} />
        <Guestbook />
      </div>
    </>
  );
}
