// content/townsfolk.js — the generated people of each loop's case.
//
// The core cast (content/characters.js) is written by hand and returns every loop. Each case
// also generates three people: the one who vanished, the relative who reports it, and a
// witness. Their names are drawn here; their knowledge comes from the case (content/cases.js).

export const FIRST = ["Edda", "Tam", "Wren", "Osric", "Ilse", "Bram", "Nell", "Corin", "Mabry", "Jory", "Sabe", "Ansel", "Petra", "Lisle", "Fenn", "Hesper", "Rook", "Agnes", "Teodor", "Maud"];
export const FAMILY = ["Marsh", "Coyle", "Vane", "Harrow", "Pell", "Tolley", "Wick", "Ashby", "Crane", "Moss", "Thorne", "Galloway"];

export const PRONOUNS = [
  { pron: "she", obj: "her", pos: "her" },
  { pron: "he", obj: "him", pos: "his" },
];

// relationships, by the relative's own pronoun
export const KIN = {
  she: ["sister", "mother", "wife", "daughter"],
  he: ["brother", "father", "husband", "son"],
};

export const WITNESSES = [
  { role: "night-watchman", line: "I walk the wall from dusk to the first bell." },
  { role: "bell-ringer", line: "I ring the hours. From the bell loft you see the whole town at once." },
  { role: "baker", line: "I'm up before anyone. The ovens don't wait." },
  { role: "ferry-boy", line: "I pole the cistern boats. Nobody looks at a boy on the water." },
];

// Generic voice for generated people, so every person can answer anything.
export const GENERIC = {
  greet: [
    "They look at you the way people here look at strangers: politely, and from a little further away than they need to.",
    "They know your face from somewhere, and can't place it.",
    "They seem relieved to see you, and ashamed of being relieved.",
    "They talk to you as if you had always lived here.",
  ],
  nothing: "I've told you all I know. I wish it were more.",
  reacts: {
    sighting: "They look at the sighting for a long time. \"We don't talk about them like that, as if they were weather.\"",
    word: "They won't look at the sign. \"Put that away. You don't draw those in the street.\"",
    place: "\"I know it. Everyone knows it. That doesn't mean we go there.\"",
    person: "\"We know each other the way everyone here does. Too well, and not at all.\"",
    clue: "\"Who told you that?\" They don't wait for an answer.",
    memory: "\"How do you know that?\" They step back from you. \"You've only just arrived.\"",
  },
};
