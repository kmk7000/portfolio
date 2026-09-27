import { useEffect, useRef, useState } from "react";
import { getStorage } from "../lib/storage.ts";
import { recordVisit, type VisitCounts } from "../lib/visits.ts";

/* 미니홈피 왼쪽 위 방문 수입니다. 들어올 때마다 한 번 기록하고 그 결과를 보여 줍니다.
   아직 기록 전이면 원본처럼 숫자 자리를 - 로 둡니다. */
export default function VisitCounter() {
  const [counts, setCounts] = useState<VisitCounts | null>(null);
  /* 개발 모드(StrictMode)에서 효과가 두 번 실행돼 2씩 오르는 것을 막습니다. */
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    setCounts(recordVisit(getStorage()));
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
