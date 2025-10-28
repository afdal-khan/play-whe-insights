// This is our central "source of truth" for all the Play Whe marks.
// We can use this data across the entire application.

export const PLAY_WHE_MARKS = {
  1: 'Centipede',
  2: 'Old Lady',
  3: 'Carriage',
  4: 'Dead Man',
  5: 'Parson Man',
  6: 'Belly',
  7: 'Hog',
  8: 'Tiger',
  9: 'Cattle',
  10: 'Monkey',
  11: 'Corbeau',
  12: 'King',
  13: 'Crapaud',
  14: 'Money',
  15: 'Sick Woman',
  16: 'Jamette',
  17: 'Pigeon',
  18: 'Water Boat',
  19: 'Horse',
  20: 'Dog',
  21: 'Mouth',
  22: 'Rat',
  23: 'House',
  24: 'Queen',
  25: 'Morrocoy',
  26: 'Fowl',
  27: 'Little Snake',
  28: 'Red Fish',
  29: 'Opium Man',
  30: 'House Cat',
  31: 'Parson Wife',
  32: 'Shrimp',
  33: 'Spider',
  34: 'Blind Man',
  35: 'Big Snake',
  36: 'Donkey'
};

// We also create an array version for easier mapping,
// converting the object {1: 'Centipede'} to [{num: 1, mark: 'Centipede'}]
// This code doesn't need to change; it builds itself from the object above.
export const MARKS_LIST = Object.entries(PLAY_WHE_MARKS).map(([num, mark]) => {
  return {
    num: parseInt(num, 10), // Convert the string key '1' to a number 1
    mark: mark
  };
});

