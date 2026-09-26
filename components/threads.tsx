"use client";
import { useLayoutEffect, useState, type RefObject } from "react";
import type { Pair } from "@/lib/sets";
type Thread = {
  id: string;
  path: string;
  start: [number, number];
  end: [number, number];
  user: boolean;
};
export function Threads({
  board,
  pairs,
  modelPair,
  userPair,
}: {
  board: RefObject<HTMLDivElement | null>;
  pairs: Pair[];
  modelPair: string;
  userPair: string;
}) {
  const [drawing, setDrawing] = useState<{
    width: number;
    height: number;
    threads: Thread[];
  } | null>(null);
  useLayoutEffect(() => {
    const element = board.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      const threads = [
        modelPair,
        ...(userPair !== modelPair ? [userPair] : []),
      ].flatMap((id, index) => {
        const pair = pairs.find((p) => p.id === id);
        if (!pair) return [];
        const a = element.querySelector(`[data-sentence="${pair.first.id}"]`);
        const b = element.querySelector(`[data-sentence="${pair.second.id}"]`);
        if (!a || !b) return [];
        const first = a.getBoundingClientRect(),
          second = b.getBoundingClientRect();
        // Threads travel through the gutters, with the cards shielding their text.
        const x1 = first.left - box.left + first.width / 2,
          y1 = first.top - box.top + first.height / 2;
        const x2 = second.left - box.left + second.width / 2,
          y2 = second.top - box.top + second.height / 2;
        const sameRow = Math.abs(y1 - y2) < 10;
        const sameColumn = Math.abs(x1 - x2) < 10;
        const bend = index === 0 ? 1 : -1;
        let path = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2 + bend * 25}, ${x2} ${(y1 + y2) / 2 + bend * 25}, ${x2} ${y2}`;
        if (sameRow)
          path = `M ${x1} ${y1} C ${x1} ${first.bottom - box.top + 52}, ${x2} ${second.bottom - box.top + 52}, ${x2} ${y2}`;
        if (sameColumn)
          path = `M ${x1} ${y1} C ${first.right - box.left + 70} ${y1}, ${second.right - box.left + 70} ${y2}, ${x2} ${y2}`;
        return [
          {
            id,
            path,
            start: [x1, y1] as [number, number],
            end: [x2, y2] as [number, number],
            user: index === 1,
          },
        ];
      });
      setDrawing({ width: box.width, height: box.height, threads });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const card of element.querySelectorAll("[data-sentence]"))
      observer.observe(card);
    return () => observer.disconnect();
  }, [board, pairs, modelPair, userPair]);
  if (!drawing) return null;
  return (
    <svg
      className="threads"
      width={drawing.width}
      height={drawing.height}
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      aria-hidden="true"
    >
      {drawing.threads.map((thread) => (
        <path
          key={thread.id}
          d={thread.path}
          className={thread.user ? "user-thread" : "jev-thread"}
        />
      ))}
    </svg>
  );
}
