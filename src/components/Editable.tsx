import { useEffect, useRef, useState, type ElementType } from "react";

/* 주인장이 화면에서 바로 고치는 글자입니다. (원본 Editable.tsx 의 EditableText)
   편집 모드가 꺼져 있으면 평범한 글자로만 보입니다. 누르면 입력 칸이 되고,
   칸을 벗어나거나 Enter(여러 줄은 칸 벗어나기)로 저장, Esc 로 취소합니다. */
export default function EditableText({
  value,
  onSave,
  editing,
  multiline = false,
  placeholder = "내용을 적어 주세요",
  label,
  className,
  as: Tag = "span",
  maxLength = 2000
}: {
  value: string;
  onSave: (next: string) => void;
  editing: boolean;
  multiline?: boolean;
  placeholder?: string;
  /* 입력 칸의 이름(화면 낭독기용). 없으면 placeholder 를 씁니다. */
  label?: string;
  className?: string;
  as?: ElementType;
  maxLength?: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!editing) return <Tag className={className}>{value}</Tag>;

  const commit = () => {
    setOpen(false);
    const next = multiline ? draft.replace(/\s+$/, "") : draft.trim();
    if (next !== value) onSave(next);
  };
  const cancel = () => {
    setDraft(value);
    setOpen(false);
  };

  if (!open) {
    return (
      <Tag className={`${className ?? ""} cy-editable`.trim()}>
        <button
          type="button"
          className="cy-editable-btn"
          onClick={() => setOpen(true)}
          title="눌러서 고치기"
          aria-label={`${label ?? placeholder} 고치기: ${value || "비어 있음"}`}
        >
          {value || <span className="cy-editable-empty">{placeholder}</span>}
        </button>
      </Tag>
    );
  }

  const shared = {
    ref,
    value: draft,
    placeholder,
    maxLength,
    "aria-label": label ?? placeholder,
    onBlur: commit,
    className: "cy-edit-input"
  };

  return multiline ? (
    <textarea
      {...shared}
      rows={Math.max(2, draft.split("\n").length)}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Escape") cancel();
      }}
    />
  ) : (
    <input
      {...shared}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
    />
  );
}
