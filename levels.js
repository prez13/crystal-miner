/* World layouts and rules are deliberately kept separate so young developers can edit them. */
(function (root, factory) {
  const levels = factory();
  if (typeof module === 'object' && module.exports) module.exports = levels;
  if (root) root.CrystalLevels = levels;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 23;
  const HEIGHT = 15;
  const SPAWN = [2, 2];
  const EXIT = [20, 12];

  const SPECS = [
    {
      name: 'Emerald Hollow', subtitle: 'The adventure begins', colors: ['#172c30', '#223e37'],
      walls: [[8, 3, 1, 4], [12, 5, 5, 1], [15, 9, 1, 3], [4, 8, 3, 1]],
      rocks: [[6, 3], [7, 3], [10, 7], [11, 7], [12, 7], [5, 11], [16, 8], [17, 8]],
      crystals: [[5, 2], [12, 3], [19, 4], [3, 10], [11, 11], [18, 12]],
      monsters: [{ x: 12, y: 8, type: 'slime' }, { x: 18, y: 10, type: 'slime' }]
    },
    {
      name: 'Amethyst Depths', subtitle: 'Faster monsters, richer caves', colors: ['#261d35', '#332742'],
      walls: [[6, 4, 1, 6], [10, 2, 1, 4], [13, 8, 1, 5], [16, 3, 1, 5], [3, 11, 6, 1]],
      rocks: [[4, 5], [5, 5], [9, 9], [10, 9], [11, 9], [14, 5], [15, 5], [18, 9], [19, 9], [18, 12]],
      crystals: [[3, 4], [8, 3], [13, 2], [19, 3], [19, 7], [11, 7], [8, 12], [17, 12]],
      monsters: [{ x: 11, y: 3, type: 'bat' }, { x: 17, y: 6, type: 'bat' }, { x: 9, y: 10, type: 'slime' }, { x: 18, y: 11, type: 'slime' }]
    },
    {
      name: 'The Crystal Heart', subtitle: 'Defeat the golem of the deep', colors: ['#292629', '#393034'],
      walls: [[7, 2, 1, 7], [11, 5, 1, 7], [15, 2, 1, 6], [18, 8, 1, 5], [3, 11, 5, 1]],
      rocks: [[4, 4], [5, 4], [6, 4], [9, 6], [10, 6], [12, 9], [13, 9], [14, 9], [17, 4], [18, 4], [19, 4], [16, 11]],
      crystals: [[4, 2], [9, 2], [13, 3], [19, 2], [20, 7], [16, 9], [13, 12], [9, 12], [4, 9], [3, 6]],
      monsters: [{ x: 10, y: 4, type: 'bat' }, { x: 17, y: 6, type: 'bat' }, { x: 6, y: 12, type: 'slime' }, { x: 14, y: 11, type: 'slime' }, { x: 19, y: 11, type: 'golem' }]
    }
  ];

  function buildLevel(index) {
    const spec = SPECS[index];
    if (!spec) throw new RangeError('Unknown level ' + index);
    const grid = Array.from({ length: HEIGHT }, (_, y) =>
      Array.from({ length: WIDTH }, (_, x) => x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1 ? '#' : '.')
    );
    for (const [bx, by, w, h] of spec.walls) {
      for (let y = by; y < by + h; y++) for (let x = bx; x < bx + w; x++) grid[y][x] = '#';
    }
    for (const [x, y] of spec.rocks) grid[y][x] = 'R';
    for (const [x, y] of spec.crystals) grid[y][x] = 'C';
    grid[EXIT[1]][EXIT[0]] = 'E';
    grid[SPAWN[1]][SPAWN[0]] = '.';
    return {
      width: WIDTH, height: HEIGHT, name: spec.name, subtitle: spec.subtitle,
      colors: spec.colors.slice(), grid, spawn: { x: SPAWN[0], y: SPAWN[1] },
      exit: { x: EXIT[0], y: EXIT[1] },
      monsters: spec.monsters.map(m => ({ ...m })),
      initialCrystals: spec.crystals.length
    };
  }
  return { WIDTH, HEIGHT, SPECS, buildLevel };
});
