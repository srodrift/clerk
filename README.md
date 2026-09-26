# Unsent

**Don’t send it yet.** Unsent checks the reply you are about to send against the promises you already made. If an earlier commitment becomes impossible, the reply stays unsent.

A local Next.js + TypeScript app with an editable draft, a clean list of standing promises, a red HOLD or SEND stamp, and a thread to the promise at stake. Every probability, the raw request and response, returned model ID, and actual round-trip time remain inspectable. No chatbot, generated explanation, auth, or database. Unsent checks replies; it does not deliver messages.

## Run

Requires Node.js 20.9+ (tested with Node 24) and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:4317**. For a production build: `npm run build`, then `npm start` (also port 4317).

For live checks, put your key in `.env.local` and restart:

```dotenv
TYPESAFE_API_KEY=your_key_here
```

The key stays server-side. It is not logged, exposed to the browser, or committed. Do not use a `NEXT_PUBLIC_` environment variable for it.

**Live mode is always used when a key is present**, for both original and edited replies. The exact current draft, conversation context, and standing promises are sent to TypeSafe when you select **Check this reply**. Editing alone sends no request.

Without a key, only the original built-in replies run with fixed probabilities and an explicit **Rehearsal** label. Leading and trailing whitespace are ignored. Edited replies produce a clear live-key error; they never receive invented model judgments. Rehearsal has no invented network time or live model ID. Live provider failures never fall back to rehearsal.

## The three situations

- **The demo link:** A judge wants a public working demo link by 2pm. You already promised to keep the demo laptop-only, without public deployment or tunneling, until judging ends at 3pm. Sending the demo slide deck later is compatible despite sharing the word “demo.”
- **Saturday morning:** Maya asks you to watch her dog at her home from 9am to noon. You promised to meet a desk buyer at your own apartment from 10 to 11am. Emailing a dog shelter logo on Sunday is compatible despite sharing “dog.”
- **The early flight:** You agree to a Friday 7am San Francisco–Chicago flight, arriving at 11:10am Pacific. You promised to present in person in San Francisco at 9am. Sending Chicago research notes Thursday is compatible despite sharing “Chicago.”

The facts include specific times, places, and practical constraints so these are real collisions rather than keyword matches. Standing promises are canonical server-owned fixtures; only the reply is editable. Choose a situation again to restore its original draft.

## A 60-second Unsent demo

1. **0–10s:** Open **The demo link**. Read Ellie’s request, your editable reply, and the two promises underneath. Notice **Rehearsal** or **Live · Jev**.
2. **10–20s:** Select **Check this reply**. In rehearsal, a red **HOLD** stamp appears and a thread joins the draft to the laptop-only promise.
3. **20–30s:** Compare the probabilities: the real collision is high, while the slide-deck promise is low. Inspect the choice and fatality distributions and **The raw record**.
4. **30–40s:** Edit the reply to: “I can’t provide a public link, but I can show you the local demo on my laptop.” With a live key, check again. Jev can now find no collision and the rules can produce **SEND**. Without a key, the app clearly asks for one. Live judgments may hold if uncertain.
5. **40–50s:** Try **Saturday morning**. The buyer’s visit collides with being at Maya’s home; the dog shelter logo does not.
6. **50–60s:** Try **The early flight**. Compare the flight with the in-person presentation, then read the returned model ID and round-trip time on a live check.

## One request, typed judgments

The client follows the [TypeSafe skill](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md) and [HTTP API](https://docs.typesafe.ai/api). `lib/jev.ts` makes exactly one authenticated `POST https://api.typesafe.ai/v1/systemone` per live check with `model: "jev-latest"`, JSON `state`, and all `questions` together:

- One **noul** for each standing promise: **“These two commitments cannot both be kept.”** It compares the current draft with that promise using the conversation’s timing and practical constraints.
- One **choice** for the worst collision, including **none** when all promises remain possible.
- One **score** for the fatality of the independently identified worst collision: no conflict or a wording quibble / a manageable trade-off / a major change of plan / impossible to keep both commitments.

Each built-in has two promises, so the single request contains four questions. Parallel questions cannot see each other’s answers; the choice and score share the same selection premise. No generated explanation, follow-up request, or automatic retry. Noul probabilities are P(cannot both be kept), not confidence. Choice/score confidence and every distribution entry are displayed. Score also shows its weighted numeric value.

## HOLD and SEND

`lib/decision.ts` is a pure, conservative gate:

- A promise with conflict probability ≥0.80 produces **HOLD**, even if another answer disagrees. The thread points to the highest-probability promise.
- **SEND** requires every conflict probability ≤0.10, choice `none` with probability ≥0.90 and confidence ≥0.80, fatality confidence ≥0.80, and combined probability of the two serious severity levels ≤0.10.
- Everything else is **HOLD** for uncertainty. A potential promise is highlighted only when its conflict probability is ≥0.40; an uncertain result is not described as a confirmed broken promise.

The UI copy is written in the repository. These are demonstration thresholds, not a claim of evaluated real-world reliability. A SEND stamp never sends a message automatically. Edits and situation switches cancel pending client requests and discard stale judgments.

The server validates input and typed responses, rejects unknown choices or incomplete judgments, and applies a 25-second provider timeout. Neither drafts nor results are stored. Native controls support keyboard use and visible focus; the thread also has a written collision label, and reduced motion disables stamp animation.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Tests cover all rehearsals and their decoys, batching, HOLD/SEND boundaries, validation, missing-key behavior, live original/edited request handling, and provider failures. Tests use synthetic provider responses and do not establish live model accuracy.

## License

[MIT](LICENSE).
