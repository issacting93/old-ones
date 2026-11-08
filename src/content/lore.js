// content/lore.js — the larger mystery, one answer per solved case.
//
// Each loop's case is a small mystery; naming its cause correctly at the full moon also answers
// the next of these questions, in order. Together they lead to who wrote the town's oldest
// stories (docs/design.md, "Thesis").

export const QUESTIONS = [
  {
    question: "Why do people vanish?",
    answer: "They aren't eaten. Everyone taken was moved, carefully, the way you would lift a sleeper out of the rain.",
  },
  {
    question: "Where do they go?",
    answer: "Always to the places the town was once told to keep: the tower, the still water, the groves. The old ones carry people back to the courtesies.",
  },
  {
    question: "What is the Old Tower?",
    answer: "The tower is older than the wall, and the signs on its door are worn smooth by hands. Someone has written on it many times, in the same hand.",
  },
  {
    question: "Who wrote the courtesies?",
    answer: "Lamps at dusk. Still water. No iron in the groves. The courtesies are a sentence, worn down into folklore. The hand that carved it on the tower door is yours.",
  },
  {
    question: "What do the old ones want?",
    answer: "They have been keeping the town the way the town keeps its rites, without remembering why. They are waiting for someone to write them a better reason.",
  },
];

// The first arrival, and every arrival after.
export const ARRIVAL = {
  first: (c) => `A letter in your own handwriting, which you do not remember writing, asked you to come to Vesper before the moon was full. When you reach the gate, someone is waiting for you: ${c.K.name}, ${c.V.first}'s ${c.K.rel}. ${c.V.name}, a ${c.V.role}, has been missing since last night.`,
  again: (c) => `You arrive at the gate again, and the town is not the town you left. The streets have grown back around the words you wrote. Nobody knows your face. ${c.K.name} is waiting at the gate, as someone always is: ${c.V.first}'s ${c.K.rel}. ${c.V.name}, who in this town is a ${c.V.role}, is missing.`,
};
