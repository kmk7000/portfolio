import { profile } from "../../config/site.ts";
import SectionTitle from "../SectionTitle.tsx";
import Guestbook from "./Guestbook.tsx";
import MiniRoom from "./MiniRoom.tsx";

export default function HomeTab({ greet, onGreeted }: { greet: boolean; onGreeted: () => void }) {
  return (
    <>
      <div className="cy-content-box cy-miniroom-box">
        <SectionTitle title={profile.miniroomTitle} sub={profile.miniroomSub} />
        <div className="cy-miniroom-inner">
          <MiniRoom greet={greet} onGreeted={onGreeted} />
        </div>
      </div>

      <div className="cy-content-box">
        <SectionTitle title={profile.guestbookTitle} sub={profile.guestbookSub} />
        <Guestbook />
      </div>
    </>
  );
}
