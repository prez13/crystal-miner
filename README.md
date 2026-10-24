# ◆ Crystal Miner — a game to build together

A complete, playable **2D pixel-art cave adventure** written in plain HTML, CSS and JavaScript. Explore caves, mine rocks, collect crystals, fight monsters, and unlock weapons and abilities through a branching skill tree. Designed for a parent and child to customize together.

**No frameworks, paid subscriptions, GitHub Copilot, or server required.**

## Play it locally (Windows / Mac / Linux)

1. Download and extract the project ZIP.
2. Open the extracted `crystal-miner` directory.
3. Double-click **`index.html`** to open it in Chrome, Edge or Firefox.
4. Click **Start adventure**. That's it!

The game works even without an internet connection. Some font styles use online fonts when available, but system fonts work offline.

If you want to edit it with your son, open the `crystal-miner` folder in **VS Code**, edit a file, **save**, then refresh the browser. No `npm install`, build or terminal is needed to play.

## How to play

| Action | Keyboard | Touch / mouse |
|---|---|---|
| Move | Arrow keys or WASD | On-screen direction buttons |
| Attack / mine | Space | Attack button |
| Select pickaxe, sword or bow | 1, 2, 3 | Weapon buttons |
| Open skill tree | T | Skill tree button |
| Close skill tree | T or Escape | Back button |

**Goal:** Collect all **ground crystals** in each level to unlock the golden exit. Navigate to the exit to finish. Gray rocks block movement until you mine them with the **pickaxe**. Monsters follow you when you're nearby: face them before attacking, and avoid getting cornered!

## Crystals & skill tree

- Each ground crystal collected adds **1 crystal to your bag** and counts toward opening the exit.
- Each monster defeated also adds **1 bonus crystal** to your bag. Monster bonuses do **not** count toward the exit requirement.
- Your bag is **banked only when you complete a level**. If you die, you lose the current bag (but not your banked crystals or previously unlocked skills).
- Spend **banked crystals** any time from the Skill Tree panel. Unlocks are permanent, and progress is stored in your browser's `localStorage`.

| Branch | Unlock | Cost | Requires | Effect |
|---|---|---:|---|---|
| Sword | Iron Sword | ◆ 5 | — | Wide attack, deals 2 damage |
| Sword | Blade Fury | ◆ 11 | Iron Sword | Longer reach and +1 damage |
| Bow | Crystal Bow | ◆ 7 | — | Ranged attack |
| Bow | Piercing Arrows | ◆ 11 | Crystal Bow | +1 damage, hits up to 2 monsters |
| Survival | Extra Hearts | ◆ 6 | — | +2 maximum hearts |
| Survival | Crystal Healing | ◆ 10 | Extra Hearts | Heal 1 heart after every 3 monster defeats |

Three handcrafted cave levels: **Emerald Hollow**, **Amethyst Depths**, and **The Crystal Heart** (with a stone golem!). You can replay after victory and work toward unlocking the whole skill tree.

## File structure

```
crystal-miner/
├── index.html             Game UI, HUD, skill-tree dialog
├── styles.css             Fonts, colors, layout, mobile controls
├── levels.js              Three levels: walls, rocks, gems, enemies
├── game.js                Controls, battle logic, monsters, drawing, skills
├── tests/
│   └── levels.test.cjs    Checks maps and goal accessibility
├── docs/
│   └── BUILD_TOGETHER.md  Your first father-and-son programming session
└── README.md
```

## Change something together in 5 minutes

Open `levels.js`, find the section for **Emerald Hollow** and change the crystal positions under `crystals: [...]`. For example, `[5, 2]` is grid column 5, row 2. Refresh the browser and choose Reset save if you want to restart from the beginning.

Alternatively, find the `MONSTERS` constants at the top of `game.js` and change a slime's `hp: 2` to `hp: 1` to make them easier. Refresh and retry the level to load the new settings.

For more guided changes see **`docs/BUILD_TOGETHER.md`**.

## Publish on GitHub Pages

1. Sign in to your personal GitHub account and create a **public** repository named `crystal-miner`. Do not initialize it with a README.
2. Install [Git](https://git-scm.com/downloads) if necessary, then open VS Code with this folder and open **Terminal → New Terminal**.
3. Execute the following commands, replacing `YOUR_USERNAME`:

```sh
git init
git branch -M main
git add .
git commit -m "First playable Crystal Miner"
git remote add origin https://github.com/YOUR_USERNAME/crystal-miner.git
git push -u origin main
```

If Git requests an identity, configure your name/email using `git config --global user.name "Your Name"` and `git config --global user.email "your-email@example.com"`, then retry commit. GitHub may prompt you to authenticate in the browser.

4. In the GitHub repository, navigate to **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**. Select **main** and **/(root)**, then Save.
6. The public URL will be **`https://YOUR_USERNAME.github.io/crystal-miner/`** once GitHub Pages has deployed.
7. Future updates: commit and push changes, and Pages will update the site.

> Do not commit photos, real names, addresses, credentials or other private information to a public repository. GitHub Pages hosts the game, but doesn't synchronize its local save data across users or devices.

## Optional automated map tests

If you happen to have Node.js installed, open a terminal in this folder and run:

```sh
node --test tests/levels.test.cjs
```

This verifies that each generated level has correctly bounded terrain, reachable crystals and exit (assuming you can mine rocks), safe monster spawn locations, and independent level state. **Node.js is not needed to run the game.**

## Known limits of v0.1

- The game has three handcrafted levels. There is no procedural generation yet.
- Skills, crystal balance and progress are local to the browser. Clearing browser site data erases the save. Some browsers restrict storage on `file://`; hosting on GitHub Pages is more reliable.
- There is no sound, multiplayer, real-time cloud save or account system.
- Players can move with on-screen buttons on touch devices; a laptop/desktop offers the best experience.
- The artwork is generated using Canvas shapes, so you can change it without acquiring external images or textures.

**Next development milestone:** add a level editor so your son can build his own cave layouts in the browser!
