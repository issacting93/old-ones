// content/characters.js — the people of Vesper who are there every loop.
//
// They are written by hand; what they know about this loop's case is generated (content/
// cases.js). Each loop they meet you as a stranger again. Fields:
//   self      what they tell you when you ask about them (once a loop), and the sigil word they
//             show you while they do (`shows`, the first one you haven't seen from them)
//   greet     opening lines by trust (0 stranger … 3 trusted)
//   nothing   when they have nothing more on the case
//   reacts    what they say when you show a card nothing in the case explains
//   jump      how they answer when you promise a fix before you understand

export const CHARACTERS = [
  {
    id: "ondine",
    name: "Sister Ondine Hale",
    role: "Keeper of the wayside stones",
    quarter: "lantern",
    initials: "OH",
    shows: ["light", "kin", "water"],
    self: "Every dusk for sixty years I've lit the lamp on the wayside stone, and every dusk the mites have come. People call it a prayer. It isn't. It's a greeting. My grandmother taught me the signs on the stones. I know what three of them mean. She knew more.",
    greet: [
      "The old woman at the shrine watches you come up the lane and goes on trimming the wick.",
      "Ondine nods to you and moves over on the bench.",
      "Ondine has kept the kettle warm. She says she knew you would come back tonight.",
      "Ondine takes both your hands. \"You have a look about you,\" she says, \"like someone who has been here before.\"",
    ],
    nothing: "I've told you what the stones know. The rest is between you and them.",
    reacts: {
      sighting: "\"You've been watching them.\" She seems pleased. \"Most people here only look when they're frightened.\"",
      word: "She traces it in the air without touching the card. \"Where did you see this? My grandmother drew it on our door every spring.\"",
      place: "\"I light a lamp there some nights. Not often enough.\"",
      person: "\"I've known them since they were small. Be gentle with them.\"",
      clue: "She listens and says nothing for a while. \"Yes. That sounds like the town.\"",
      memory: "She looks at you for a long time. \"You talk like someone who's been here before. People like that used to come, when I was a girl.\"",
    },
    jump: "Promises. Yes. The last one who came asking said that too.",
  },
  {
    id: "corwin",
    name: "Corwin Ashe",
    role: "Foundry master",
    quarter: "cinder",
    initials: "CA",
    shows: ["fire", "iron"],
    self: "Two hundred families eat because my furnaces burn. People like to talk about the old ones as if they were saints. I've seen what they do to a man who gets in their way. The signs on the old forge doors? My father had them chiselled off. I kept two.",
    greet: [
      "The foundry master doesn't stop working. \"Whatever you're selling, we have it.\"",
      "Corwin wipes his hands and gives you a minute.",
      "Corwin pours you something that burns and pours himself more.",
      "Corwin sends the apprentices out before he sits down with you.",
    ],
    nothing: "That's all I know, and more than I wanted to.",
    reacts: {
      sighting: "\"So they fly over the roofs. So do pigeons.\" He doesn't look at it for long.",
      word: "He goes quiet. \"Those were on the old forge doors. My father had them chiselled off.\"",
      place: "\"Nothing there that pays.\"",
      person: "\"Decent enough. Talks too much.\"",
      clue: "\"Gossip,\" he says, but he reads it twice.",
      memory: "\"How do you know about that?\" He's on his feet. \"Who've you been talking to?\"",
    },
    jump: "Good. Though you didn't ask what it'd cost.",
  },
  {
    id: "maren",
    name: "Dr. Maren Voss",
    role: "Physician of the Cistern Quarter",
    quarter: "cistern",
    initials: "MV",
    shows: ["water", "sleep"],
    self: "Nobody in the Cistern Quarter has had a fever in eleven years. I've checked the ledgers twice. The old wives say the koi keep the water sweet. I'm a physician; I believe in water. But I've copied the signs off the cistern domes into my casebook, in case.",
    greet: [
      "The physician looks up from her casebook and doesn't close it.",
      "Maren makes room for you between the jars.",
      "Maren reads you a line from her casebook before you've sat down.",
      "Maren locks the door behind you. \"I want to show you something I haven't shown anyone.\"",
    ],
    nothing: "That's everything in my casebook. I'll write to you if it changes.",
    reacts: {
      sighting: "She copies it into her casebook. \"Date and quarter. Good. Most people only bring me rumours.\"",
      word: "She turns her casebook round. The same sign is drawn in the margin, beside a list of patients.",
      place: "\"I've had patients from there. Fewer than I should have.\"",
      person: "\"They've been my patient. I won't tell you what for.\"",
      clue: "\"Evidence,\" she says. \"Finally.\"",
      memory: "\"Interesting.\" She writes something down. \"You've never been to my surgery before, have you?\"",
    },
    jump: "Then do it. But you don't yet know what's wrong.",
  },
];

// The Watcher: once you can see enough of the old ones (Insight), it will come down to you.
// It answers only in sigils.
export const WATCHER = {
  id: "watcher",
  name: "The Watcher",
  role: "The haloed one over the Old Tower",
  quarter: "centre",
  initials: "◯",
  insightNeeded: 4,
  greet: [
    "It comes down out of the dark above the tower and hangs in front of you, turning. Every eye on its halo is on you.",
  ],
  says: "Light runs round its halo and settles into a shape, the way a word settles on a tongue.",
};

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
