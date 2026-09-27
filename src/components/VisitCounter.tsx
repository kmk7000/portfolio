import { useEffect, useRef, useState } from "react";
import { getStorage } from "../lib/storage.ts";
import { recordVisit, type VisitCounts } from "../lib/visits.ts";

/* 미니홈피 왼쪽 위 방문 수입니다. 들어올 때 한 번 기록하고 공용 카운터의 숫자를 보여 줍니다.
   불러오는 중이거나 카운터 서비스에 닿지 못하면 원본처럼 숫자 자리를 - 로 둡니다. */
export default function VisitCounter() {
  const [counts, setCounts] = useState<VisitCounts | null>(null);
  /* 개발 모드(StrictMode)에서 효과가 두 번 실행돼 2씩 오르는 것을 막습니다. */
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    recordVisit(getStorage()).then(setCounts, () => {
      /* 숫자는 - 로 남깁니다. 화면의 다른 부분은 그대로 동작합니다. */
    });
  }, []);

  const show = (value: number | undefined) => (typeof value === "number" ? value.toLocaleString() : "-");

  return (
    <span className="cy-today-count">
      TODAY <span className="text-orange">{show(counts?.today)}</span>
      {" | "}
      TOTAL <span className="text-black">{show(counts?.total)}</span>
    </span>
  );
}
