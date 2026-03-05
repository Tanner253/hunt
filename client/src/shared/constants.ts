export const TILE_SIZE = 60;
export const PLAYER_RADIUS = 20;
export const VISION_RADIUS = 500;
export const SEEKER_VISION_RADIUS = 450;
export const PLAYER_SPEED = 180;
export const SEEKER_SPEED = 200;
export const SEEKER_BOOST_SPEED = 300;
export const TICK_RATE = 20;
export const ROUND_TIME = 120;
export const HIDE_TIME = 15;

export const MAX_LOBBIES = 10;
export const MAX_PLAYERS_PER_LOBBY = 10;
export const FREE_LOBBY_MAX_PLAYERS = 25;
export const MIN_PLAYERS_TO_START = 2;

export const COLORS: Record<string, { primary: string; shadow: string; visor: string }> = {
  Seeker:   { primary: '#C51111', shadow: '#7A0838', visor: '#93B6C9' },
  Blue:     { primary: '#132ED1', shadow: '#09158E', visor: '#93B6C9' },
  Green:    { primary: '#117F2D', shadow: '#0A4D1A', visor: '#93B6C9' },
  Pink:     { primary: '#ED54BA', shadow: '#AB3B85', visor: '#93B6C9' },
  Orange:   { primary: '#EF7D0D', shadow: '#B35A08', visor: '#93B6C9' },
  Yellow:   { primary: '#F5F557', shadow: '#C3C333', visor: '#93B6C9' },
  Black:    { primary: '#3F474E', shadow: '#1E2326', visor: '#93B6C9' },
  White:    { primary: '#D6E0F0', shadow: '#8394BF', visor: '#93B6C9' },
  Purple:   { primary: '#6B2FBB', shadow: '#3B177C', visor: '#93B6C9' },
  Brown:    { primary: '#71491E', shadow: '#3E250A', visor: '#93B6C9' },
  Cyan:     { primary: '#38FEDB', shadow: '#24A891', visor: '#93B6C9' },
  Lime:     { primary: '#50EF39', shadow: '#2EAF21', visor: '#93B6C9' },
  Maroon:   { primary: '#6B2C2C', shadow: '#3E1515', visor: '#93B6C9' },
  Rose:     { primary: '#EC7578', shadow: '#B74B4D', visor: '#93B6C9' },
  Banana:   { primary: '#F0E68C', shadow: '#C4BC5D', visor: '#93B6C9' },
  Gray:     { primary: '#8C8C8C', shadow: '#5A5A5A', visor: '#93B6C9' },
  Tan:      { primary: '#D2B48C', shadow: '#A58860', visor: '#93B6C9' },
  Coral:    { primary: '#FF6F61', shadow: '#CC4B3E', visor: '#93B6C9' },
  Olive:    { primary: '#808000', shadow: '#525200', visor: '#93B6C9' },
  Teal:     { primary: '#008080', shadow: '#005252', visor: '#93B6C9' },
  Navy:     { primary: '#000080', shadow: '#000052', visor: '#93B6C9' },
  Peach:    { primary: '#FFDAB9', shadow: '#CCAB8A', visor: '#93B6C9' },
  Lavender: { primary: '#E6E6FA', shadow: '#B0B0CC', visor: '#93B6C9' },
  Mint:     { primary: '#98FF98', shadow: '#6ACC6A', visor: '#93B6C9' },
  Gold:     { primary: '#FFD700', shadow: '#CCAB00', visor: '#93B6C9' },
};

export const PLAYER_COLORS = [
  'Blue', 'Green', 'Pink', 'Orange', 'Yellow',
  'Black', 'White', 'Purple', 'Brown', 'Cyan',
  'Lime', 'Maroon', 'Rose', 'Banana', 'Gray',
  'Tan', 'Coral', 'Olive', 'Teal', 'Navy',
  'Peach', 'Lavender', 'Mint', 'Gold',
];

export const MAP_DEFAULT = [
  '##################################################',
  '#................................................#',
  '#.#########.########..########..########.#######.#',
  '#.#.......#.#......#..#......#..#......#.#.....#.#',
  '#.#.#####.#.#.####.#..#.####.#..#.####.#.#.###.#.#',
  '#.#.#...#.#.#.#..#.#..#.#..#.#..#.#..#.#.#.#.#.#.#',
  '#.###.###.#.###..###..###..###..###..###.###.###.#',
  '#.....#..........................................#',
  '#######.####.##############.##############.#######',
  '#............#............#.#............#.......#',
  '#.#######.####.##########.#.#.##########.#######.#',
  '#.#.....#......#........#.#.#.#........#.......#.#',
  '#.#.###.########.######.#.#.#.#.######.#######.#.#',
  '#.#.#.#..........#....#.#.#.#.#.#....#.......#.#.#',
  '#.#.#.############.##.#.#.#.#.#.#.##.#######.#.#.#',
  '#.#.#..............#..#.#.#.#.#.#..#.......#.#.#.#',
  '#.###.##############..###.#.#.###..#########.###.#',
  '#.........................#.#....................#',
  '######################.####.####.#################',
  '#................................................#',
  '#.#####.######.######.#######.######.######.####.#',
  '#.#...#.#....#.#....#.#.....#.#....#.#....#.#..#.#',
  '#.#.#.#.#.##.#.#.##.#.#.###.#.#.##.#.#.##.#.#.##.#',
  '#.#.#.#.#..#.#.#..#.#.#...#.#.#..#.#.#..#.#.#....#',
  '#.###.###..###.####.###...###.####.###..###.####.#',
  '#................................................#',
  '#................................................#',
  '##################################################',
];

export const EMOTES = [
  { id: 'wave', emoji: '\u{1F44B}', name: 'Wave' },
  { id: 'laugh', emoji: '\u{1F602}', name: 'Laugh' },
  { id: 'scared', emoji: '\u{1F631}', name: 'Scared' },
  { id: 'taunt', emoji: '\u{1F60E}', name: 'Taunt' },
  { id: 'think', emoji: '\u{1F914}', name: 'Think' },
  { id: 'cry', emoji: '\u{1F622}', name: 'Cry' },
  { id: 'angry', emoji: '\u{1F621}', name: 'Angry' },
  { id: 'heart', emoji: '\u{2764}\u{FE0F}', name: 'Heart' },
];
