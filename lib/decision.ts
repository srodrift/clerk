import type { JevResponse } from "./jev";
import type { ReplyState } from "./situations";
export type Decision = {
  stamp: "HOLD" | "SEND";
  reason: "collision" | "uncertain" | "clear";
  promiseId: string | null;
};
// A positive SEND requires agreement across every promise, the choice, and severity.
// Uncertainty cannot turn into permission to send.
export function decide(result: JevResponse, state: ReplyState): Decision {
  const checks = state.standingPromises
    .map((p) => {
      const answer = result.answers[`collision_${p.id}`];
      return { id: p.id, p: answer.type === "noul" ? answer.noul : 1 };
    })
    .sort((a, b) => b.p - a.p);
  const top = checks[0],
    choice = result.answers.worst_collision,
    fatality = result.answers.fatality;
  if (top.p >= 0.8)
    return { stamp: "HOLD", reason: "collision", promiseId: top.id };
  if (
    checks.every((c) => c.p <= 0.1) &&
    choice.choice === "none" &&
    choice.confidence >= 0.8 &&
    choice.probabilities.none >= 0.9 &&
    fatality.confidence >= 0.8 &&
    fatality.probabilities["2"] + fatality.probabilities["3"] <= 0.1
  )
    return { stamp: "SEND", reason: "clear", promiseId: null };
  return {
    stamp: "HOLD",
    reason: "uncertain",
    promiseId: top.p >= 0.4 ? top.id : null,
  };
}
