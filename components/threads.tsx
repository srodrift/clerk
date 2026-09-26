"use client";
import { useLayoutEffect, useState, type RefObject } from "react";
export function Thread({
  document,
  promiseId,
}: {
  document: RefObject<HTMLDivElement | null>;
  promiseId: string;
}) {
  const [drawing, setDrawing] = useState<{
    width: number;
    height: number;
    path: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  useLayoutEffect(() => {
    const root = document.current;
    if (!root) return;
    const draft = root.querySelector("[data-draft]"),
      promise = root.querySelector(`[data-promise="${promiseId}"]`);
    if (!draft || !promise) return;
    const measure = () => {
      const box = root.getBoundingClientRect(),
        a = draft.getBoundingClientRect(),
        b = promise.getBoundingClientRect();
      const x1 = a.right - box.left,
        y1 = a.top - box.top + a.height * 0.58,
        x2 = b.right - box.left,
        y2 = b.top - box.top + b.height * 0.5;
      const rail = box.width - 7;
      setDrawing({
        width: box.width,
        height: box.height,
        path: `M ${x1} ${y1} C ${rail} ${y1}, ${rail} ${y1 + 15}, ${rail} ${y1 + 40} L ${rail} ${y2 - 35} Q ${rail} ${y2}, ${x2} ${y2}`,
        x1,
        y1,
        x2,
        y2,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(draft);
    observer.observe(promise);
    return () => observer.disconnect();
  }, [document, promiseId]);
  if (!drawing) return null;
  return (
    <svg
      className="collision-thread"
      width={drawing.width}
      height={drawing.height}
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      aria-hidden="true"
    >
      <path d={drawing.path} />
      <circle cx={drawing.x1} cy={drawing.y1} r="3.5" />
      <circle cx={drawing.x2} cy={drawing.y2} r="3.5" />
    </svg>
  );
}
