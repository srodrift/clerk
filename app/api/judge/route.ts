import { z } from "zod";
import { pairId, sets } from "@/lib/sets";
import { askJev, parseResponse, questions, rehearsal } from "@/lib/jev";
export const runtime = "nodejs";
const schema = z.object({
  setId: z.string(),
  selected: z
    .array(z.enum(["s1", "s2", "s3", "s4", "s5"]))
    .length(2)
    .refine((ids) => new Set(ids).size === 2),
  customSentence: z.string().trim().min(1).max(240).optional(),
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
    if (text.length > 5000)
      return Response.json(
        { error: "Keep your added sentence under 240 characters." },
        { status: 413 },
      );
    parsed = schema.safeParse(JSON.parse(text));
  } catch {
    return Response.json(
      { error: "Send a valid sentence set." },
      { status: 400 },
    );
  }
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Choose exactly two different cards and keep your sentence under 240 characters.",
      },
      { status: 400 },
    );
  const { setId, selected, customSentence } = parsed.data;
  const set = sets.find((s) => s.id === setId);
  if (!set)
    return Response.json(
      { error: "This set does not exist." },
      { status: 400 },
    );
  const sentences = customSentence
    ? [...set.sentences, { id: "s5", text: customSentence }]
    : set.sentences;
  if (selected.some((id) => !sentences.some((s) => s.id === id)))
    return Response.json(
      { error: "Choose two cards from the current set." },
      { status: 400 },
    );
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (customSentence && !key)
    return Response.json(
      {
        error:
          "Your added sentence needs a live Jev judgment. Add TYPESAFE_API_KEY to .env.local and restart Knot. Rehearsal is available only for the unchanged built-in sets.",
      },
      { status: 503 },
    );
  try {
    const evaluation = key
      ? await askJev(sentences, key)
      : {
          result: parseResponse(rehearsal(set), sentences),
          raw: rehearsal(set),
          request: {
            model: "jev-latest",
            state: { sentences },
            questions: questions(sentences),
          },
          roundTripMs: null,
        };
    return Response.json(
      {
        ...evaluation.result,
        raw: evaluation.raw,
        request: evaluation.request,
        roundTripMs: evaluation.roundTripMs,
        mode: key ? "live" : "rehearsal",
        selectedPair: pairId(selected),
        foundKnot:
          pairId(selected) === evaluation.result.answers.worst_conflict.choice,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const message =
      e instanceof Error && e.message.startsWith("Jev could not judge")
        ? e.message
        : "Jev’s response was unavailable, timed out, or could not be verified. Please try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
