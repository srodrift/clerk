import { severityLevels, type JevResponse } from "@/lib/jev";
import type { StandingPromise } from "@/lib/situations";
const percent = (p: number) => `${(p * 100).toFixed(1)}%`;
export function Ledger({
  promises,
  result,
}: {
  promises: StandingPromise[];
  result: JevResponse | null;
}) {
  const nameFor = (id: string) =>
    id === "none"
      ? "No collision"
      : (promises.find((p) => p.id === id)?.title ?? id);
  return (
    <section className="ledger" aria-label="Probability ledger">
      <div className="ledger-heading">
        <h3>Every probability.</h3>
        <span>{promises.length + 2} JUDGMENTS</span>
      </div>
      <p className="ledger-intro">
        Can this reply and each promise both be kept?
      </p>
      <div className="ledger-nouls">
        {promises.map((p, i) => {
          const answer = result?.answers[`collision_${p.id}`];
          const value = answer?.type === "noul" ? answer.noul : null;
          return (
            <div className="promise-probability" key={p.id}>
              <div>
                <span className="ledger-index">0{i + 1}</span>
                <span>{p.title}</span>
                <b>{value === null ? "—" : percent(value)}</b>
              </div>
              <div className="probability-track" aria-hidden="true">
                <i style={{ width: `${(value ?? 0) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="ledger-footnote">P(cannot both be kept) · NOUL</p>
      {(["worst_collision", "fatality"] as const).map((id) => {
        const answer = result?.answers[id];
        const choice = answer?.type === "choice";
        const top = answer
          ? Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])[0]
          : null;
        return (
          <div className="ledger-group" key={id}>
            <div className="group-label">
              <h4>
                {id === "worst_collision" ? "Worst collision" : "How fatal?"}
              </h4>
              <span>{id === "worst_collision" ? "CHOICE" : "SCORE"}</span>
            </div>
            {answer ? (
              <>
                <p className="judgment-value">
                  {choice
                    ? nameFor(answer.choice)
                    : severityLevels[Number(top![0])]}
                </p>
                <div className="distribution">
                  {Object.entries(answer.probabilities).map(([key, value]) => (
                    <div key={key}>
                      <span>
                        {choice ? nameFor(key) : severityLevels[Number(key)]}
                      </span>
                      <b>{percent(value)}</b>
                    </div>
                  ))}
                </div>
                <div className="confidence">
                  Confidence {percent(answer.confidence)}
                  {answer.type === "score" && (
                    <span>Weighted score {answer.score.toFixed(2)} / 3</span>
                  )}
                </div>
              </>
            ) : (
              <p className="pending-value">
                Not checked yet <span>—</span>
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
