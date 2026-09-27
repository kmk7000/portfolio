/* 방명록·낙서장 아래 페이지 번호입니다. 한 쪽뿐이면 그리지 않습니다. */
export default function Pagination({
  pageCount,
  current,
  onChange,
  label
}: {
  pageCount: number;
  current: number;
  onChange: (page: number) => void;
  label: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="cy-gb-pagination" aria-label={label}>
      {Array.from({ length: pageCount }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`cy-gb-page${i === current ? " is-active" : ""}`}
          onClick={() => onChange(i)}
          aria-current={i === current ? "page" : undefined}
          aria-label={`${i + 1}쪽`}
        >
          {i + 1}
        </button>
      ))}
    </nav>
  );
}
