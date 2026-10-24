# First coding session: build Crystal Miner together

**Goal:** Make one small change that your son can immediately see in the game.

### Part 1 — Play and invent (10–15 minutes)

1. Play the first level without looking at any code.
2. Try the pickaxe on rocks, battle two slimes, collect crystals and open the exit.
3. Open the Skill Tree. Choose which branch you both want to unlock first.
4. Ask: *What would make this cave cooler?* Write down three ideas in a notebook.

### Part 2 — Change your first level (10–15 minutes)

1. Open `levels.js` in VS Code.
2. Find `name: 'Emerald Hollow'`.
3. Look at `crystals: [[5, 2], ...]`. Each pair `[x, y]` is a position on the map.
4. Move one gem to another empty coordinate: for example change `[5, 2]` to `[4, 2]`.
5. Save the file (`Ctrl+S`). Refresh the game. Start/retry the first level.
6. Confirm the gem moved. Ask your son to predict what will happen *before* each change.

### Part 3 — Invent a monster (10–15 minutes)

1. Open `game.js` and find the `MONSTERS` constants near the top.
2. Change `slime: { hp: 2, ... }` to have `hp: 1`.
3. Refresh and play. Can you defeat a slime in one strike now?
4. Restore `hp: 2`, or experiment with `speed`. **Smaller speed means faster monsters!**

### Part 4 — Change weapon prices (5 minutes)

1. In `game.js` find `const SKILLS = [`.
2. Change `price: 5` on Iron Sword to `price: 4`.
3. Refresh and open the Skill Tree. Discuss how reward prices affect gameplay.

### Part 5 — Save your work (5 minutes)

If you have Git set up:

```sh
git add .
git commit -m "Move crystals and balance slimes"
git push
```

You can always use Git to undo mistakes. A good development rule: **make a small change, test it, save it, and only then make the next change.**

### Ideas for upcoming weekends

- **Pixel artist:** redesign the monsters in `drawMonster()` with different colored rectangles.
- **Level designer:** add a fourth level in `levels.js` and place a new cave boss.
- **Game designer:** make a new skill that increases movement speed or pickaxe damage.
- **Engineer:** add a mini-map, gold chests, or a cave generator.
- **Tester:** find and document three ways the game can behave unexpectedly, and fix one.

Parent's role: help with unfamiliar syntax and debugging. Child's role: make decisions, predict outcomes, test changes, and eventually write small pieces of code.
