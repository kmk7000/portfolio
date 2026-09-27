import type { ProjectStatus } from "../../config/site.ts";

/* 프로젝트 상태 딱지 (운영 중 / 개발 중) */
export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`cy-project-status ${status === "운영 중" ? "is-live" : "is-dev"}`}>{status}</span>;
}
