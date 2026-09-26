import { test } from "node:test";
import assert from "node:assert/strict";
import { pairId, pairsFor, sets, type Sentence } from "../lib/sets";
import { parseResponse, questions, rehearsal } from "../lib/jev";
import { POST } from "../app/api/judge/route";
function synthetic(sentences: Sentence[]) {
  const r = rehearsal(sets[0]);
  const pairs = pairsFor(sentences);
  r.answers = {
    ...Object.fromEntries(
      pairs.map((p) => [
        `conflict_${p.id}`,
        { type: "noul" as const, noul: p.id === "s1_s2" ? 0.99 : 0.01 },
      ]),
    ),
    worst_conflict: {
      ...r.answers.worst_conflict,
      probabilities: Object.fromEntries(
        pairs.map((p) => [p.id, p.id === "s1_s2" ? 1 : 0]),
      ),
    },
    fatality: r.answers.fatality,
  };
  return { ...r, model: "jev-synthetic-test" };
}
test("enumerates every unordered pair once", () => {
  for (const n of [4, 5]) {
    const sentences = Array.from({ length: n }, (_, i) => ({
      id: `s${i + 1}`,
      text: `Sentence ${i + 1}`,
    }));
    const pairs = pairsFor(sentences);
    assert.equal(pairs.length, (n * (n - 1)) / 2);
    assert.equal(new Set(pairs.map((p) => p.id)).size, pairs.length);
    assert.equal(
      pairs.some((p) => p.first.id === p.second.id),
      false,
    );
  }
  assert.equal(pairId(["s4", "s1"]), "s1_s4");
});
test("each unchanged built-in has a valid fixed rehearsal with its own conflict", () => {
  for (const set of sets) {
    const result = parseResponse(rehearsal(set), set.sentences);
    assert.equal(result.answers.worst_conflict.choice, set.rehearsalPair);
    assert.equal(Object.keys(result.answers).length, 8);
  }
});
test("one noul per pair, one choice, one score; fifth card increases batch to twelve", () => {
  for (const sentences of [
    sets[0].sentences,
    [...sets[0].sentences, { id: "s5", text: "I will join." }],
  ]) {
    const q = questions(sentences);
    const values = Object.values(q);
    assert.equal(
      values.filter((v) => v.type === "noul").length,
      pairsFor(sentences).length,
    );
    assert.equal(values.filter((v) => v.type === "choice").length, 1);
    assert.equal(values.filter((v) => v.type === "score").length, 1);
    assert.equal(q.fatality.criteria[0], "wording quibble");
    assert.equal(q.fatality.criteria.at(-1), "impossible to do both");
  }
});
test("rejects missing, invalid, unknown and inconsistent judgments", () => {
  for (const change of [
    (r: ReturnType<typeof rehearsal>) => {
      delete r.answers.conflict_s1_s2;
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.worst_conflict.choice = "s1_s9";
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.conflict_s1_s2 = { type: "noul", noul: 1.2 };
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.fatality.score = 0;
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.worst_conflict.probabilities = { s1_s2: 0.1 };
    },
  ]) {
    const r = rehearsal(sets[0]);
    change(r);
    assert.throws(() => parseResponse(r, sets[0].sentences));
  }
});
test("API requires exactly two distinct existing cards and an explicit known set", async () => {
  for (const body of [
    { setId: "hackathon", selected: [] },
    { setId: "hackathon", selected: ["s1"] },
    { setId: "hackathon", selected: ["s1", "s2", "s3"] },
    { setId: "hackathon", selected: ["s1", "s1"] },
    { setId: "hackathon", selected: ["s1", "s5"] },
    { setId: "unknown", selected: ["s1", "s2"] },
  ]) {
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/judge", {
            method: "POST",
            body: JSON.stringify(body),
          }),
        )
      ).status,
      400,
    );
  }
});
test("rehearsal, custom key gate, live batching and provider failures", async () => {
  const key = process.env.TYPESAFE_API_KEY,
    originalFetch = global.fetch;
  const request = (body: unknown) =>
    new Request("http://localhost/api/judge", {
      method: "POST",
      body: JSON.stringify(body),
    });
  try {
    delete process.env.TYPESAFE_API_KEY;
    let calls = 0;
    global.fetch = async () => {
      calls++;
      throw new Error("Unexpected call");
    };
    for (const set of sets) {
      const result = await (
        await POST(
          request({
            setId: set.id,
            selected: set.rehearsalPair.split("_").reverse(),
          }),
        )
      ).json();
      assert.equal(result.mode, "rehearsal");
      assert.equal(result.foundKnot, true);
      assert.equal(result.roundTripMs, null);
    }
    const missed = await (
      await POST(request({ setId: "hackathon", selected: ["s3", "s4"] }))
    ).json();
    assert.equal(missed.foundKnot, false);
    assert.equal(missed.selectedPair, "s3_s4");
    assert.equal(calls, 0);
    assert.equal(
      (
        await POST(
          request({
            setId: "hackathon",
            selected: ["s1", "s5"],
            customSentence: "An added claim.",
          }),
        )
      ).status,
      503,
    );
    assert.equal(
      (
        await POST(
          request({
            setId: "hackathon",
            selected: ["s1", "s2"],
            customSentence: " ",
          }),
        )
      ).status,
      400,
    );
    process.env.TYPESAFE_API_KEY = "synthetic-test-only";
    global.fetch = async (url, init) => {
      calls++;
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "jev-latest");
      assert.deepEqual(Object.keys(body.state), ["sentences"]);
      assert.equal(
        Object.keys(body.questions).length,
        body.state.sentences.length === 5 ? 12 : 8,
      );
      return Response.json(synthetic(body.state.sentences));
    };
    const live = await (
      await POST(request({ setId: "hackathon", selected: ["s1", "s2"] }))
    ).json();
    assert.equal(calls, 1);
    assert.equal(live.mode, "live");
    assert.equal(live.model, "jev-synthetic-test");
    assert.equal(live.foundKnot, true);
    assert.equal(typeof live.roundTripMs, "number");
    const custom = await (
      await POST(
        request({
          setId: "hackathon",
          selected: ["s1", "s5"],
          customSentence: "The fifth sentence.",
        }),
      )
    ).json();
    assert.equal(calls, 2);
    assert.equal(custom.mode, "live");
    assert.equal(custom.request.state.sentences.length, 5);
    assert.equal(custom.foundKnot, false);
    global.fetch = async () => {
      calls++;
      return Response.json(
        { error: "private provider detail" },
        { status: 401 },
      );
    };
    const failure = await POST(
      request({ setId: "hackathon", selected: ["s1", "s2"] }),
    );
    assert.equal(failure.status, 502);
    assert.equal(calls, 3);
    assert.equal(
      (await failure.text()).includes("private provider detail"),
      false,
    );
    global.fetch = async () => Response.json({ model: "broken", answers: {} });
    assert.equal(
      (await POST(request({ setId: "hackathon", selected: ["s1", "s2"] })))
        .status,
      502,
    );
    global.fetch = async () => {
      throw new Error("network failure");
    };
    assert.equal(
      (await POST(request({ setId: "hackathon", selected: ["s1", "s2"] })))
        .status,
      502,
    );
  } finally {
    global.fetch = originalFetch;
    if (key === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = key;
  }
});
