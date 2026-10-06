// wordList.js — Word bank for Skribble drawing game (~150+ common nouns)

const WORDS = [
  // Animals
  'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'shark', 'tiger',
  'lion', 'bear', 'rabbit', 'horse', 'cow', 'pig', 'sheep', 'chicken', 'duck',
  'eagle', 'owl', 'parrot', 'snake', 'turtle', 'frog', 'butterfly', 'bee',
  'ant', 'spider', 'octopus', 'crab', 'lobster', 'jellyfish', 'whale', 'zebra',
  'gorilla', 'panda', 'koala', 'kangaroo', 'crocodile', 'flamingo', 'peacock',

  // Food & Drink
  'pizza', 'burger', 'sandwich', 'sushi', 'taco', 'hotdog', 'pasta', 'noodles',
  'cake', 'cookie', 'donut', 'icecream', 'chocolate', 'candy', 'popcorn',
  'apple', 'banana', 'strawberry', 'watermelon', 'pineapple', 'orange', 'lemon',
  'grapes', 'cherry', 'peach', 'carrot', 'broccoli', 'potato', 'tomato',
  'coffee', 'tea', 'juice', 'milkshake', 'lemonade',

  // Objects & Household
  'chair', 'table', 'lamp', 'clock', 'mirror', 'bed', 'pillow', 'blanket',
  'sofa', 'bathtub', 'toilet', 'shower', 'sink', 'fridge', 'microwave', 'oven',
  'toaster', 'blender', 'kettle', 'vacuum', 'broom', 'bucket', 'ladder',
  'hammer', 'screwdriver', 'scissors', 'needle', 'thread', 'button', 'zipper',

  // Vehicles & Transport
  'car', 'truck', 'bus', 'bicycle', 'motorcycle', 'airplane', 'helicopter',
  'rocket', 'boat', 'ship', 'submarine', 'train', 'skateboard', 'scooter',
  'ambulance', 'firetruck', 'tractor', 'tank',

  // Nature & Weather
  'tree', 'flower', 'grass', 'mountain', 'volcano', 'island', 'beach', 'ocean',
  'river', 'lake', 'waterfall', 'cloud', 'rainbow', 'lightning', 'snowflake',
  'sun', 'moon', 'star', 'comet', 'planet', 'cactus', 'mushroom', 'leaf',

  // Sports & Activities
  'football', 'basketball', 'tennis', 'baseball', 'volleyball', 'golf',
  'swimming', 'surfing', 'skiing', 'boxing', 'wrestling', 'archery', 'bowling',
  'fishing', 'camping', 'dancing', 'singing', 'painting', 'running', 'jumping',

  // Places & Buildings
  'house', 'castle', 'tower', 'bridge', 'church', 'hospital', 'school',
  'library', 'museum', 'stadium', 'airport', 'lighthouse', 'windmill',
  'igloo', 'tent', 'pyramid', 'skyscraper',

  // Clothing & Accessories
  'hat', 'cap', 'glasses', 'ring', 'necklace', 'watch', 'shoe', 'boot',
  'glove', 'scarf', 'umbrella', 'backpack', 'purse', 'crown', 'mask',

  // Technology & Media
  'phone', 'computer', 'camera', 'television', 'radio', 'headphones',
  'keyboard', 'mouse', 'printer', 'robot', 'satellite', 'telescope',

  // Misc & Fun
  'ghost', 'dragon', 'unicorn', 'alien', 'wizard', 'pirate', 'ninja',
  'trophy', 'medal', 'flag', 'map', 'compass', 'magnifier', 'key',
  'lock', 'candle', 'lantern', 'firework', 'balloon', 'kite', 'boomerang',
];

/**
 * Pick n unique random words from the word list.
 * @param {number} n
 * @returns {string[]}
 */
function pickWords(n = 3) {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

module.exports = { WORDS, pickWords };
