const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SPECS, WIDTH, HEIGHT, buildLevel } = require('../levels.js');

test('The game has three distinct levels', () => {
  assert.equal(SPECS.length, 3);
  assert.equal(new Set(SPECS.map(s => s.name)).size, SPECS.length);
});

for (let level = 0; level < SPECS.length; level++) {
  test(`Level ${level + 1} is well-formed and has accessible objectives`, () => {
    const map = buildLevel(level);
    assert.equal(map.grid.length, HEIGHT);
    assert.ok(map.grid.every(row => row.length === WIDTH));
    for (let x = 0; x < WIDTH; x++) {
      assert.equal(map.grid[0][x], '#');
      assert.equal(map.grid[HEIGHT - 1][x], '#');
    }
    for (let y = 0; y < HEIGHT; y++) {
      assert.equal(map.grid[y][0], '#');
      assert.equal(map.grid[y][WIDTH - 1], '#');
    }
    assert.equal(map.grid[map.spawn.y][map.spawn.x], '.');
    assert.equal(map.grid[map.exit.y][map.exit.x], 'E');
    assert.ok(map.initialCrystals >= 5);
    assert.equal(map.grid.flat().filter(v => v === 'C').length, map.initialCrystals);
    const visited = new Set([`${map.spawn.x},${map.spawn.y}`]);
    const queue = [map.spawn];
    for (const pos of queue) {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const x = pos.x + dx, y = pos.y + dy;
        if (!map.grid[y] || !map.grid[y][x] || map.grid[y][x] === '#') continue;
        // 'R' blocks are mineable and thus traversable after mining.
        const key = `${x},${y}`;
        if (!visited.has(key)) { visited.add(key); queue.push({ x, y }); }
      }
    }
    assert.ok(visited.has(`${map.exit.x},${map.exit.y}`), 'exit is reachable');
    for (let y=0; y<HEIGHT; y++) for (let x=0; x<WIDTH; x++) {
      if (map.grid[y][x] === 'C') assert.ok(visited.has(`${x},${y}`), `crystal at ${x},${y} reachable`);
    }
    for (const m of map.monsters) {
      assert.equal(map.grid[m.y][m.x], '.', `monster ${m.type} must spawn on floor`);
      assert.ok(visited.has(`${m.x},${m.y}`));
    }
  });
  test(`Building level ${level + 1} twice returns fresh independent maps`, () => {
    const first = buildLevel(level), second = buildLevel(level);
    first.grid[2][3] = '?';
    assert.notEqual(second.grid[2][3], '?');
  });
}
