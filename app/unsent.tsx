"use client";
import { useRef, useState } from "react";
import { makeState, situations } from "@/lib/situations";
import type { JevResponse } from "@/lib/jev";
import type { Decision } from "@/lib/decision";
import { Stamp } from "@/components/stamp";
import { Ledger } from "@/components/ledger";
import { Thread } from "@/components/threads";
type Receipt = JevResponse & {
  mode: "live" | "rehearsal";
  roundTripMs: number | null;
  decision: Decision;
  request: unknown;
  raw: unknown;
};
function Envelope({ large = false }: { large?: boolean }) {
  return (
    <svg
      width={large ? 42 : 22}
      height={large ? 42 : 22}
      viewBox="0 0 32 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5h26v18H3zM3 5l13 10L29 5M3 23l9-10m17 10-9-10" />
      <path d="M11 1h10" />
    </svg>
  );
}
export default function Unsent({ liveAvailable }: { liveAvailable: boolean }) {
  const [situationId, setSituationId] = useState(situations[0].id);
  const [draft, setDraft] = useState(situations[0].draft);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0),
    pending = useRef(false),
    controller = useRef<AbortController | null>(null);
  const document = useRef<HTMLDivElement>(null);
  const situation = situations.find((s) => s.id === situationId)!;
  const edited = draft.trim() !== situation.draft;
  const affected = receipt?.decision.promiseId
    ? situation.promises.find((p) => p.id === receipt.decision.promiseId)
    : null;
  function clearResult() {
    requestVersion.current++;
    controller.current?.abort();
    pending.current = false;
    setBusy(false);
    setReceipt(null);
    setError("");
  }
  function switchSituation(id: string) {
    const next = situations.find((s) => s.id === id)!;
    clearResult();
    setSituationId(id);
    setDraft(next.draft);
  }
  async function checkReply() {
    if (!draft.trim() || pending.current) return;
    pending.current = true;
    const version = ++requestVersion.current;
    controller.current = new AbortController();
    setBusy(true);
    setReceipt(null);
    setError("");
    try {
      const response = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situationId, draft }),
        signal: controller.current.signal,
      });
      const data = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok)
        throw new Error(
          data.error || "This reply could not be checked. It is still unsent.",
        );
      setReceipt(data);
    } catch (e) {
      if (version === requestVersion.current)
        setError(
          e instanceof Error
            ? e.message
            : "This reply could not be checked. It is still unsent.",
        );
    } finally {
      if (version === requestVersion.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="/" className="wordmark" aria-label="Unsent home">
          <Envelope />
          unsent<span>.</span>
        </a>
        <span className="top-note">A LITTLE ROOM FOR SECOND THOUGHTS.</span>
        <div className="session-label">
          <i /> Your words. Your promises.
        </div>
      </header>
      <main>
        <section className="intro">
          <div className="eyebrow">BEFORE THE NEXT “OF COURSE.”</div>
          <h1>
            Don’t send it <em>yet.</em>
          </h1>
          <p>
            A reply is a promise, too.
            <br />
            Check it against the ones you’ve already made.
          </p>
          <div className="intro-note" aria-hidden="true">
            <svg viewBox="0 0 240 100">
              <path d="M8 48C56 18 92 83 128 54S129 16 123 37 184 70 233 37" />
            </svg>
            <span>Keep the thread. Keep your word.</span>
          </div>
        </section>
        <div className="situation-heading">
          <span className="small-mono">THREE MOMENTS BEFORE SEND</span>
          <span className="small-mono">Choose a situation to try</span>
        </div>
        <nav className="situation-tabs" aria-label="Situations">
          {situations.map((s, i) => (
            <button
              key={s.id}
              className={situationId === s.id ? "active" : ""}
              aria-pressed={situationId === s.id}
              onClick={() => switchSituation(s.id)}
            >
              <span>0{i + 1}</span>
              {s.name}
              <span className="tab-arrow">↗</span>
            </button>
          ))}
        </nav>
        <div className="workspace">
          <section
            className="reply-panel"
            aria-label="Reply and standing promises"
          >
            <div className="reply-heading">
              <h2>{situation.subject}</h2>
              <span className="draft-status">
                <i /> UNSENT DRAFT
              </span>
            </div>
            <div className="incoming">
              <span className="avatar">{situation.initials}</span>
              <div>
                <div className="incoming-from">
                  <strong>{situation.recipient}</strong>
                  <span>{situation.role}</span>
                </div>
                <p>“{situation.incoming}”</p>
              </div>
            </div>
            <div className="document" ref={document}>
              {affected && (
                <Thread document={document} promiseId={affected.id} />
              )}
              <div
                className={`draft-editor ${affected ? "has-collision" : ""}`}
                data-draft
              >
                <div className="editor-meta">
                  <label htmlFor="reply">YOUR REPLY</label>
                  <span>To {situation.recipient}</span>
                </div>
                <textarea
                  id="reply"
                  aria-describedby="draft-help"
                  value={draft}
                  maxLength={4000}
                  spellCheck="true"
                  onChange={(e) => {
                    clearResult();
                    setDraft(e.target.value);
                  }}
                />
                <div className="editor-footer">
                  <span id="draft-help">
                    Your words, exactly as you’d send them. Edit freely.
                  </span>
                  <span>{draft.length.toLocaleString()} / 4,000</span>
                </div>
              </div>
              <section className="promises" aria-labelledby="promises-title">
                <div className="promises-heading">
                  <h3 id="promises-title">Already on your word.</h3>
                  <span className="small-mono">
                    {situation.promises.length} STANDING PROMISES
                  </span>
                </div>
                <ol>
                  {situation.promises.map((p, i) => {
                    const conflict = affected?.id === p.id;
                    return (
                      <li
                        key={p.id}
                        className={conflict ? "broken-promise" : ""}
                        data-promise={p.id}
                      >
                        <span className="promise-number">0{i + 1}</span>
                        <div>
                          <div className="promise-title">
                            <h4>{p.title}</h4>
                            {conflict && (
                              <span>
                                {receipt?.decision.reason === "collision"
                                  ? "COLLISION"
                                  : "NEEDS REVIEW"}
                              </span>
                            )}
                          </div>
                          <p>“{p.text}”</p>
                          <div className="promise-source">
                            To {p.to}
                            <span>·</span>
                            {p.when}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>
            <div className="check-area">
              <button
                className="check-button"
                disabled={!draft.trim() || busy}
                onClick={() => void checkReply()}
              >
                <Envelope />
                {busy ? "Checking your promises…" : "Check this reply"}
                <span>↗</span>
              </button>
              <span className="check-note">
                A check, not a send.
                <br />
                Your reply never leaves for its recipient.
              </span>
            </div>
            <p className="editing-note">
              {liveAvailable
                ? "Live checks compare your current reply with every standing promise."
                : edited
                  ? "You’ve edited this reply. A live key is needed to check it."
                  : "This original reply can be checked in Rehearsal. Edit it to try your own wording with a live key."}
            </p>
          </section>
          <aside className="record-panel" aria-label="Reply check">
            <div className="record-heading">
              <span className="small-mono">THE SECOND LOOK</span>
              <span className={`mode-badge ${liveAvailable ? "live" : ""}`}>
                {liveAvailable
                  ? "Live · Jev"
                  : edited
                    ? "Live key required"
                    : "Rehearsal"}
              </span>
            </div>
            <div aria-live="polite" aria-atomic="true">
              {error ? (
                <div className="error-state" role="alert">
                  <div className="error-mark">!</div>
                  <h2>Still unsent.</h2>
                  <p>{error}</p>
                  <span>Use “Check this reply” to try again.</span>
                </div>
              ) : receipt ? (
                <div className="result">
                  <Stamp verdict={receipt.decision.stamp} />
                  <h2>
                    {receipt.decision.stamp === "SEND"
                      ? "Your promises still hold."
                      : receipt.decision.reason === "collision"
                        ? "This reply stays unsent."
                        : "A little more certainty first."}
                  </h2>
                  <p className="result-summary">
                    {receipt.decision.stamp === "SEND"
                      ? "No standing promise conflicts with this reply. It’s ready for you to send."
                      : receipt.decision.reason === "collision"
                        ? "This reply and an earlier promise cannot both be kept."
                        : "The judgments aren’t clear enough to give this reply a SEND. Review it before sending."}
                  </p>
                  {affected && (
                    <div className="collision-reference">
                      <span className="small-mono">
                        {receipt.decision.reason === "collision"
                          ? "THE PROMISE AT STAKE"
                          : "THE PROMISE TO REVIEW"}
                      </span>
                      <p>{affected.title}</p>
                      <span>To {affected.to}</span>
                    </div>
                  )}
                  <div className="result-footnote">
                    {receipt.mode === "rehearsal"
                      ? "Rehearsal result · fixed probabilities"
                      : `Checked by ${receipt.model}`}
                    <span>
                      {receipt.decision.stamp === "SEND"
                        ? "Nothing has been sent."
                        : "Your draft is still yours to change."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className={`empty-record ${busy ? "reviewing" : ""}`}>
                  <div className="empty-envelope">
                    <Envelope large />
                  </div>
                  <h2>
                    {busy
                      ? "Reading between your promises."
                      : "A moment before it’s a promise."}
                  </h2>
                  <p>
                    {busy
                      ? "One check against everything you’ve already committed to."
                      : "Your reply is ready for a second look. We’ll check what it would ask you to keep."}
                  </p>
                  <div className="empty-rule">
                    <span /> {busy ? "CHECKING" : "NOT CHECKED YET"} <span />
                  </div>
                </div>
              )}
            </div>
            <Ledger promises={situation.promises} result={receipt} />
            <div className="receipt-meta">
              <div>
                <span>MODEL</span>
                <strong>{receipt?.model ?? "No judgment yet"}</strong>
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
            {!liveAvailable && !edited && (
              <p className="rehearsal-note">
                Rehearsal uses fixed probabilities for this reply. No model was
                called.
              </p>
            )}
            <details className="raw-json">
              <summary>
                <span>{"{ }"} &nbsp; The raw record</span>
                <span>+</span>
              </summary>
              <pre>
                {JSON.stringify(
                  receipt
                    ? {
                        request: receipt.request,
                        response: receipt.raw,
                        decision: receipt.decision,
                        mode: receipt.mode,
                        roundTripMs: receipt.roundTripMs,
                      }
                    : {
                        state: makeState(situation, draft),
                        status: "Not checked. No answers yet.",
                      },
                  null,
                  2,
                )}
              </pre>
            </details>
          </aside>
        </div>
        <div className="afterword">
          <span className="afterword-star">✳</span>
          <p>
            It’s easy to mean every word.
            <br />
            <em>The harder part is keeping all of them.</em>
          </p>
        </div>
      </main>
      <footer>
        <span>
          <b>unsent.</b> A small pause. A promise kept.
        </span>
        <span>
          JUDGMENTS BY TYPESAFE’S JEV <span>·</span> OPEN SOURCE · MIT
        </span>
      </footer>
    </div>
  );
}
