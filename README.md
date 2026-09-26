# Knot

**Four sentences. Two that can’t both be true.** Pick the pair, then see whether Jev pulls the same thread.

Knot is a local Next.js + TypeScript app for spotting contradictions in a plan. It comes with three sets: a hackathon, a move to a new city, and a group dinner. Select exactly two sentence cards before asking Jev. A red thread connects Jev’s pair; if your choice differs, a second, dashed red thread connects yours. The conflict and both selections are also written out. A rubber stamp records whether you found the knot, alongside a probability ledger and raw JSON.

## Run Knot

Requires Node.js 20.9+ (tested with Node 24) and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:4317**. For production, run `npm run build` then `npm start`, also on port 4317.

For live judgments, add your key to `.env.local` and restart:

```dotenv
TYPESAFE_API_KEY=your_key_here
```

The key is read only on the server. Never put it in a `NEXT_PUBLIC_` variable. It is not logged or committed.

Without a key, the unchanged built-in sets use fixed probabilities and visibly say **Rehearsal**. No live-looking timing or model ID is invented. Add one sentence of your own to make a five-card custom set; any custom set requires the live key, even when you select two original cards. A missing key produces a clear error. Provider failures never fall back to rehearsal.

## A 60-second Knot demo

1. **0–10s:** Open Knot. Read the four cards in **The hackathon**. Notice that **Ask Jev** is disabled until exactly two cards are selected.
2. **10–20s:** Pick the free-tools claim and the $50-per-call claim (cards 1 and 2). Select **Ask Jev**.
3. **20–30s:** In rehearsal, the red thread joins those two cards and the **FOUND IT** stamp appears. Read the two conflicting sentences in the record.
4. **30–40s:** Deselect a card and pick a different pair. Ask again. A **MISSED IT** stamp and two threads compare your pair with Jev’s. Solid means Jev; dashed means your pick.
5. **40–50s:** Inspect all six pair probabilities, worst-conflict choice, fatality score, and raw JSON. Switch to **The new city** or **The group dinner** for a fresh puzzle.
6. **50–60s:** Expand **Add a sentence of your own**. Add a claim and select two of the five cards. Explain that this custom set needs `TYPESAFE_API_KEY` and uses ten pair questions in the same single request.

Live results are model judgments and may differ from rehearsal. Low-confidence or weak-conflict results use tentative copy instead of a definitive found/missed verdict.

## The Jev call

The integration follows the [TypeSafe skill](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md) and [HTTP API](https://docs.typesafe.ai/api).

`lib/jev.ts` sends exactly one `POST https://api.typesafe.ai/v1/systemone` with `model: "jev-latest"`, the sentences as JSON state, and all questions together:

- One **noul** per unordered sentence pair: “These two sentences cannot both be true.” Four cards produce six pairs; five produce ten.
- One **choice** across all pairs: which is the worst conflict?
- One **score** for the independently identified worst conflict, with ordered levels: “wording quibble,” “a manageable trade-off,” “a major change of plan,” and “impossible to do both.”

Total: eight questions for a built-in set; twelve for a custom set. The user’s selected pair is validated by the route but omitted from model state to avoid steering the judgment. The choice and score explicitly share a selection premise because parallel questions cannot read each other’s answers. No generated explanations, follow-up call, or automatic retry.

The returned model ID, actual round-trip time, every probability, choice/score confidence, and weighted score remain inspectable. The score row labels the most probable level; all level probabilities are in its disclosure. Noul values mean P(yes), not confidence. Runtime validation rejects missing pairs, unknown choices, invalid probabilities, and inconsistent scores.

`app/api/judge/route.ts` owns credential handling and canonical built-in sets. Both UI and server require two distinct existing cards. Edits or set switches cancel and discard stale results. The optional fifth sentence is limited to 240 characters. Nothing is persisted: no auth, database, or chatbot.

`components/stamp.tsx` and `components/ledger.tsx` preserve the stamp and probability-ledger concepts from the app’s original design. `components/threads.tsx` measures the actual card layout and redraws when it changes. The UI uses native keyboard-accessible buttons, pressed states, visible focus, text equivalents for threads, and reduced-motion support.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Tests cover complete pair enumeration, question batching, response validation, selection constraints, built-in rehearsal, custom-key errors, one-call live transport, and provider failures. Synthetic provider tests do not establish live Jev accuracy.

## License

[MIT](LICENSE).
