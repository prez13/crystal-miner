/* Crystal Miner v0.1: no frameworks, no build step, just a browser. */
(() => {
  'use strict';
  const { WIDTH, HEIGHT, SPECS, buildLevel } = window.CrystalLevels;
  const TILE = 32;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const $ = (id) => document.getElementById(id);
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEY_TO_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  const MONSTERS = {
    slime: { hp: 2, speed: 790, damage: 1 },
    bat: { hp: 1, speed: 530, damage: 1 },
    golem: { hp: 7, speed: 950, damage: 2 }
  };
  const SKILLS = [
    { id: 'sword', name: 'Iron Sword', icon: '⚔', price: 5, requires: null, desc: 'Unlock a powerful three-tile-wide melee attack.' },
    { id: 'fury', name: 'Blade Fury', icon: '✹', price: 11, requires: 'sword', desc: 'Sword attacks reach farther and deal +1 damage.' },
    { id: 'bow', name: 'Crystal Bow', icon: '➶', price: 7, requires: null, desc: 'Fire crystal arrows across the cave.' },
    { id: 'piercing', name: 'Piercing Arrows', icon: '↠', price: 11, requires: 'bow', desc: 'Arrows deal +1 damage and can pierce two monsters.' },
    { id: 'vitality', name: 'Extra Hearts', icon: '♥', price: 6, requires: null, desc: 'Increase your maximum health by two hearts.' },
    { id: 'healing', name: 'Crystal Healing', icon: '✚', price: 10, requires: 'vitality', desc: 'Restore one heart after every three monsters defeated.' }
  ];
  const SAVE_KEY = 'crystal-miner-v01';

  function loadSave() {
    const defaults = { banked: 0, currentLevel: 0, completed: 0, upgrades: [] };
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!parsed || typeof parsed !== 'object') return defaults;
      return {
        banked: Number.isSafeInteger(parsed.banked) ? Math.max(0, Math.min(99999, parsed.banked)) : 0,
        currentLevel: Number.isInteger(parsed.currentLevel) ? Math.max(0, Math.min(SPECS.length - 1, parsed.currentLevel)) : 0,
        completed: Number.isInteger(parsed.completed) ? Math.max(0, Math.min(SPECS.length, parsed.completed)) : 0,
        upgrades: Array.isArray(parsed.upgrades) ? parsed.upgrades.filter(x => SKILLS.some(s => s.id === x)) : []
      };
    } catch (_) { return defaults; }
  }
  let save = loadSave();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { /* e.g. restricted file:// storage */ }
  }
  const owns = (id) => save.upgrades.includes(id);
  const maxHealth = () => 5 + (owns('vitality') ? 2 : 0);
  let levelIndex = save.currentLevel;
  let world, enemies, player, remaining, inBag = 0;
  let phase = 'intro', returnPhase = 'playing';
  const pressed = new Set();
  let lastMove = 0, lastAttack = 0, lastFrame = 0, elapsed = 0;
  let particles = [], arrows = [], swings = [];
  let toastTimeout;

  function initLevel(index) {
    levelIndex = index;
    world = buildLevel(index);
    remaining = world.initialCrystals;
    inBag = 0;
    enemies = world.monsters.map((m, i) => ({ ...m, hp: MONSTERS[m.type].hp, maxHp: MONSTERS[m.type].hp, lastStep: 0, id: i }));
    player = { x: world.spawn.x, y: world.spawn.y, dir: 'right', weapon: 'pickaxe', maxHp: maxHealth(), hp: maxHealth(), hurtAt: -3000, kills: 0 };
    arrows = []; particles = []; swings = [];
    pressed.clear(); lastAttack = 0; lastMove = 0;
    updateHUD();
  }

  function updateHUD() {
    $('levelName').textContent = `${levelIndex + 1}. ${world.name}`;
    $('hearts').textContent = '♥ '.repeat(player.hp).trim() + ' ' + '♡ '.repeat(Math.max(0, player.maxHp - player.hp)).trim();
    $('hearts').setAttribute('aria-label', `Health: ${player.hp} of ${player.maxHp}`);
    $('bagCrystals').textContent = '◆ ' + inBag;
    $('bankCrystals').textContent = '◆ ' + save.banked;
    $('progressLabel').textContent = `Level ${levelIndex + 1} of ${SPECS.length}`;
    $('levelProgress').style.width = `${((levelIndex + 1) / SPECS.length) * 100}%`;
    $('crystalGoal').textContent = `${world.initialCrystals - remaining} / ${world.initialCrystals} collected`;
    $('objective').textContent = remaining === 0 ? 'The exit is OPEN! Find the golden door. ✦' : `Collect ${remaining} more crystal${remaining === 1 ? '' : 's'} to unlock the exit.`;
    for (const id of ['pickaxe', 'sword', 'bow']) {
      const btn = $('weapon-' + id);
      const locked = id !== 'pickaxe' && !owns(id);
      btn.classList.toggle('selected', player.weapon === id);
      btn.classList.toggle('locked', locked);
      btn.setAttribute('aria-label', locked ? `${id} is locked; unlock it in the skill tree` : `Select ${id}`);
      btn.title = locked ? `Unlock ${id} in the skill tree` : `Select ${id}`;
    }
  }

  function toast(text) {
    const el = $('floatingBanner');
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('visible'), 1650);
  }
  function setModal(html, wide = false) {
    $('modal').classList.toggle('wide', wide);
    $('modal').innerHTML = html;
    $('overlay').classList.remove('hidden');
    $('overlay').setAttribute('aria-hidden', 'false');
    document.body.classList.add('dialog-open');
    pressed.clear();
  }
  function closeModal() {
    $('overlay').classList.add('hidden');
    $('overlay').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('dialog-open');
  }
  const actionBtn = (text, action, primary = true) => `<button type="button" class="${primary ? 'primary-button' : 'secondary-button'}" data-action="${action}">${text}</button>`;
  function renderModalForPhase() {
    if (phase === 'playing') { closeModal(); return; }
    if (phase === 'intro') {
      setModal(`<div class="hero-icon">◆</div><div class="eyeline">A tiny pixel-art adventure</div><h2>Welcome to Crystal Miner!</h2><p>Explore ${SPECS.length} underground worlds, collect glowing gems, battle cave monsters, and unlock powerful weapons in your very own skill tree.</p><div class="instruction-grid"><div><b>WASD / arrows</b><br>Move through caves</div><div><b>SPACE</b><br>Mine rocks or attack</div><div><b>1 / 2 / 3</b><br>Switch weapons</div><div><b>T</b><br>Open skill tree</div></div><p class="note">Your progress is saved locally after each finished level. No account required.</p><div class="modal-actions">${actionBtn('▶ Start adventure', 'start')}${actionBtn('✦ Look at skill tree', 'tree', false)}</div>`);
    } else if (phase === 'dead') {
      setModal(`<div class="hero-icon">☠</div><div class="eyeline">The cave got the better of you</div><h2>Try again!</h2><p>You lost the <strong>${inBag} unbanked crystals</strong> from this run, but your banked crystals and unlocked skills are safe. You'll restart this level at full health.</p><div class="modal-actions">${actionBtn('↻ Retry level', 'retry')}${actionBtn('✦ Skill tree', 'tree', false)}</div>`);
    } else if (phase === 'cleared') {
      setModal(`<div class="hero-icon">✦</div><div class="eyeline">Level complete!</div><h2>${world.name} cleared</h2><p>You banked <strong class="toast">◆ ${inBag} crystals</strong>! Spend them on new weapons and upgrades before the next level.</p><div class="tree-balance">Banked: ◆ ${save.banked}</div><div class="modal-actions">${actionBtn('Next level →', 'next')}${actionBtn('✦ Upgrade skill tree', 'tree', false)}</div>`);
    } else if (phase === 'victory') {
      setModal(`<div class="hero-icon">🏆</div><div class="eyeline">You did it!</div><h2>Master of the Crystal Caves</h2><p>You defeated the final cave and banked <strong>◆ ${inBag}</strong> more crystals. Your upgrades and total banked crystals are saved. Play again to unlock everything!</p><div class="tree-balance">Total banked: ◆ ${save.banked}</div><div class="modal-actions">${actionBtn('▶ Play again', 'replay')}${actionBtn('✦ Skill tree', 'tree', false)}</div>`);
    } else if (phase === 'tree') renderTree();
    else if (phase === 'help') {
      setModal(`<div class="hero-icon">?</div><h2>How to play</h2><div class="instruction-grid"><div><b>WASD / arrows</b><br>Move one tile at a time</div><div><b>SPACE / Attack</b><br>Hit the tile you're facing</div><div><b>1 / 2 / 3</b><br>Pickaxe / sword / bow</div><div><b>T</b><br>Open the skill tree</div></div><p><b>Goal:</b> Collect all glowing crystals, then enter the golden exit. Monsters hurt when they reach you. The pickaxe breaks gray rocks. Swords strike several tiles; bows shoot in a straight line.</p><p><b>Currency:</b> Ground crystals and defeated monsters give you crystals in your bag. Finish the level to bank them. Only banked crystals can buy permanent skills. If you die, you lose your current bag, not your bank.</p><div class="modal-actions">${actionBtn('Got it', 'back')}</div>`);
    }
  }
  function openTree() {
    if (phase === 'tree') return;
    returnPhase = phase;
    phase = 'tree';
    renderModalForPhase();
  }
  function renderTree() {
    const cards = SKILLS.map(s => {
      const owned = owns(s.id);
      const prereq = !s.requires || owns(s.requires);
      const affordable = save.banked >= s.price;
      const canBuy = !owned && prereq && affordable;
      const reqName = s.requires ? SKILLS.find(p => p.id === s.requires).name : null;
      const buttonText = owned ? '✓ Unlocked' : !prereq ? '🔒 Requires ' + reqName : !affordable ? `Need ◆ ${s.price - save.banked} more` : `Unlock for ◆ ${s.price}`;
      return `<article class="upgrade-card ${owned ? 'owned' : canBuy ? 'available' : ''}"><div class="upgrade-name">${s.icon} ${s.name}</div><p>${s.desc}</p><div class="requires">${reqName ? '↳ After ' + reqName : '↳ Starting skill'}</div><button type="button" data-skill="${s.id}" ${canBuy ? '' : 'disabled'}>${buttonText}</button></article>`;
    }).join('');
    setModal(`<div class="eyeline">Crystal upgrades</div><h2>✦ Skill tree</h2><p>Choose your path. Sword and bow upgrades form two weapon branches; health upgrades form a survival branch. All unlocks are permanent.</p><div class="tree-balance">Banked crystals: ◆ ${save.banked}</div><div class="upgrade-grid">${cards}</div><p class="note">You can only spend banked crystals. Finish a level to deposit crystals from your bag.</p><div class="modal-actions">${actionBtn('← Back to game', 'back')}</div>`, true);
  }
  function buySkill(id) {
    const s = SKILLS.find(x => x.id === id);
    if (!s || owns(id) || save.banked < s.price || (s.requires && !owns(s.requires))) return;
    save.banked -= s.price;
    save.upgrades.push(id);
    persist();
    if (id === 'vitality') { player.maxHp += 2; player.hp += 2; }
    updateHUD(); renderTree();
    toast('Unlocked: ' + s.name);
  }

  function selectWeapon(weapon) {
    if (weapon !== 'pickaxe' && !owns(weapon)) { toast('Unlock this weapon in the skill tree!'); return; }
    player.weapon = weapon;
    updateHUD();
    toast(weapon === 'pickaxe' ? '⛏ Pickaxe equipped' : weapon === 'sword' ? '⚔ Sword equipped' : '➶ Bow equipped');
  }
  function tileAt(x, y) { return world.grid[y] && world.grid[y][x] || '#'; }
  const enemyAt = (x, y) => enemies.find(e => e.x === x && e.y === y && e.hp > 0);
  function movePlayer(dir, now) {
    if (phase !== 'playing' || now - lastMove < 128) return;
    player.dir = dir;
    const [dx, dy] = DIRS[dir];
    const x = player.x + dx, y = player.y + dy;
    const tile = tileAt(x, y);
    lastMove = now;
    if (tile === '#' || tile === 'R') {
      if (tile === 'R') toast('Face this rock and use your pickaxe!');
      return;
    }
    if (enemyAt(x, y)) { damagePlayer(1, now); return; }
    if (tile === 'E') {
      if (remaining === 0) finishLevel();
      else toast(`${remaining} crystal${remaining === 1 ? '' : 's'} left before the exit opens!`);
      return;
    }
    player.x = x; player.y = y;
    if (tile === 'C') {
      world.grid[y][x] = '.';
      remaining--; inBag++;
      burst(x, y, '#7efce2', 13);
      toast(remaining === 0 ? 'All crystals found! Find the golden exit.' : '+1 crystal ◆');
      updateHUD();
    }
  }
  function damagePlayer(amount, now) {
    if (phase !== 'playing' || now - player.hurtAt < 1050) return;
    player.hurtAt = now;
    player.hp = Math.max(0, player.hp - amount);
    burst(player.x, player.y, '#ff7b83', 10);
    updateHUD();
    if (player.hp === 0) { phase = 'dead'; renderModalForPhase(); }
    else toast(`-${amount} heart${amount > 1 ? 's' : ''}!`);
  }
  function hitEnemy(enemy, damage) {
    if (!enemy || enemy.hp <= 0) return;
    enemy.hp = Math.max(0, enemy.hp - damage);
    burst(enemy.x, enemy.y, '#f7c26d', 7);
    if (enemy.hp === 0) {
      inBag++;
      player.kills++;
      burst(enemy.x, enemy.y, '#9b9dff', 15);
      if (owns('healing') && player.kills % 3 === 0) player.hp = Math.min(player.maxHp, player.hp + 1);
      toast('Monster defeated! +1 crystal ◆');
      updateHUD();
    }
  }
  function mineRock(x, y) {
    if (tileAt(x, y) !== 'R') return false;
    world.grid[y][x] = '.';
    burst(x, y, '#c3ad93', 12);
    toast('Rock mined! ⛏');
    return true;
  }
  function attack(now = performance.now()) {
    if (phase !== 'playing') return;
    const weapon = player.weapon;
    const cooldown = weapon === 'bow' ? 560 : weapon === 'sword' ? 340 : 300;
    if (now - lastAttack < cooldown) return;
    lastAttack = now;
    const [dx, dy] = DIRS[player.dir];
    if (weapon === 'bow') {
      arrows.push({ x: player.x, y: player.y, dx, dy, steps: 0, lastStep: now - 120, pierced: 0 });
      return;
    }
    const targets = [];
    if (weapon === 'pickaxe') targets.push([player.x + dx, player.y + dy]);
    else {
      const depth = owns('fury') ? 2 : 1;
      for (let step = 1; step <= depth; step++) {
        targets.push([player.x + dx * step, player.y + dy * step]);
        targets.push([player.x + dx * step - dy, player.y + dy * step + dx]);
        targets.push([player.x + dx * step + dy, player.y + dy * step - dx]);
      }
    }
    swings = targets.map(([x, y]) => ({ x, y, life: 0.16, color: weapon === 'pickaxe' ? '#edd7a0' : '#a7c9fa' }));
    for (const [x, y] of targets) {
      if (tileAt(x, y) === '#') continue;
      const enemy = enemyAt(x, y);
      if (enemy) hitEnemy(enemy, weapon === 'sword' ? (owns('fury') ? 3 : 2) : 1);
      if (weapon === 'pickaxe') mineRock(x, y);
    }
  }
  function updateArrows(now) {
    for (const arrow of arrows) {
      if (arrow.dead || now - arrow.lastStep < 112) continue;
      arrow.lastStep = now;
      arrow.x += arrow.dx; arrow.y += arrow.dy; arrow.steps++;
      const tile = tileAt(arrow.x, arrow.y);
      if (tile === '#' || tile === 'R' || arrow.steps > 8) { arrow.dead = true; continue; }
      const enemy = enemyAt(arrow.x, arrow.y);
      if (enemy) {
        hitEnemy(enemy, owns('piercing') ? 2 : 1);
        arrow.pierced++;
        if (!owns('piercing') || arrow.pierced >= 2) arrow.dead = true;
      }
    }
    arrows = arrows.filter(a => !a.dead);
  }
  function updateMonsters(now) {
    for (const enemy of enemies) {
      if (phase !== 'playing') break;
      if (enemy.hp <= 0 || now - enemy.lastStep < MONSTERS[enemy.type].speed) continue;
      enemy.lastStep = now;
      const xdist = player.x - enemy.x, ydist = player.y - enemy.y;
      if (Math.abs(xdist) + Math.abs(ydist) > 8) continue;
      if (Math.abs(xdist) + Math.abs(ydist) === 1) { damagePlayer(MONSTERS[enemy.type].damage, now); continue; }
      const first = Math.abs(xdist) >= Math.abs(ydist) ? [Math.sign(xdist), 0] : [0, Math.sign(ydist)];
      const second = first[0] ? [0, Math.sign(ydist)] : [Math.sign(xdist), 0];
      for (const [dx, dy] of [first, second]) {
        if (!dx && !dy) continue;
        const tx = enemy.x + dx, ty = enemy.y + dy;
        if (tx === player.x && ty === player.y) { damagePlayer(MONSTERS[enemy.type].damage, now); break; }
        if (tileAt(tx, ty) === '.' && !enemyAt(tx, ty)) { enemy.x = tx; enemy.y = ty; break; }
      }
    }
  }
  function finishLevel() {
    if (phase !== 'playing') return;
    save.banked += inBag;
    save.completed = Math.max(save.completed, levelIndex + 1);
    save.currentLevel = levelIndex < SPECS.length - 1 ? levelIndex + 1 : 0;
    persist();
    phase = levelIndex === SPECS.length - 1 ? 'victory' : 'cleared';
    renderModalForPhase();
    updateHUD();
  }
  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * .25;
      const speed = 25 + Math.random() * 70;
      particles.push({ x: x * TILE + 16, y: y * TILE + 16, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .35 + Math.random() * .35, total: .7, color });
    }
  }
  function tickEffects(dt) {
    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particles = particles.filter(p => p.life > 0);
    for (const s of swings) s.life -= dt;
    swings = swings.filter(s => s.life > 0);
  }

  function seed(x, y, salt = 0) { let n = Math.imul(x + 313, 374761393) + Math.imul(y + salt + 97, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return (n ^ (n >>> 16)) >>> 0; }
  function rect(color, x, y, w, h) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  function drawFloor(x, y) {
    const px = x * TILE, py = y * TILE;
    const variant = seed(x, y) % 4;
    rect(variant === 0 ? world.colors[1] : world.colors[0], px, py, TILE, TILE);
    rect('#ffffff07', px + 1, py + 1, 30, 1);
    if (seed(x, y, 19) % 4 === 0) rect('#a5c9a91c', px + 7, py + 9, 4, 2);
    if (seed(x, y, 31) % 5 === 0) rect('#0a161831', px + 22, py + 20, 3, 3);
  }
  function drawWall(x, y) {
    const px = x * TILE, py = y * TILE;
    rect('#293a42', px, py, 32, 32);
    rect('#54646c', px + 1, py + 1, 30, 23);
    rect('#718189', px + 2, py + 2, 28, 5);
    rect('#3b4c54', px + 1, py + 25, 30, 7);
    if (seed(x, y) % 3 === 0) rect('#41545d', px + 8, py + 12, 12, 3);
    rect('#829198', px + 2, py + 1, 2, 18);
  }
  function drawRock(x, y) {
    const px = x * TILE, py = y * TILE;
    rect('#142c2c', px + 5, py + 26, 25, 5);
    rect('#7e807b', px + 5, py + 9, 23, 18);
    rect('#b7b3a2', px + 8, py + 5, 16, 7);
    rect('#9c9d94', px + 4, py + 12, 21, 8);
    rect('#666c6c', px + 21, py + 17, 8, 10);
    rect('#dad4bf', px + 9, py + 7, 7, 2);
  }
  function drawCrystal(x, y, now) {
    const px = x * TILE, py = y * TILE;
    const shift = Math.sin(now / 380 + x * 2 + y) * 2;
    ctx.save();
    ctx.shadowColor = '#55f9d3'; ctx.shadowBlur = 14;
    ctx.beginPath();ctx.moveTo(px + 16, py + 3 + shift);ctx.lineTo(px + 25, py + 14 + shift);ctx.lineTo(px + 16, py + 28 + shift);ctx.lineTo(px + 7, py + 14 + shift);ctx.closePath();ctx.fillStyle='#50e8cb';ctx.fill();
    ctx.restore();
    ctx.beginPath();ctx.moveTo(px + 16, py + 3 + shift);ctx.lineTo(px + 16, py + 28 + shift);ctx.lineTo(px + 7, py + 14 + shift);ctx.closePath();ctx.fillStyle='#168a98';ctx.fill();
    rect('#d8fff0',px+15,py+7+shift,3,9);rect('#ffffff',px+19,py+11+shift,3,3);
  }
  function drawExit(x, y, now) {
    const px = x * TILE, py = y * TILE, open = remaining === 0;
    ctx.save();ctx.shadowColor=open?'#f9db74':'#665c47';ctx.shadowBlur=open?18:2;
    rect(open ? '#c69240' : '#6c6354', px + 4, py + 2, 24, 29);
    rect(open ? '#f8d47b' : '#aaa08b', px + 7, py + 2, 18, 5);
    rect(open ? '#423123' : '#323a40', px + 9, py + 8, 14, 21);
    if (open) rect('#fbea9b', px + 18, py + 14 + Math.sin(now / 250) * 2, 3, 5);
    else rect('#8c9995',px+18,py+17,3,3);
    ctx.restore();
  }
  function drawMonster(e, now) {
    const px=e.x*TILE,py=e.y*TILE;
    ctx.save();
    if (e.type === 'slime') {
      const hop=Math.sin(now/180 + e.id*2)*2;
      rect('#09212466',px+5,py+26,23,4);
      rect('#397e6b',px+5,py+11+hop,23,16);rect('#65d6a0',px+8,py+8+hop,18,14);rect('#a6f4c1',px+10,py+9+hop,11,4);
      rect('#172e35',px+11,py+17+hop,4,5);rect('#172e35',px+22,py+17+hop,4,5);
    } else if(e.type==='bat') {
      const flutter=Math.sin(now/95+e.id*3)*4;
      rect('#7c5aba',px+3,py+10+flutter,10,10);rect('#7c5aba',px+19,py+10-flutter,10,10);
      rect('#b790e0',px+10,py+9,13,17);rect('#e8d0ff',px+12,py+17,3,3);rect('#e8d0ff',px+20,py+17,3,3);
      rect('#624784',px+4,py+7+flutter,6,7);rect('#624784',px+23,py+7-flutter,6,7);
    } else {
      rect('#32272a',px+3,py+26,27,5);rect('#a27759',px+5,py+7,22,22);rect('#d7ab73',px+8,py+4,17,12);
      rect('#8d6958',px+3,py+15,8,12);rect('#8d6958',px+23,py+15,8,12);
      rect('#ff8b62',px+11,py+14,5,4);rect('#ff8b62',px+20,py+14,5,4);
    }
    if (e.hp < e.maxHp) {rect('#26323a',px+4,py+1,24,3);rect('#f37d76',px+4,py+1,24*e.hp/e.maxHp,3);}
    ctx.restore();
  }
  function drawHero(now) {
    const px=player.x*TILE,py=player.y*TILE;
    if (now-player.hurtAt < 600 && Math.floor(now/100)%2===0) return;
    const bob=phase==='playing' && pressed.size ? Math.sin(now/110)*1.1:0;
    rect('#071c2060',px+6,py+27,21,4);
    rect('#314e6c',px+7,py+19+bob,8,10);rect('#314e6c',px+18,py+19+bob,8,10);
    rect('#d7a34a',px+6,py+14+bob,21,12);
    rect('#f2cc82',px+9,py+10+bob,16,10);
    rect('#f6d765',px+6,py+5+bob,22,8);
    rect('#ffe99a',px+10,py+3+bob,15,6);
    rect('#c39243',px+5,py+11+bob,23,4);
    if (player.dir === 'left') rect('#34404b',px+10,py+14+bob,3,4);
    else if (player.dir === 'right') rect('#34404b',px+21,py+14+bob,3,4);
    else {rect('#34404b',px+12,py+14+bob,3,4);rect('#34404b',px+21,py+14+bob,3,4);}
    rect('#fff6ba',px+8,py+8+bob,7,4);
  }
  function draw(now) {
    ctx.clearRect(0,0,WIDTH*TILE,HEIGHT*TILE);
    for (let y=0;y<HEIGHT;y++) for(let x=0;x<WIDTH;x++) {
      const t=world.grid[y][x];
      drawFloor(x,y);
      if(t==='#')drawWall(x,y);
      else if(t==='R')drawRock(x,y);
      else if(t==='C')drawCrystal(x,y,now);
      else if(t==='E')drawExit(x,y,now);
    }
    for (const s of swings) {ctx.globalAlpha=Math.min(0.53,s.life*3);rect(s.color,s.x*TILE+2,s.y*TILE+2,28,28);ctx.globalAlpha=1;}
    for (const e of enemies) if(e.hp>0)drawMonster(e,now);
    drawHero(now);
    for (const a of arrows) {
      const cx=a.x*TILE+16,cy=a.y*TILE+16;
      ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(a.dy,a.dx));rect('#fce5a3',-8,-2,15,4);rect('#8be6f2',6,-4,5,8);ctx.restore();
    }
    for (const p of particles) {ctx.globalAlpha=Math.min(1,p.life/p.total*2);rect(p.color,p.x-2,p.y-2,4,4);ctx.globalAlpha=1;}
    // Dark vignette is painted around the border only; the player stays visible.
    const g=ctx.createRadialGradient(WIDTH*TILE/2,HEIGHT*TILE/2,160,WIDTH*TILE/2,HEIGHT*TILE/2,470);
    g.addColorStop(0,'#00000000');g.addColorStop(1,'#0209137a');
    rect(g,0,0,WIDTH*TILE,HEIGHT*TILE);
  }
  function loop(now) {
    const dt=Math.min((now-lastFrame)/1000||0,.05);
    lastFrame=now;elapsed+=dt;
    if(phase==='playing') {
      if(pressed.size) {const dir=pressed.values().next().value;if(dir)movePlayer(dir,now);}
      updateMonsters(now);
      if(phase==='playing')updateArrows(now);
    }
    tickEffects(dt);
    draw(now);
    requestAnimationFrame(loop);
  }
  function handleAction(action) {
    if (action === 'start') {phase='playing';closeModal();}
    else if (action === 'retry') {initLevel(levelIndex);phase='playing';closeModal();}
    else if (action === 'next') {initLevel(levelIndex+1);phase='playing';closeModal();}
    else if (action === 'replay') {save.currentLevel=0;persist();initLevel(0);phase='playing';closeModal();}
    else if (action === 'tree') openTree();
    else if (action === 'back') {phase=returnPhase;renderModalForPhase();}
  }
  $('modal').addEventListener('click', event => {
    const button=event.target.closest('button');
    if(!button)return;
    if(button.dataset.skill)buySkill(button.dataset.skill);
    else if(button.dataset.action)handleAction(button.dataset.action);
  });
  $('openTreeBtn').addEventListener('click',openTree);
  $('sideTreeBtn').addEventListener('click',openTree);
  $('helpBtn').addEventListener('click',()=>{if(phase==='help')return;returnPhase=phase;phase='help';renderModalForPhase();});
  $('resetBtn').addEventListener('click',()=>{
    if(!window.confirm('Erase ALL saved crystals, weapon unlocks and level progress? This cannot be undone.'))return;
    save={banked:0,currentLevel:0,completed:0,upgrades:[]};persist();initLevel(0);phase='intro';renderModalForPhase();
  });
  $('attackBtn').addEventListener('click',()=>attack());
  document.querySelectorAll('[data-weapon]').forEach(button=>button.addEventListener('click',()=>{
    if(phase==='tree' || phase==='help')return;
    if(phase==='playing')selectWeapon(button.dataset.weapon);
  }));
  window.addEventListener('keydown',e=>{
    const dir=KEY_TO_DIR[e.key] || KEY_TO_DIR[e.key.toLowerCase()];
    if(dir || e.code==='Space')e.preventDefault();
    if(e.key.toLowerCase()==='t' && !e.repeat) {
      if(phase==='tree')handleAction('back');else if(phase==='playing')openTree();return;
    }
    if(e.key==='Escape' && (phase==='tree'||phase==='help')){handleAction('back');return;}
    if(phase!=='playing')return;
    if(dir){pressed.add(dir);movePlayer(dir,performance.now());}
    else if(e.code==='Space'&&!e.repeat)attack();
    else if(['1','2','3'].includes(e.key)&&!e.repeat)selectWeapon({1:'pickaxe',2:'sword',3:'bow'}[e.key]);
  });
  window.addEventListener('keyup',e=>{const dir=KEY_TO_DIR[e.key] || KEY_TO_DIR[e.key.toLowerCase()];if(dir)pressed.delete(dir);});
  window.addEventListener('blur',()=>pressed.clear());
  document.querySelectorAll('[data-move]').forEach(button=>{
    const dir=button.dataset.move;
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);pressed.add(dir);movePlayer(dir,performance.now());});
    const release=()=>pressed.delete(dir);
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  initLevel(levelIndex);
  renderModalForPhase();
  requestAnimationFrame(loop);
})();
