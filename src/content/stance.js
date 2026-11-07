// content/stance.js — where the town stands with the old ones.
//
// Not a score. Three pulls, and the town sits somewhere between them:
//   kin   live alongside them, give them room, keep the old courtesies
//   ward  keep them out, at a distance, behind iron and stone
//   bind  use them: their light, their water, their hunger
// Buildings and choices in conversation add weight to a pull. The town's position is each
// pull's share of the total, so it drifts rather than jumps, and it can always be pulled back.

export const STANCES = {
  kin: { name: "Kinship", color: "#d8b46a", line: "We live alongside them." },
  ward: { name: "Distance", color: "#8c8f99", line: "We keep them out." },
  bind: { name: "Dominion", color: "#9b7fc4", line: "We put them to use." },
};

export const STARTING_STANCE = { kin: 1, ward: 1, bind: 1 };

// Which pull leads, and by how much, as a short reading for the town's ledger.
export function readStance(s) {
  const total = s.kin + s.ward + s.bind || 1;
  const shares = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v / total]));
  const [lead, share] = Object.entries(shares).sort((a, b) => b[1] - a[1])[0];
  if (share < 0.42) return { lead: null, shares, label: "Undecided", line: "The town has not chosen yet." };
  return { lead, shares, label: STANCES[lead].name, line: STANCES[lead].line };
}
