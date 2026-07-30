/**
 * Word Lock board generation. Letters come from generalized Boggle dice rather
 * than independent frequency sampling: independent draws have high variance,
 * so a large grid reliably grows a vowel desert somewhere, while each die
 * contributes a guaranteed spread. Two local constraints then repair the
 * specific failure modes that make a region unplayable.
 */
import { hashSeed, mulberry32 } from "../../random";
import {
  MAX_RARE_PER_BLOCK,
  MAX_SIDE,
  MIN_SIDE,
  RARE_LETTERS,
  TILES_PER_PLAYER,
} from "./tuning";

export const VOWELS = "AEIOU";

/**
 * The standard 16 Boggle dice. The die whose sixth face is Qu carries E
 * instead: a bare Q is a dead square, and a multi-character tile would make a
 * tile's letter a string everywhere it is handled.
 */
const DICE: readonly string[] = [
  "AAEEGN",
  "ABBJOO",
  "ACHOPS",
  "AFFKPS",
  "AOOTTW",
  "CIMOTU",
  "DEILRX",
  "DELRVY",
  "DISTTY",
  "EEGHNW",
  "EEINSU",
  "EHRTVW",
  "EIOSST",
  "ELRTTY",
  "HIMNUE",
  "HLNNRZ",
];

const COMMON = "AEIOURSTLN";

export function gridSide(playerCount: number): number {
  const ideal = Math.round(Math.sqrt(TILES_PER_PLAYER * playerCount));
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, ideal));
}

function rollBag(side: number, random: () => number): string[] {
  const count = side * side;
  const bag: string[] = [];
  for (let i = 0; i < count; i++) bag.push(DICE[i % DICE.length]!);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag.map((die) => die[Math.floor(random() * die.length)]!);
}

function enforceVowels(
  tiles: string[],
  side: number,
  random: () => number,
): void {
  for (let row = 0; row < side - 1; row++) {
    for (let col = 0; col < side - 1; col++) {
      const block = [
        row * side + col,
        row * side + col + 1,
        (row + 1) * side + col,
        (row + 1) * side + col + 1,
      ];
      if (block.some((i) => VOWELS.includes(tiles[i]!))) continue;
      const target = block[Math.floor(random() * block.length)]!;
      tiles[target] = VOWELS[Math.floor(random() * VOWELS.length)]!;
    }
  }
}

function capRareLetters(
  tiles: string[],
  side: number,
  random: () => number,
): void {
  for (let row = 0; row + 4 <= side; row += 4) {
    for (let col = 0; col + 4 <= side; col += 4) {
      const rare: number[] = [];
      for (let r = row; r < row + 4; r++) {
        for (let c = col; c < col + 4; c++) {
          const index = r * side + c;
          if (RARE_LETTERS.includes(tiles[index]!)) rare.push(index);
        }
      }
      while (rare.length > MAX_RARE_PER_BLOCK) {
        const index = rare.pop()!;
        tiles[index] = COMMON[Math.floor(random() * COMMON.length)]!;
      }
    }
  }
}

export function generateGrid(side: number, seed: string): string {
  const random = mulberry32(hashSeed(seed));
  const tiles = rollBag(side, random);
  enforceVowels(tiles, side, random);
  capRareLetters(tiles, side, random);
  return tiles.join("");
}

export function rerollLetter(
  seed: string,
  epoch: number,
  index: number,
): string {
  const random = mulberry32(hashSeed(`${seed}:${epoch}:${index}`));
  const die = DICE[Math.floor(random() * DICE.length)]!;
  return die[Math.floor(random() * die.length)]!;
}
