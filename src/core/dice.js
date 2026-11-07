// systems/dice.js — Skill check resolution (Disco Elysium-style)
//
// Formula: deptLevel * 3 + 2d6 >= difficulty
// Pass = rare insight revealed. Fail = different content, never nothing.

export function rollCheck(deptLevel, difficulty) {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const roll = deptLevel * 3 + d1 + d2;
  const passed = roll >= difficulty;

  return {
    passed,
    roll,
    target: difficulty,
    base: deptLevel * 3,
    dice: [d1, d2],
    margin: roll - difficulty,
  };
}

// Dice unicode faces for UI
export const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
