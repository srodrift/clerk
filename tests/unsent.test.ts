import { test } from "node:test";
import assert from "node:assert/strict";
import { makeState, situations } from "../lib/situations";
import { parseResponse, questions, rehearsal } from "../lib/jev";
import { decide } from "../lib/decision";
import { POST } from "../app/api/judge/route";
const situation = situations[0],
  state = makeState(situation, situation.draft);
function clearResponse() {
  const r = rehearsal(situation);
  r.model = "jev-synthetic-test";
  for (const p of situation.promises)
    r.answers[`collision_${p.id}`] = { type: "noul", noul: 0.01 };
  r.answers.worst_collision = {
    type: "choice",
    choice: "none",
    confidence: 0.97,
    probabilities: { p1: 0.005, p2: 0.005, none: 0.99 },
  };
  r.answers.fatality = {
    ...r.answers.fatality,
    score: 0.01,
    confidence: 0.97,
    probabilities: { "0": 0.99, "1": 0.01, "2": 0, "3": 0 },
  };
  return r;
}
test("each original situation holds for its real collision and gives the word-overlap decoy a low probability", () => {
  for (const s of situations) {
    const st = makeState(s, s.draft),
      r = parseResponse(rehearsal(s), st);
    assert.deepEqual(decide(r, st), {
      stamp: "HOLD",
      reason: "collision",
      promiseId: s.collisionId,
    });
    const decoy = r.answers.collision_p2;
    assert.equal(decoy.type, "noul");
    if (decoy.type === "noul") assert.equal(decoy.noul, 0.02);
  }
});
test("one noul per standing promise, one choice with no-collision option, and one fatality score", () => {
  const q = questions(state);
  assert.equal(Object.keys(q).length, 4);
  assert.equal(Object.values(q).filter((v) => v.type === "noul").length, 2);
  assert.deepEqual(Object.keys(q.worst_collision.criteria), [
    "p1",
    "p2",
    "none",
  ]);
  assert.equal(q.fatality.criteria.length, 4);
  const collision = q.collision_p1;
  assert.equal(collision.type, "noul");
  if (collision.type === "noul")
    assert.equal(
      collision.instructions.question,
      "These two commitments cannot both be kept.",
    );
});
test("SEND requires strong agreement across all checks", () => {
  const r = clearResponse();
  assert.equal(decide(parseResponse(r, state), state).stamp, "SEND");
  for (const change of [
    (r: ReturnType<typeof clearResponse>) => {
      r.answers.collision_p2 = { type: "noul", noul: 0.5 };
    },
    (r: ReturnType<typeof clearResponse>) => {
      r.answers.worst_collision.confidence = 0.79;
    },
    (r: ReturnType<typeof clearResponse>) => {
      r.answers.fatality.confidence = 0.79;
    },
    (r: ReturnType<typeof clearResponse>) => {
      r.answers.fatality.probabilities = {
        "0": 0.4,
        "1": 0.3,
        "2": 0.2,
        "3": 0.1,
      };
    },
  ]) {
    const uncertain = clearResponse();
    change(uncertain);
    assert.equal(decide(uncertain, state).stamp, "HOLD");
  }
});
test("a broken promise overrides a no-collision choice and identifies the highest-probability promise", () => {
  const r = clearResponse();
  r.answers.collision_p2 = { type: "noul", noul: 0.98 };
  assert.deepEqual(decide(r, state), {
    stamp: "HOLD",
    reason: "collision",
    promiseId: "p2",
  });
});
test("rejects missing answers, unknown choices, invalid probabilities, and inconsistent scores", () => {
  for (const change of [
    (r: ReturnType<typeof rehearsal>) => {
      delete r.answers.collision_p1;
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.worst_collision.choice = "p9";
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.collision_p1 = { type: "noul", noul: 1.2 };
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.fatality.score = 0;
    },
    (r: ReturnType<typeof rehearsal>) => {
      r.answers.worst_collision.probabilities = { p1: 0.2 };
    },
  ]) {
    const r = rehearsal(situation);
    change(r);
    assert.throws(() => parseResponse(r, state));
  }
});
test("API input requires a known situation and a nonempty bounded draft", async () => {
  for (const body of [
    { situationId: "demo", draft: "" },
    { situationId: "demo", draft: " " },
    { situationId: "demo", draft: "x".repeat(4001) },
    { situationId: "unknown", draft: "Yes." },
    { setId: "hackathon", selected: ["s1", "s2"] },
  ])
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
});
test("originals rehearse without a key, edited replies require a key, live originals and edits make exactly one POST, and failures never rehearse", async () => {
  const originalKey = process.env.TYPESAFE_API_KEY,
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
      throw new Error("Unexpected provider call");
    };
    for (const s of situations) {
      const r = await (
        await POST(request({ situationId: s.id, draft: s.draft }))
      ).json();
      assert.equal(r.mode, "rehearsal");
      assert.equal(r.decision.stamp, "HOLD");
      assert.equal(r.roundTripMs, null);
    }
    assert.equal(calls, 0);
    const edited =
      "I can’t provide a public link, but I can show you the local demo on my laptop.";
    const noKey = await POST(request({ situationId: "demo", draft: edited }));
    assert.equal(noKey.status, 503);
    assert.match(await noKey.text(), /TYPESAFE_API_KEY/);
    assert.equal(calls, 0);
    process.env.TYPESAFE_API_KEY = "synthetic-test-only";
    global.fetch = async (url, init) => {
      calls++;
      assert.equal(url, "https://api.typesafe.ai/v1/systemone");
      assert.equal(init?.method, "POST");
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer synthetic-test-only",
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "jev-latest");
      assert.equal(Object.keys(body.questions).length, 4);
      assert.deepEqual(body.state.standingPromises, state.standingPromises);
      return Response.json(
        body.state.draft === edited
          ? clearResponse()
          : { ...rehearsal(situation), model: "jev-synthetic-test" },
      );
    };
    const liveOriginal = await (
      await POST(request({ situationId: "demo", draft: situation.draft }))
    ).json();
    assert.equal(calls, 1);
    assert.equal(liveOriginal.mode, "live");
    assert.equal(liveOriginal.decision.stamp, "HOLD");
    const liveEdit = await (
      await POST(request({ situationId: "demo", draft: edited }))
    ).json();
    assert.equal(calls, 2);
    assert.equal(liveEdit.mode, "live");
    assert.equal(liveEdit.model, "jev-synthetic-test");
    assert.equal(liveEdit.request.state.draft, edited);
    assert.equal(liveEdit.decision.stamp, "SEND");
    assert.equal(typeof liveEdit.roundTripMs, "number");
    global.fetch = async () => {
      calls++;
      return Response.json(
        { error: "private provider detail" },
        { status: 401 },
      );
    };
    const failure = await POST(request({ situationId: "demo", draft: edited }));
    assert.equal(failure.status, 502);
    assert.equal(calls, 3);
    assert.equal(
      (await failure.text()).includes("private provider detail"),
      false,
    );
    global.fetch = async () => Response.json({ model: "broken", answers: {} });
    assert.equal(
      (await POST(request({ situationId: "demo", draft: situation.draft })))
        .status,
      502,
    );
    global.fetch = async () => {
      throw new Error("network failure");
    };
    assert.equal(
      (await POST(request({ situationId: "demo", draft: edited }))).status,
      502,
    );
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = originalKey;
  }
});
