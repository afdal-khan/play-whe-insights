// This file defines the "Thematic Groups" for the 36 marks.
// This is the core logic for our new "Thematic Analyzer" report.

// We define the theme names
export const THEME_NAMES = {
  PEOPLE: 'People',
  ANIMALS: 'Animals',
  THINGS: 'Things & Other',
};

// We create a "map" that links every number to its theme.
// PLEASE REVIEW THIS LIST!
export const THEME_MAP = {
  // People (10)
  2: THEME_NAMES.PEOPLE, // Old Lady
  4: THEME_NAMES.PEOPLE, // Dead Man
  5: THEME_NAMES.PEOPLE, // Parson Man
  12: THEME_NAMES.PEOPLE, // King
  15: THEME_NAMES.PEOPLE, // Sick Woman
  16: THEME_NAMES.PEOPLE, // Jamette
  24: THEME_NAMES.PEOPLE, // Queen
  29: THEME_NAMES.PEOPLE, // Opium Man
  31: THEME_NAMES.PEOPLE, // Parson Wife
  34: THEME_NAMES.PEOPLE, // Blind Man

  // Animals (17)
  1: THEME_NAMES.ANIMALS, // Centipede
  7: THEME_NAMES.ANIMALS, // Hog
  8: THEME_NAMES.ANIMALS, // Tiger
  9: THEME_NAMES.ANIMALS, // Cattle
  10: THEME_NAMES.ANIMALS, // Monkey
  11: THEME_NAMES.ANIMALS, // Corbeau
  13: THEME_NAMES.ANIMALS, // Crapaud
  17: THEME_NAMES.ANIMALS, // Pigeon
  19: THEME_NAMES.ANIMALS, // Horse
  20: THEME_NAMES.ANIMALS, // Dog
  22: THEME_NAMES.ANIMALS, // Rat
  25: THEME_NAMES.ANIMALS, // Morrocoy
  26: THEME_NAMES.ANIMALS, // Fowl
  27: THEME_NAMES.ANIMALS, // Little Snake
  28: THEME_NAMES.ANIMALS, // Red Fish
  30: THEME_NAMES.ANIMALS, // House Cat
  32: THEME_NAMES.ANIMALS, // Shrimp
  33: THEME_NAMES.ANIMALS, // Spider
  35: THEME_NAMES.ANIMALS, // Big Snake
  36: THEME_NAMES.ANIMALS, // Donkey

  // Things & Other (9)
  3: THEME_NAMES.THINGS, // Carriage
  6: THEME_NAMES.THINGS, // Belly
  14: THEME_NAMES.THINGS, // Money
  18: THEME_NAMES.THINGS, // Water Boat
  21: THEME_NAMES.THINGS, // Mouth
  23: THEME_NAMES.THINGS, // House
};

// Create a list of the theme names for easy mapping
export const THEMES_LIST = [
    THEME_NAMES.PEOPLE,
    THEME_NAMES.ANIMALS,
    THEME_NAMES.THINGS,
];