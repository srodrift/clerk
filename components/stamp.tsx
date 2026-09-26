export function Stamp({
  found,
  tentative,
}: {
  found: boolean;
  tentative: boolean;
}) {
  return (
    <div className={`rubber-stamp ${found ? "found" : "missed"}`}>
      <span>THE KNOT RECORD</span>
      <strong>
        {tentative ? "A MAYBE" : found ? "FOUND IT" : "MISSED IT"}
      </strong>
      <span>
        {tentative
          ? "A TENTATIVE JUDGMENT"
          : found
            ? "TWO MINDS · ONE THREAD"
            : "FOLLOW ANOTHER THREAD"}
      </span>
    </div>
  );
}
