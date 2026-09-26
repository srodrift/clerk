import { z } from "zod";
import { makeState, situations } from "@/lib/situations";
import { askJev, parseResponse, questions, rehearsal } from "@/lib/jev";
import { decide } from "@/lib/decision";
export const runtime = "nodejs";
const schema = z.object({
  situationId: z.string(),
  draft: z.string().trim().min(1).max(4000),
});
export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return Response.json(
      { error: "Cross-site requests are not accepted." },
      { status: 403 },
    );
  let parsed;
  try {
    const text = await request.text();
    if (text.length > 30000)
      return Response.json(
        { error: "Keep your reply under 4,000 characters." },
        { status: 413 },
      );
    parsed = schema.safeParse(JSON.parse(text));
  } catch {
    return Response.json({ error: "Send a valid reply." }, { status: 400 });
  }
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Write a reply between 1 and 4,000 characters before checking it.",
      },
      { status: 400 },
    );
  const { situationId, draft } = parsed.data;
  const situation = situations.find((s) => s.id === situationId);
  if (!situation)
    return Response.json(
      { error: "This situation does not exist." },
      { status: 400 },
    );
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key && draft !== situation.draft)
    return Response.json(
      {
        error:
          "An edited reply needs a live check. Add TYPESAFE_API_KEY to .env.local and restart Unsent. Rehearsal is only available for the original built-in replies.",
      },
      { status: 503 },
    );
  const state = makeState(situation, draft);
  try {
    const fixed = key ? null : rehearsal(situation);
    const evaluation = key
      ? await askJev(state, key)
      : {
          result: parseResponse(fixed, state),
          raw: fixed,
          request: { model: "jev-latest", state, questions: questions(state) },
          roundTripMs: null,
        };
    return Response.json(
      {
        ...evaluation.result,
        raw: evaluation.raw,
        request: evaluation.request,
        roundTripMs: evaluation.roundTripMs,
        mode: key ? "live" : "rehearsal",
        decision: decide(evaluation.result, state),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message =
      e instanceof Error && e.message.startsWith("Jev could not check")
        ? e.message
        : "Jev’s response was unavailable, timed out, or could not be verified. Your reply is still unsent. Please try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
