export type Sentence = { id: string; text: string };
export type SentenceSet = {
  id: string;
  name: string;
  subtitle: string;
  sentences: Sentence[];
  rehearsalPair: string;
  probabilities: number[];
};
export const sets: SentenceSet[] = [
  {
    id: "hackathon",
    name: "The hackathon",
    subtitle: "A weekend. A big idea. A small catch.",
    sentences: [
      { id: "s1", text: "We’ll build the entire demo using only free tools." },
      { id: "s2", text: "Our demo must use an API that costs $50 per call." },
      { id: "s3", text: "We’ll split the work between three teammates." },
      { id: "s4", text: "We’ll present a working prototype on Sunday." },
    ],
    rehearsalPair: "s1_s2",
    probabilities: [0.99, 0.02, 0.08, 0.01, 0.05, 0.03],
  },
  {
    id: "city",
    name: "The new city",
    subtitle: "New keys. New streets. Same reality.",
    sentences: [
      { id: "s1", text: "I’ll move to the new city on the first of June." },
      { id: "s2", text: "I’ll live alone in my new apartment." },
      { id: "s3", text: "I’ll share that apartment with two roommates." },
      { id: "s4", text: "I’ll cycle to work whenever the weather is good." },
    ],
    rehearsalPair: "s2_s3",
    probabilities: [0.02, 0.02, 0.01, 0.99, 0.01, 0.02],
  },
  {
    id: "dinner",
    name: "The group dinner",
    subtitle: "Six friends. One table. Something doesn’t add up.",
    sentences: [
      { id: "s1", text: "Everyone will eat together at the same restaurant." },
      { id: "s2", text: "We’ll book a table for six at seven o’clock." },
      { id: "s3", text: "We’ll choose a place within walking distance." },
      { id: "s4", text: "Each person will eat at a different restaurant." },
    ],
    rehearsalPair: "s1_s4",
    probabilities: [0.01, 0.01, 0.99, 0.04, 0.15, 0.02],
  },
];
export type Pair = { id: string; first: Sentence; second: Sentence };
export function pairsFor(sentences: Sentence[]): Pair[] {
  return sentences.flatMap((first, i) =>
    sentences
      .slice(i + 1)
      .map((second) => ({ id: `${first.id}_${second.id}`, first, second })),
  );
}
export function pairId(ids: string[]) {
  return [...ids].sort().join("_");
}
export function pairLabel(pair: Pair) {
  return `${pair.first.id.slice(1)} + ${pair.second.id.slice(1)}`;
}
