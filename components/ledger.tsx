import { severityLevels, type JevResponse } from "@/lib/jev";
import { pairLabel, pairsFor, type Sentence } from "@/lib/sets";
export function Ledger({
  sentences,
  result,
}: {
  sentences: Sentence[];
  result: JevResponse | null;
}) {
  const pairs = pairsFor(sentences);
  return (
    <section className="ledger" aria-label="Probability ledger">
      <div className="ledger-heading">
        <h3>The probability ledger</h3>
        <span>{pairs.length + 2} QUESTIONS</span>
      </div>
      <p className="ledger-note">
        Each pair: “These two sentences cannot both be true.”
      </p>
      {pairs.map((pair) => {
        const answer = result?.answers[`conflict_${pair.id}`];
        const p = answer?.type === "noul" ? answer.noul : null;
        return (
          <div
            className={`ledger-row ${result?.answers.worst_conflict.choice === pair.id ? "worst-pair" : ""}`}
            key={pair.id}
          >
            <span className="ledger-pair">{pairLabel(pair)}</span>
            <span className="ledger-name">Sentences {pairLabel(pair)}</span>
            <span className="primitive">NOUL</span>
            <div className="probability-track" aria-hidden="true">
              <i style={{ width: `${(p ?? 0) * 100}%` }} />
            </div>
            <span className="probability">
              {p === null ? "—" : `${(p * 100).toFixed(1)}%`}
            </span>
          </div>
        );
      })}
      <p className="probability-key">
        NOUL = probability the statement is true, P(yes).
      </p>
      {(["worst_conflict", "fatality"] as const).map((id) => {
        const answer = result?.answers[id];
        const isChoice = answer?.type === "choice";
        const best = answer
          ? Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])[0]
          : null;
        const value = isChoice
          ? pairLabel(pairs.find((p) => p.id === answer.choice)!)
          : best
            ? severityLevels[Number(best[0])]
            : null;
        return (
          <div className="summary-judgment" key={id}>
            <div className="summary-row">
              <span>
                {id === "worst_conflict" ? "Worst conflict" : "How fatal?"}
              </span>
              <span className="primitive">
                {id === "worst_conflict" ? "CHOICE" : "SCORE"}
              </span>
              <span className="probability">
                {best ? `${(best[1] * 100).toFixed(1)}%` : "—"}
              </span>
            </div>
            {answer && (
              <>
                <p className="judgment-value">
                  {value}
                  {answer.type === "score" && (
                    <small>Weighted score {answer.score.toFixed(2)} / 3</small>
                  )}
                </p>
                <details className="distribution">
                  <summary>
                    All probabilities · confidence{" "}
                    {(answer.confidence * 100).toFixed(1)}%
                  </summary>
                  {Object.entries(answer.probabilities).map(([key, p]) => (
                    <div key={key}>
                      <span>
                        {answer.type === "choice"
                          ? `Sentences ${pairLabel(pairs.find((pair) => pair.id === key)!)}`
                          : severityLevels[Number(key)]}
                      </span>
                      <b>{(p * 100).toFixed(1)}%</b>
                    </div>
                  ))}
                </details>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
