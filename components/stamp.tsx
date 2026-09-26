export function Stamp({ verdict }: { verdict: "HOLD" | "SEND" }) {
  return (
    <div className="rubber-stamp">
      <span>UNSENT · REPLY CHECK</span>
      <strong>{verdict}</strong>
      <span>
        {verdict === "HOLD" ? "LEAVE THIS ONE UNSENT" : "PROMISES STILL INTACT"}
      </span>
    </div>
  );
}
