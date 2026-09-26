"use client";
import { useMemo, useRef, useState } from "react";
import { pairId, pairLabel, pairsFor, sets, type Pair } from "@/lib/sets";
import type { JevResponse } from "@/lib/jev";
import { Stamp } from "@/components/stamp";
import { Ledger } from "@/components/ledger";
import { Threads } from "@/components/threads";
type Receipt = JevResponse & {
  mode: "live" | "rehearsal";
  roundTripMs: number | null;
  selectedPair: string;
  foundKnot: boolean;
  raw: unknown;
  request: unknown;
};
function KnotMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 24 : 48}
      height={small ? 24 : 48}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M5 36C13 33 37 3 39 14S6 39 9 22 41 32 44 9M4 40C18 41 40 17 33 10S9 19 15 29 37 30 44 34" />
    </svg>
  );
}
function PairWords({ pair, label }: { pair: Pair; label: string }) {
  return (
    <div className="pair-words">
      <div className="small-mono">
        {label} · SENTENCES {pairLabel(pair)}
      </div>
      <blockquote>
        “{pair.first.text}”<span>and</span>“{pair.second.text}”
      </blockquote>
    </div>
  );
}
export default function Knot({ liveAvailable }: { liveAvailable: boolean }) {
  const [setId, setSetId] = useState(sets[0].id);
  const [selected, setSelected] = useState<string[]>([]);
  const [customSentence, setCustomSentence] = useState("");
  const [draft, setDraft] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0),
    pending = useRef(false),
    controller = useRef<AbortController | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const set = sets.find((s) => s.id === setId)!;
  const sentences = useMemo(
    () =>
      customSentence
        ? [...set.sentences, { id: "s5", text: customSentence }]
        : set.sentences,
    [set, customSentence],
  );
  const pairs = useMemo(() => pairsFor(sentences), [sentences]);
  const modelPair = receipt
    ? pairs.find((p) => p.id === receipt.answers.worst_conflict.choice)!
    : null;
  const userPair = receipt
    ? pairs.find((p) => p.id === receipt.selectedPair)!
    : null;
  const pairAnswer = modelPair
    ? receipt?.answers[`conflict_${modelPair.id}`]
    : null;
  const tentative = Boolean(
    receipt &&
    (receipt.answers.worst_conflict.confidence < 0.8 ||
      (pairAnswer?.type === "noul" && pairAnswer.noul < 0.8)),
  );
  function clearResult() {
    version.current++;
    controller.current?.abort();
    pending.current = false;
    setBusy(false);
    setReceipt(null);
    setError("");
  }
  function chooseSet(id: string) {
    clearResult();
    setSetId(id);
    setSelected([]);
    setCustomSentence("");
    setDraft("");
  }
  function toggle(id: string) {
    if (!selected.includes(id) && selected.length === 2) return;
    clearResult();
    setSelected(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  }
  async function ask() {
    if (selected.length !== 2 || pending.current) return;
    pending.current = true;
    const current = ++version.current;
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    setReceipt(null);
    try {
      const response = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId,
          selected,
          ...(customSentence ? { customSentence } : {}),
        }),
        signal: controller.current.signal,
      });
      const data = await response.json();
      if (current !== version.current) return;
      if (!response.ok)
        throw new Error(data.error || "Jev is unavailable. Please try again.");
      setReceipt(data);
    } catch (e) {
      if (current === version.current)
        setError(
          e instanceof Error
            ? e.message
            : "Jev is unavailable. Please try again.",
        );
    } finally {
      if (current === version.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Knot home">
          <KnotMark small />
          knot<span>.</span>
        </a>
        <span className="top-caption">
          A SMALL EXERCISE IN SEEING THE CATCH
        </span>
        <span className="local-label">
          A HUMAN + JEV EXPERIMENT <span>↗</span>
        </span>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">GOOD PLANS CAN HAVE LOOSE ENDS.</div>
            <h1>
              Find the <em>knot.</em>
            </h1>
            <p>
              Four sentences. Two that can’t both be true.
              <br />
              Pick the pair. Then see if Jev pulls the same thread.
            </p>
          </div>
          <div className="intro-sketch" aria-hidden="true">
            <svg viewBox="0 0 300 130">
              <path d="M5 80C45 90 62 17 105 30S199 126 172 109 182 6 206 38 112 121 119 68 244 18 293 48" />
            </svg>
            <span>There’s a catch in here somewhere.</span>
          </div>
        </section>
        <div className="workspace-heading">
          <span className="eyebrow">PICK A PLAN. FIND ITS CONTRADICTION.</span>
          <span className="small-mono">
            01 — Read &nbsp; 02 — Pick two &nbsp; 03 — Compare
          </span>
        </div>
        <nav className="set-tabs" aria-label="Sentence sets">
          {sets.map((s, i) => (
            <button
              key={s.id}
              className={setId === s.id ? "active" : ""}
              aria-pressed={setId === s.id}
              onClick={() => chooseSet(s.id)}
            >
              <span>0{i + 1}</span>
              {s.name}
              <span className="set-arrow">↗</span>
            </button>
          ))}
        </nav>
        <div className="workspace">
          <section className="plan-panel" aria-label="Sentence cards">
            <div className="plan-header">
              <div>
                <span className="small-mono">
                  SET NO. 0{sets.indexOf(set) + 1}
                  {customSentence ? " · YOUR EDITION" : ""}
                </span>
                <h2>{set.name}</h2>
                <p>{set.subtitle}</p>
              </div>
              <span className="paper-count">
                {sentences.length} CARDS
                <br />
                ONE KNOT
              </span>
            </div>
            <div className="card-board" ref={board}>
              {receipt && (
                <Threads
                  board={board}
                  pairs={pairs}
                  modelPair={receipt.answers.worst_conflict.choice}
                  userPair={receipt.selectedPair}
                />
              )}{" "}
              {sentences.map((sentence, i) => {
                const chosen = selected.includes(sentence.id),
                  jev = Boolean(
                    modelPair &&
                    (modelPair.first.id === sentence.id ||
                      modelPair.second.id === sentence.id),
                  );
                return (
                  <button
                    className={`sentence-card ${chosen ? "selected" : ""} ${jev ? "jev-pick" : ""}`}
                    key={sentence.id}
                    data-sentence={sentence.id}
                    aria-pressed={chosen}
                    aria-label={`Sentence ${i + 1}: ${sentence.text}${sentence.id === "s5" ? " (your sentence)" : ""}`}
                    disabled={!chosen && selected.length === 2}
                    onClick={() => toggle(sentence.id)}
                  >
                    <span className="card-top">
                      <span className="card-number">0{i + 1}</span>
                      <span className="selection-marker" aria-hidden="true">
                        {chosen ? "✓" : "+"}
                      </span>
                    </span>
                    <span className="sentence-text">{sentence.text}</span>
                    <span className="card-bottom">
                      {jev
                        ? "JEV’S PAIR"
                        : chosen
                          ? "YOUR PICK"
                          : sentence.id === "s5"
                            ? "YOUR SENTENCE"
                            : "A PIECE OF THE PLAN"}
                      <span>{chosen ? "SELECTED" : ""}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {receipt && (
              <div className="thread-legend">
                <span>
                  <i /> Jev’s pair: {modelPair && pairLabel(modelPair)}
                </span>
                {!receipt.foundKnot && (
                  <span>
                    <i className="dashed" /> Your pair:{" "}
                    {userPair && pairLabel(userPair)}
                  </span>
                )}
                {receipt.foundKnot && (
                  <span>One thread. You picked the same pair.</span>
                )}
              </div>
            )}
            <div className="selection-bar">
              <div role="status">
                <span className="selection-count">
                  {selected.length}
                  <span>/ 2</span>
                </span>
                <p>
                  {selected.length === 2
                    ? "Your pair is on the table."
                    : selected.length === 1
                      ? "One more sentence to tie it together."
                      : "Which two sentences don’t belong together?"}
                  <small>
                    {selected.length === 2
                      ? "Tap a selected card to change your mind."
                      : "Select exactly two cards before asking Jev."}
                  </small>
                </p>
              </div>
              <button
                className="ask-button"
                disabled={selected.length !== 2 || busy}
                onClick={() => void ask()}
              >
                <KnotMark small />
                {busy ? "Following the thread…" : "Ask Jev"}
                <span>↗</span>
              </button>
            </div>
            <div className="custom-area">
              {customSentence ? (
                <div className="custom-added">
                  <span>
                    <b>One sentence from you.</b> This is now a custom set. Live
                    Jev access required.
                  </span>
                  <button
                    onClick={() => {
                      clearResult();
                      setCustomSentence("");
                      setSelected([]);
                    }}
                  >
                    Remove sentence ×
                  </button>
                </div>
              ) : (
                <details>
                  <summary>
                    <span>+ &nbsp; Add a sentence of your own</span>
                    <span className="small-mono">LIVE KEY REQUIRED</span>
                  </summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!draft.trim()) return;
                      clearResult();
                      setCustomSentence(draft.trim());
                      setSelected([]);
                      setDraft("");
                    }}
                  >
                    <label htmlFor="custom-sentence">
                      One more claim for this plan
                    </label>
                    <textarea
                      id="custom-sentence"
                      required
                      maxLength={240}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write a short sentence. What else does this plan promise?"
                    />
                    <div>
                      <span>
                        {draft.length}/240 · Custom sets need TYPESAFE_API_KEY.
                      </span>
                      <button type="submit" disabled={!draft.trim()}>
                        Add fifth card ↗
                      </button>
                    </div>
                  </form>
                </details>
              )}
            </div>
            <div className="desk-note">
              <span>✳</span>
              <p>
                Some things sound perfectly sensible.
                <br />
                <em>Until you put them next to each other.</em>
              </p>
            </div>
          </section>
          <aside className="record-panel" aria-label="Jev’s record">
            <div className="record-heading">
              <KnotMark small />
              <h2>The knot record</h2>
              <span>№ {receipt ? "001" : "—"}</span>
            </div>
            <div className="mode-banner">
              {liveAvailable
                ? "LIVE · JEV CONNECTED"
                : customSentence
                  ? "CUSTOM SET · LIVE KEY REQUIRED"
                  : "REHEARSAL · FIXED PROBABILITIES"}
            </div>
            <div aria-live="polite" aria-atomic="true">
              {error ? (
                <div className="error-state" role="alert">
                  <span className="small-mono">THREAD INTERRUPTED</span>
                  <h3>No judgment this time.</h3>
                  <p>{error}</p>
                  <button onClick={() => void ask()} disabled={busy}>
                    Try again ↗
                  </button>
                </div>
              ) : receipt && modelPair && userPair ? (
                <div className="result">
                  <Stamp found={receipt.foundKnot} tentative={tentative} />
                  <h3>
                    {tentative
                      ? receipt.foundKnot
                        ? "Your picks match."
                        : "You picked a different pair."
                      : receipt.foundKnot
                        ? "You found the knot."
                        : "The knot was somewhere else."}
                  </h3>
                  <p className="result-subtitle">
                    {tentative
                      ? "Jev’s judgment is tentative. The probabilities are below."
                      : receipt.foundKnot
                        ? "You and Jev pulled the same thread."
                        : "Two picks, two threads. Here they are."}
                  </p>
                  <PairWords
                    label={
                      receipt.mode === "rehearsal"
                        ? "REHEARSAL CONFLICT"
                        : "JEV’S CONFLICT"
                    }
                    pair={modelPair}
                  />
                  {!receipt.foundKnot && (
                    <PairWords label="YOUR PICK" pair={userPair} />
                  )}
                </div>
              ) : (
                <div className={`empty-record ${busy ? "reviewing" : ""}`}>
                  <div className="empty-seal">
                    <KnotMark />
                  </div>
                  <h3>
                    {busy
                      ? "Pulling on the loose ends."
                      : "Every knot starts with a hunch."}
                  </h3>
                  <p>
                    {busy ? (
                      `Checking all ${pairs.length} pairs in one request.`
                    ) : (
                      <>
                        Read the cards. Make your pick.
                        <br />
                        The thread will appear here.
                      </>
                    )}
                  </p>
                  <span className="small-mono">
                    {busy
                      ? "ONE CALL · NO EXPLANATION GENERATED"
                      : "AWAITING YOUR TWO SENTENCES"}
                  </span>
                </div>
              )}
            </div>
            <Ledger sentences={sentences} result={receipt} />
            <div className="receipt-meta">
              <div>
                <span>MODEL</span>
                <strong>
                  {receipt?.model ??
                    (liveAvailable
                      ? "Awaiting Jev"
                      : customSentence
                        ? "Live key required"
                        : "No model called")}
                </strong>
              </div>
              <div>
                <span>ROUND TRIP</span>
                <strong>
                  {receipt?.roundTripMs != null
                    ? `${receipt.roundTripMs} ms`
                    : "—"}
                </strong>
              </div>
            </div>
            {!liveAvailable && !customSentence && (
              <p className="rehearsal-note">
                Rehearsal uses fixed probabilities for this built-in set. No
                model is being called.
              </p>
            )}
            <details className="raw-json">
              <summary>
                <span>{"{ }"} &nbsp; Inspect the raw JSON</span>
                <span>+</span>
              </summary>
              <pre>
                {JSON.stringify(
                  receipt
                    ? {
                        request: receipt.request,
                        response: receipt.raw,
                        mode: receipt.mode,
                        selectedPair: receipt.selectedPair,
                        foundKnot: receipt.foundKnot,
                        roundTripMs: receipt.roundTripMs,
                      }
                    : {
                        sentences,
                        selectedPair:
                          selected.length === 2 ? pairId(selected) : null,
                        status: "No judgment yet.",
                      },
                  null,
                  2,
                )}
              </pre>
            </details>
          </aside>
        </div>
        <section className="how-it-works">
          <div>
            <span>01</span>
            <h3>Read between the lines.</h3>
            <p>Each sentence is a piece of the same plan.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Trust your hunch.</h3>
            <p>Pick two that can’t both be true.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Compare the threads.</h3>
            <p>Jev judges. The probabilities stay on the table.</p>
          </div>
        </section>
      </main>
      <footer>
        <span>
          <b>knot.</b> A second look at things that don’t add up.
        </span>
        <span>
          TYPED JUDGMENTS BY TYPESAFE’S JEV <span>✳</span> OPEN SOURCE · MIT
        </span>
      </footer>
    </div>
  );
}
