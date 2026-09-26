export type StandingPromise = {
  id: string;
  title: string;
  text: string;
  to: string;
  when: string;
};
export type Situation = {
  id: string;
  name: string;
  subject: string;
  recipient: string;
  role: string;
  initials: string;
  incoming: string;
  context: string;
  draft: string;
  promises: StandingPromise[];
  collisionId: string;
};
export const situations: Situation[] = [
  {
    id: "demo",
    name: "The demo link",
    subject: "A link for the judges",
    recipient: "Ellie Chen",
    role: "Hackathon judge",
    initials: "EC",
    incoming:
      "Could you send me a public link to the demo by 2pm? I’d like to try it on my own computer before judging.",
    context:
      "It is 1pm on judging day. The demo currently runs only on the sender’s laptop at localhost. Judging ends at 3pm. A public link must work independently on the judge’s computer, not merely point to localhost.",
    draft:
      "Absolutely. I’ll send you a working public demo link by 2pm, so you can try it on your own computer before judging.",
    promises: [
      {
        id: "p1",
        title: "Keep the demo on this laptop",
        text: "I’ll keep the demo running only on this laptop until judging ends at 3pm. No public deployment or tunnel before then.",
        to: "The team",
        when: "Today, 10:15am",
      },
      {
        id: "p2",
        title: "Send the demo slides",
        text: "I’ll email you the demo slide deck by 6pm today.",
        to: "Sam",
        when: "Yesterday, 4:30pm",
      },
    ],
    collisionId: "p1",
  },
  {
    id: "dog",
    name: "Saturday morning",
    subject: "A favor for Saturday",
    recipient: "Maya",
    role: "Friend",
    initials: "MA",
    incoming:
      "Could you watch Pip at my place on Saturday, 9am–noon? He can’t be left alone. I’ll be back at noon.",
    context:
      "Maya’s home is across town, separate from the sender’s apartment. Watching Pip requires staying at Maya’s home for the whole requested time; the dog cannot be brought to the sender’s apartment. All Saturday times refer to the same date and local timezone.",
    draft:
      "Of course. I’ll come to your place and watch your dog, Pip, all Saturday morning, from 9 until noon. You can count on me.",
    promises: [
      {
        id: "p1",
        title: "Be home for the desk buyer",
        text: "I’ll be at my apartment on Saturday from 10 to 11am to hand over the desk to you in person.",
        to: "Alex · desk buyer",
        when: "Yesterday, 6:20pm",
      },
      {
        id: "p2",
        title: "Send the dog shelter logo",
        text: "I’ll email you the finished dog shelter logo on Sunday afternoon.",
        to: "Nora",
        when: "Tuesday, 11:00am",
      },
    ],
    collisionId: "p1",
  },
  {
    id: "flight",
    name: "The early flight",
    subject: "Friday’s flight to Chicago",
    recipient: "Jordan",
    role: "Travel coordinator",
    initials: "JO",
    incoming:
      "There’s a flight from San Francisco to Chicago on Friday at 7am. Shall I book you on it?",
    context:
      "The flight departs San Francisco Friday at 7am Pacific and arrives in Chicago at 1:10pm Central (11:10am Pacific). It is the same Friday as the client presentation. The client requires the sender to present in person in San Francisco; remote participation is not an option.",
    draft:
      "Yes, please book me on the Friday 7am flight to Chicago. I’ll be on that plane.",
    promises: [
      {
        id: "p1",
        title: "Present to the client in person",
        text: "I’ll present our proposal in person at your San Francisco office on Friday, from 9 to 10am Pacific.",
        to: "Riley · client",
        when: "Monday, 2:00pm",
      },
      {
        id: "p2",
        title: "Share the Chicago research",
        text: "I’ll send you the Chicago research notes by 5pm on Thursday.",
        to: "Morgan",
        when: "Monday, 3:45pm",
      },
    ],
    collisionId: "p1",
  },
];
export function makeState(situation: Situation, draft: string) {
  return {
    context: situation.context,
    incomingMessage: situation.incoming,
    draft,
    standingPromises: situation.promises.map(({ id, text }) => ({ id, text })),
  };
}
export type ReplyState = ReturnType<typeof makeState>;
