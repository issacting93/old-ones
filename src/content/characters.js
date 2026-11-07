// content/characters.js — the townsfolk you can visit, and what they will say.
//
// Format (extends Mandate's conversations_v2.js):
//   character: { id, name, role, quarter, initials, threads: [...] }
//   thread:    { id, title, priority, requires: [conditions], exchanges: [...], onEnd: [effects], repeatable? }
//   exchange:  {
//     npc: "what they say",
//     interjections: [{ lens, minLevel, text, followUp, effects? }],   // a lens you have speaks up
//     choices: [{ text, depth, reply?, effects?, solutionJump?, end? }],
//     jumpReply: "how they answer a solution-jump",
//     checks: [{ lens, difficulty, pass: { npc, clue, effects }, fail: { npc, clue, effects } }],
//     clue: { id, text }                                              // gained by listening (not jumping)
//   }
// Conditions and effects are the language in core/rules.js. A thread's `requires` is how the
// world — the old ones included — decides what someone has to say tonight.

export const CHARACTERS = [
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ondine",
    name: "Sister Ondine Hale",
    role: "Keeper of the wayside stones",
    quarter: "lantern",
    initials: "OH",
    threads: [
      {
        id: "ondine-rite",
        title: "The dusk rite",
        exchanges: [
          {
            npc: "Every dusk for sixty years I've lit the lamp on the wayside stone, and every dusk the mites have come. My mother lit it before me. People call it a prayer. It isn't. It's a greeting.",
            interjections: [
              { lens: "SHRINE", minLevel: 1, text: "She said greeting, not offering. The difference matters to her.", followUp: "What's the difference, to you?" },
              { lens: "LEDGER", minLevel: 1, text: "The Archive keeps no record of this rite. Not a line. Someone left it out.", followUp: "Why isn't the rite written down anywhere?" },
            ],
            choices: [
              { text: "Tell me about the mites.", depth: 1 },
              { text: "I'll have the council fund new lamps for every stone.", solutionJump: true },
            ],
            jumpReply: "Lamps. Yes. The last mayor said that too.",
            clue: { id: "rite-greeting", text: "The dusk rite at the wayside stones is a greeting, not an offering. Ondine's family has kept it for generations." },
          },
          {
            npc: "When the mites come, the koi rise in the cisterns an hour later. Then the swifts over the roofs. Then the veils over the groves. It goes down the line every night, like a lamp passed hand to hand.",
            interjections: [
              { lens: "SURVEY", minLevel: 1, text: "The order she describes follows the water downhill.", followUp: "Does it always start here, in your quarter?" },
              { lens: "PHYSIC", minLevel: 1, text: "People who live near the stones sleep well. You've heard it said and never thought about it.", followUp: "Do the people near the stones sleep better?" },
            ],
            checks: [
              {
                lens: "SHRINE", difficulty: 9,
                pass: {
                  npc: "She lowers her voice. \"It doesn't start here. It starts at the tower. Something up there wakes first. We only see it when it reaches us.\"",
                  clue: { id: "tower-first", text: "The nightly waking starts at the Old Tower, not the shrines. Something there wakes first." },
                },
                fail: { npc: "\"It's just how it goes,\" she says, and looks at the lamp instead of you." },
              },
            ],
            choices: [{ text: "Go on.", depth: 1 }],
            clue: { id: "chain-of-light", text: "At dusk the old ones wake in order: mites, then koi, then swifts, then veils. Everything waits on the mites." },
          },
          {
            npc: "Corwin wants another foundry. I don't hate him for it; his people need the work. I only ask that someone thinks about what smoke does to still water.",
            choices: [
              { text: "What does it do?", depth: 1, reply: "Ask the koi. Ask Maren. I only know the mites come thinner when the wind is from the south." },
              { text: "I'll keep the stones in mind when the council sits.", depth: 1, effects: [{ type: "stance", kin: 1 }], end: true },
              { text: "Then I won't let the foundry be built.", solutionJump: true },
            ],
            jumpReply: "Don't promise me that. You don't know yet what the town needs. Neither do I.",
          },
        ],
        onEnd: [{ type: "flag", value: "met-ondine" }],
      },
      {
        id: "ondine-lamps",
        title: "The lamps burn alone",
        priority: 5,
        requires: [{ type: "OR", conditions: [{ type: "speciesBelow", key: "wisp", value: 0.6 }, { type: "flag", value: "mites-thinning" }] }],
        exchanges: [
          {
            npc: "I lit the lamp and nothing came. Last night and the night before. The children asked me if the mites had died. I didn't know what to tell them.",
            interjections: [
              { lens: "SHRINE", minLevel: 1, text: "A greeting no one answers. To her, that's worse than an empty room.", followUp: "What does it mean, when they don't come?" },
              { lens: "PHYSIC", minLevel: 1, text: "She hasn't slept. Her hands shake when she trims the wick.", followUp: "When did you last sleep?" },
            ],
            choices: [
              { text: "What do you think happened?", depth: 1 },
              { text: "We'll bring them back. I promise.", solutionJump: true },
            ],
            jumpReply: "With what? You don't know why they left.",
            clue: { id: "mites-gone", text: "The mites no longer come to the Lantern Quarter stones at dusk." },
          },
          {
            npc: "My grandmother said the town was let stay because it keeps the courtesies. I always thought it was a story for children.",
            checks: [
              {
                lens: "SHRINE", difficulty: 10,
                pass: {
                  npc: "\"Lamps at dusk. Still water. No iron in the groves.\" She counts them off on her fingers like a child would. \"That was the whole of it. Three things.\"",
                  clue: { id: "the-courtesies", text: "The town was let stay on three courtesies: lamps at dusk, still water, no iron in the groves." },
                },
                fail: { npc: "\"It's only a story,\" she says, too quickly." },
              },
            ],
            choices: [
              { text: "If the foundry smoke is the cause, I'll have its fires banked at dusk.", depth: 1, effects: [{ type: "flag", value: "fires-banked" }, { type: "stance", kin: 1 }, { type: "coin", delta: -1 }], reply: "She closes her eyes. \"Thank you. Corwin will hate it.\"" },
              { text: "The town has to grow. The mites will find somewhere else.", depth: 1, effects: [{ type: "stance", bind: 1 }], reply: "\"Somewhere else,\" she repeats. \"Yes. I suppose that's what everyone says about the thing they're pushing out.\"" },
            ],
          },
        ],
        onEnd: [{ type: "flag", value: "heard-ondine-lamps" }],
      },
      {
        id: "ondine-idle",
        title: "Tending the stones",
        priority: -1,
        repeatable: true,
        exchanges: [
          {
            npc: "Nothing new tonight, Mayor. The lamp's lit. I'm watching to see who answers.",
            choices: [{ text: "I'll leave you to it.", depth: 0, end: true }],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "corwin",
    name: "Corwin Ashe",
    role: "Foundry master",
    quarter: "cinder",
    initials: "CA",
    threads: [
      {
        id: "corwin-work",
        title: "Coin and work",
        exchanges: [
          {
            npc: "You want to know what the Cinder Quarter needs? Work. Two hundred families eat because my furnaces burn. Build me another and that's two hundred more.",
            interjections: [
              { lens: "LEDGER", minLevel: 1, text: "The Ledger shows forge coin paid for the last repairs to the wall.", followUp: "What does the town owe the forges?" },
              { lens: "SURVEY", minLevel: 1, text: "The slag heaps sit uphill of the Cistern Quarter.", followUp: "Where does the runoff from the heaps go?" },
            ],
            choices: [
              { text: "Tell me about the families.", depth: 1 },
              { text: "You'll have your foundry.", solutionJump: true },
            ],
            jumpReply: "Good. Though you didn't ask what it'd cost.",
            clue: { id: "forge-coin", text: "The forges carry the town's coin. Two hundred families depend on them." },
          },
          {
            npc: "Ondine will tell you the smoke hurts her little lights. Maybe it does. I've never seen a mite feed a child.",
            interjections: [
              { lens: "SHRINE", minLevel: 1, text: "He isn't wrong, and he knows he isn't wholly right.", followUp: "Have you ever watched what the mites do?" },
              { lens: "PHYSIC", minLevel: 1, text: "Scarred hands, a rough chest. The furnaces cost him too.", followUp: "What do the furnaces cost your workers?" },
            ],
            checks: [
              {
                lens: "SURVEY", difficulty: 10,
                pass: {
                  npc: "He shrugs, then doesn't. \"Runoff goes downhill into the culverts. Some mornings the Cistern wells taste of iron. I've told no one that.\"",
                  clue: { id: "iron-in-wells", text: "Runoff from the Cinder heaps reaches the cistern culverts. Some mornings the wells taste of iron." },
                },
                fail: { npc: "\"Smoke goes up. That's what smoke does.\"" },
              },
            ],
            choices: [{ text: "Go on.", depth: 1 }],
          },
          {
            npc: "I'm not a monster, Mayor. I just think a town gets to grow. Things that were here before us will have to make room, same as the trees did.",
            choices: [
              { text: "And if they won't make room?", depth: 1, reply: "\"Then we'll find out who was here first.\" He means it as a joke. Neither of you laughs." },
              { text: "Growth, then. But carefully.", depth: 1, effects: [{ type: "stance", bind: 1 }], end: true },
            ],
          },
        ],
        onEnd: [{ type: "flag", value: "met-corwin" }],
      },
      {
        id: "corwin-eel",
        title: "Something long and pale",
        priority: 6,
        requires: [{ type: "OR", conditions: [{ type: "intruding", key: "eel" }, { type: "flag", value: "eel-inside" }] }],
        exchanges: [
          {
            npc: "One of them came over the slag heaps last night. Long as a street and white as bone. It took the Harkers' dog off their step. People are talking about wardstones, Mayor.",
            interjections: [
              { lens: "SHRINE", minLevel: 1, text: "The eels never come inside the wall unless they're starving.", followUp: "Why would it come inside now?" },
              { lens: "PHYSIC", minLevel: 1, text: "He's frightened, and hiding it badly.", followUp: "Is anyone hurt?" },
            ],
            choices: [
              { text: "Tell me exactly what you saw.", depth: 1 },
              { text: "I'll have the wardstones raised tomorrow.", solutionJump: true },
            ],
            jumpReply: "...That's what I wanted to hear. Isn't it.",
            clue: { id: "eel-hungry", text: "A Pale Eel came over the Cinder heaps. The eels only come inside the wall when they're starving." },
          },
          {
            npc: "It didn't eat the dog. It took it, and dropped it in the street, and went looking for something else. What does a thing like that even eat?",
            interjections: [
              { lens: "SHRINE", minLevel: 1, text: "It eats the mites. When the mites thin out, the eels follow their hunger into town." },
              { lens: "SURVEY", minLevel: 2, text: "It came in along the culverts — the same way the runoff goes out." },
            ],
            choices: [
              { text: "Iron, then. Wardstones on the heaps.", depth: 1, effects: [{ type: "stance", ward: 1 }, { type: "flag", value: "corwin-wants-wards" }], reply: "He nods, relieved, and you can see he's already pricing the stone." },
              { text: "Or we feed the water again, and it goes home.", depth: 1, effects: [{ type: "stance", kin: 1 }], reply: "\"Feed it,\" he says slowly. \"You want to feed it.\"" },
              { text: "Something that strong... could it be put to work?", depth: 1, effects: [{ type: "stance", bind: 1 }, { type: "flag", value: "corwin-harness" }], reply: "Corwin stares at you. \"You're asking if we can harness that.\" He doesn't say no." },
            ],
          },
        ],
        onEnd: [{ type: "flag", value: "heard-corwin-eel" }],
      },
      {
        id: "corwin-cold",
        title: "Cold furnaces",
        priority: 5,
        requires: [{ type: "flag", value: "cold-furnaces" }],
        exchanges: [
          {
            npc: "Sixty men, Mayor. I sent sixty men home tonight. You've built shrines and cisterns and every one of them is lovely, and none of them pays a wage.",
            interjections: [
              { lens: "LEDGER", minLevel: 1, text: "The town's coin is thin. Nothing you've built earns anything.", followUp: "How long can the quarter last like this?" },
              { lens: "SHRINE", minLevel: 1, text: "The old courtesies never said the town had to be poor.", followUp: "Is there work that doesn't foul the water?" },
            ],
            choices: [
              { text: "I hear you. Tell me what the quarter needs.", depth: 1 },
              { text: "I'll build you a foundry tomorrow.", solutionJump: true },
            ],
            jumpReply: "Will you. And what will Ondine say?",
            clue: { id: "kin-cost", text: "Kindness to the old ones has left the Cinder Quarter without wages. Sixty men sent home." },
          },
          {
            npc: "I'm not asking you to poison the wells. I'm asking you to remember there are people in this town too.",
            checks: [
              {
                lens: "SURVEY", difficulty: 9,
                pass: {
                  npc: "He rubs his jaw. \"There's clay under the Drowned Quarter. Good clay. Kilns run cooler than furnaces. Less smoke. I've never said it because nobody goes there.\"",
                  clue: { id: "drowned-clay", text: "There is good clay under the Drowned Quarter. Kilns would run cooler and cleaner than furnaces." },
                },
                fail: { npc: "\"I don't know what else there is. I know iron.\"" },
              },
            ],
            choices: [
              { text: "Then we'll find work that sits easier with the water.", depth: 1, effects: [{ type: "stance", kin: 1 }], reply: "\"Find it quickly, then.\"" },
              { text: "You're right. The town comes first.", depth: 1, effects: [{ type: "stance", bind: 1 }], reply: "He nods once, like a man who has won something he isn't sure he wanted." },
            ],
          },
        ],
        onEnd: [{ type: "flag", value: "heard-corwin-cold" }],
      },
      {
        id: "corwin-idle",
        title: "The furnaces",
        priority: -1,
        repeatable: true,
        exchanges: [
          {
            npc: "Furnaces are hot, coin's coming in. That's all a forge ever has to report.",
            choices: [{ text: "Keep them burning.", depth: 0, end: true }],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "maren",
    name: "Dr. Maren Voss",
    role: "Physician of the Cistern Quarter",
    quarter: "cistern",
    initials: "MV",
    threads: [
      {
        id: "maren-water",
        title: "The sweet water",
        exchanges: [
          {
            npc: "Nobody in the Cistern Quarter has had a fever in eleven years. I've checked the ledgers twice. The rest of the town has fevers every spring, as towns do.",
            interjections: [
              { lens: "PHYSIC", minLevel: 1, text: "Eleven years without fever, in the dampest quarter. That isn't luck.", followUp: "What's different about this quarter?" },
              { lens: "LEDGER", minLevel: 1, text: "Eleven years ago the town rebuilt the culverts after the flood.", followUp: "What changed eleven years ago?" },
            ],
            choices: [
              { text: "That's remarkable.", depth: 1 },
              { text: "Then we'll copy whatever you're doing across the town.", solutionJump: true },
            ],
            jumpReply: "I'm not doing anything. That's the point.",
            clue: { id: "no-fever", text: "No fever in the Cistern Quarter for eleven years — since the culverts were rebuilt after the flood." },
          },
          {
            npc: "The koi come up the culverts every night and graze. In the morning the water is clear and it doesn't smell. The old wives say the koi keep it sweet. I used to laugh at the old wives.",
            interjections: [
              { lens: "SURVEY", minLevel: 1, text: "Where the koi graze the channels, nothing stands still long enough to sour.", followUp: "Which wells do the koi visit?" },
            ],
            checks: [
              {
                lens: "PHYSIC", difficulty: 10,
                pass: {
                  npc: "She opens her notebook. \"I drew water from a well the koi visit and one they don't, and left both a week. Only one turned.\"",
                  clue: { id: "koi-sweeten", text: "Maren's test: water from a well the koi visit stayed clean; water from a well they avoid went foul in a week." },
                },
                fail: { npc: "\"Old wives' talk. I'm a physician. I shouldn't repeat it.\"" },
              },
            ],
            choices: [{ text: "Go on.", depth: 1 }],
          },
          {
            npc: "I don't know what they are, Mayor. I don't think they're gods. But I think we've lived off them a long time without asking what we give back.",
            choices: [
              { text: "What do you think we give back?", depth: 2, reply: "\"The mites eat what we let fall. Ash, crumbs, the warmth from our windows. Maybe that's all it ever was. A town is food.\"" },
              { text: "Then let's find out before we build anything else.", depth: 1, effects: [{ type: "stance", kin: 1 }], end: true },
            ],
            clue: { id: "town-is-food", text: "Maren: the mites feed on what the town lets fall — ash, crumbs, the warmth of windows. A town is food." },
          },
        ],
        onEnd: [{ type: "flag", value: "met-maren" }],
      },
      {
        id: "maren-sleep",
        title: "The long sleep",
        priority: 6,
        requires: [{ type: "OR", conditions: [{ type: "speciesBelow", key: "koi", value: 0.75 }, { type: "flag", value: "koi-leaving" }] }],
        exchanges: [
          {
            npc: "Four people in this quarter won't wake. Not fever. They breathe, they turn over. They just don't wake.",
            interjections: [
              { lens: "PHYSIC", minLevel: 1, text: "No fever, no wound, no poison you know of. Sleep, and nothing else.", followUp: "Where do they live?" },
              { lens: "SHRINE", minLevel: 2, text: "Ondine's grandmother called it the long sleep. It came the year of the flood.", followUp: "Has this happened before — the year of the flood?" },
            ],
            choices: [
              { text: "Where do they live?", depth: 1, reply: "\"All four on the east culvert. The one the koi stopped coming up.\"" },
              { text: "We'll quarantine the quarter.", solutionJump: true },
            ],
            jumpReply: "From what? I can't find anything to keep out.",
            clue: { id: "long-sleep", text: "People on the east culvert won't wake. The koi stopped coming up that culvert first." },
          },
          {
            npc: "I don't believe in omens, Mayor. I believe in water.",
            checks: [
              {
                lens: "LEDGER", difficulty: 10,
                pass: {
                  npc: "She pulls a water-stained ledger from her bag. \"The flood year. Before the Drowned Quarter went under, the record says the koi left its wells. The sleep came first. Then the water.\"",
                  clue: { id: "drowned-koi", text: "Before the Drowned Quarter flooded, the koi left its wells. The sleep came first, then the water." },
                },
                fail: { npc: "\"Find me the old flood records, if anyone kept them.\"" },
              },
            ],
            choices: [
              { text: "Wardstones around the wells. Keep whatever this is out.", depth: 1, effects: [{ type: "stance", ward: 1 }], reply: "\"Out?\" Maren says. \"Mayor, I think what we need is the thing that left.\"" },
              { text: "Then we give the koi deep water of their own.", depth: 1, effects: [{ type: "stance", kin: 1 }, { type: "flag", value: "maren-cistern" }], reply: "\"A cistern they can trust,\" she says. \"Yes. Start there.\"" },
            ],
          },
        ],
        onEnd: [{ type: "flag", value: "heard-maren-sleep" }],
      },
      {
        id: "maren-idle",
        title: "Rounds",
        priority: -1,
        repeatable: true,
        exchanges: [
          {
            npc: "Rounds are quiet tonight. I'll send for you if that changes.",
            choices: [{ text: "Thank you, Doctor.", depth: 0, end: true }],
          },
        ],
      },
    ],
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
