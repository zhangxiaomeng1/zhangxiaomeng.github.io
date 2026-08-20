(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const livesEl = document.getElementById('lives');
  const timeEl = document.getElementById('time');
  const startOverlay = document.getElementById('startOverlay');
  const resultOverlay = document.getElementById('resultOverlay');
  const resultBadge = document.getElementById('resultBadge');
  const resultTitle = document.getElementById('resultTitle');
  const resultCopy = document.getElementById('resultCopy');
  const startButton = document.getElementById('startButton');
  const resultButton = document.getElementById('resultButton');
  const pauseButton = document.getElementById('pauseButton');
  const resetButton = document.getElementById('resetButton');

  const W = canvas.width;
  const H = canvas.height;
  const keys = new Set();
  const touchKeys = new Set();
  let lastTime = 0;
  let animationFrame = 0;
  let game;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pressed = (name) => keys.has(name) || touchKeys.has(name);

  function makeLevel() {
    const platforms = [
      { x: 0, y: 482, w: 680, h: 58 }, { x: 790, y: 482, w: 510, h: 58 },
      { x: 1420, y: 482, w: 670, h: 58 }, { x: 2220, y: 482, w: 480, h: 58 },
      { x: 2840, y: 482, w: 1360, h: 58 },
      { x: 330, y: 390, w: 150, h: 20 }, { x: 930, y: 360, w: 175, h: 20 },
      { x: 1190, y: 420, w: 110, h: 20 }, { x: 1570, y: 382, w: 190, h: 20 },
      { x: 1880, y: 320, w: 150, h: 20 }, { x: 2380, y: 390, w: 160, h: 20 },
      { x: 3010, y: 386, w: 180, h: 20 }, { x: 3510, y: 332, w: 190, h: 20 }
    ];
    const blocks = [
      { x: 405, y: 330, type: 'question', used: false, bump: 0 }, { x: 447, y: 330, type: 'brick', used: false, bump: 0 }, { x: 489, y: 330, type: 'question', used: false, bump: 0 },
      { x: 970, y: 300, type: 'question', used: false, bump: 0 }, { x: 1012, y: 300, type: 'brick', used: false, bump: 0 },
      { x: 1630, y: 322, type: 'question', used: false, bump: 0 }, { x: 1672, y: 322, type: 'question', used: false, bump: 0 },
      { x: 2415, y: 330, type: 'brick', used: false, bump: 0 }, { x: 2457, y: 330, type: 'question', used: false, bump: 0 },
      { x: 3130, y: 326, type: 'question', used: false, bump: 0 }, { x: 3172, y: 326, type: 'brick', used: false, bump: 0 }
    ];
    const coins = [
      [210, 425], [355, 344], [470, 285], [740, 425], [870, 425], [990, 250], [1130, 425], [1218, 375], [1510, 425], [1610, 280], [1720, 280], [1850, 270], [2020, 425], [2300, 425], [2410, 280], [2515, 345], [2920, 425], [3070, 340], [3270, 425], [3560, 282], [3670, 282], [3860, 425]
    ].map(([x, y]) => ({ x, y, w: 18, h: 22, collected: false, phase: x / 80 }));
    const enemies = [
      { x: 555, y: 450, w: 32, h: 32, vx: -0.65, alive: true, home: [510, 650] },
      { x: 1090, y: 450, w: 32, h: 32, vx: 0.75, alive: true, home: [810, 1270] },
      { x: 1770, y: 450, w: 32, h: 32, vx: -0.8, alive: true, home: [1440, 2050] },
      { x: 2280, y: 450, w: 32, h: 32, vx: 0.8, alive: true, home: [2240, 2670] },
      { x: 3015, y: 450, w: 32, h: 32, vx: -0.72, alive: true, home: [2860, 3320] },
      { x: 3740, y: 450, w: 32, h: 32, vx: 0.75, alive: true, home: [3480, 4130] }
    ];
    return { platforms, blocks, coins, enemies, goal: { x: 4050, y: 282, w: 28, h: 200 } };
  }

  function freshGame() {
    const level = makeLevel();
    return { ...level, player: { x: 92, y: 430, w: 28, h: 48, vx: 0, vy: 0, grounded: false, coyote: 0, facing: 1 }, cameraX: 0, score: 0, coinCount: 0, lives: 3, time: 180, running: false, paused: false, won: false, gameOver: false, particles: [], jumpQueued: false, hitCooldown: 0, flash: 0 };
  }

  function resetGame(startImmediately = false) {
    game = freshGame();
    game.running = startImmediately;
    startOverlay.classList.toggle('is-hidden', startImmediately);
    resultOverlay.classList.add('is-hidden');
    pauseButton.textContent = 'Ⅱ';
    pauseButton.setAttribute('aria-label', '暂停游戏');
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = String(game.score).padStart(6, '0');
    coinsEl.textContent = String(game.coinCount).padStart(2, '0');
    livesEl.textContent = '♥'.repeat(game.lives) + '♡'.repeat(3 - game.lives);
    timeEl.textContent = String(Math.max(0, Math.ceil(game.time))).padStart(3, '0');
  }

  function solidItems() { return game.platforms.concat(game.blocks.filter((block) => !block.broken)); }

  function spawnParticles(x, y, color, count = 7) {
    for (let i = 0; i < count; i += 1) game.particles.push({ x, y, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3 - .5, life: .6 + Math.random() * .35, color, size: 3 + Math.random() * 3 });
  }

  function bumpBlock(block) {
    block.bump = .18;
    if (block.type === 'question' && !block.used) {
      block.used = true;
      game.coinCount += 1; game.score += 100;
      spawnParticles(block.x + 21, block.y - 7, '#ffd45f', 9);
      game.particles.push({ x: block.x + 21, y: block.y - 4, vx: 0, vy: -5, life: .7, color: '#ffd45f', size: 12, coin: true });
    } else if (block.type === 'brick' && !block.used) {
      block.used = true; game.score += 25; spawnParticles(block.x + 21, block.y + 10, '#e88254', 5);
    }
  }

  function hurtPlayer() {
    if (game.hitCooldown > 0 || game.won || game.gameOver) return;
    game.hitCooldown = 1.2; game.lives -= 1; game.flash = .35;
    if (game.lives <= 0) { game.gameOver = true; game.running = false; showResult(false); return; }
    game.player.x = Math.max(80, game.player.x - 150); game.player.y = 360; game.player.vx = 0; game.player.vy = -6;
    spawnParticles(game.player.x, game.player.y, '#ff8a72', 10);
  }

  function update(dt) {
    if (!game.running || game.paused || game.won || game.gameOver) return;
    game.time -= dt;
    game.hitCooldown = Math.max(0, game.hitCooldown - dt);
    game.flash = Math.max(0, game.flash - dt);
    if (game.time <= 0) { game.time = 0; game.gameOver = true; game.running = false; showResult(false, '时间到啦', '别急，熟悉路线后再跑一次。'); return; }

    const player = game.player;
    const left = pressed('left'); const right = pressed('right');
    if (left && !right) { player.vx -= 0.65; player.facing = -1; } else if (right && !left) { player.vx += 0.65; player.facing = 1; } else player.vx *= Math.pow(.78, dt * 60);
    player.vx = clamp(player.vx, -4.1, 4.1);
    if (game.jumpQueued && (player.grounded || player.coyote > 0)) { player.vy = -10.8; player.grounded = false; player.coyote = 0; spawnParticles(player.x + 14, player.y + 47, '#dce7f3', 4); }
    game.jumpQueued = false;
    const previousY = player.y;
    player.x += player.vx; player.x = clamp(player.x, 0, game.goal.x + 70);
    for (const item of solidItems()) {
      if (intersects(player, item)) {
        if (player.vx > 0) player.x = item.x - player.w; else if (player.vx < 0) player.x = item.x + item.w;
        player.vx = 0;
      }
    }
    player.vy += 0.48; player.vy = Math.min(player.vy, 12); player.y += player.vy; player.grounded = false;
    for (const item of solidItems()) {
      if (!intersects(player, item)) continue;
      if (player.vy >= 0 && previousY + player.h <= item.y + 7) { player.y = item.y - player.h; player.vy = 0; player.grounded = true; }
      else if (player.vy < 0 && previousY >= item.y + item.h - 2) { player.y = item.y + item.h; player.vy = 0; if (item.type) bumpBlock(item); }
    }
    if (player.y > H + 100) hurtPlayer();
    player.coyote = player.grounded ? .1 : Math.max(0, player.coyote - dt);

    for (const block of game.blocks) block.bump = Math.max(0, block.bump - dt);
    for (const coin of game.coins) { if (!coin.collected && intersects(player, coin)) { coin.collected = true; game.coinCount += 1; game.score += 100; spawnParticles(coin.x + 9, coin.y + 10, '#ffd45f', 7); } }
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.vx;
      if (enemy.x < enemy.home[0] || enemy.x + enemy.w > enemy.home[1]) enemy.vx *= -1;
      if (intersects(player, enemy)) {
        if (player.vy > 0 && previousY + player.h <= enemy.y + 11) { enemy.alive = false; player.vy = -7; game.score += 250; spawnParticles(enemy.x + 16, enemy.y + 18, '#d7f1c4', 9); }
        else hurtPlayer();
      }
    }
    if (player.x + player.w > game.goal.x - 12) { game.won = true; game.running = false; game.score += Math.ceil(game.time) * 10; showResult(true); }
    game.cameraX += ((player.x - 300) - game.cameraX) * Math.min(1, dt * 5); game.cameraX = clamp(game.cameraX, 0, 3300);
    for (const particle of game.particles) { particle.x += particle.vx; particle.y += particle.vy; particle.vy += .16; particle.life -= dt; }
    game.particles = game.particles.filter((particle) => particle.life > 0);
    updateHud();
  }

  function showResult(won, title, copy) {
    resultBadge.textContent = won ? 'LEVEL CLEAR' : 'TRY AGAIN'; resultTitle.textContent = title || (won ? '漂亮过关！' : '再跑一次？'); resultCopy.textContent = copy || (won ? `本关得分 ${game.score}，金币 ${game.coinCount}。` : '小心坑洞和小怪，路线已经记住了。'); resultOverlay.classList.remove('is-hidden'); updateHud();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#81cbed'); sky.addColorStop(1, '#d9f1e7'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f8d475'; ctx.beginPath(); ctx.arc(760 - game.cameraX * .08, 92, 38, 0, Math.PI * 2); ctx.fill();
    drawCloud(130 - game.cameraX * .18, 105, 1); drawCloud(550 - game.cameraX * .12, 165, .7); drawCloud(940 - game.cameraX * .16, 88, .8);
    ctx.fillStyle = '#8bc8c4'; drawHill(50 - game.cameraX * .22, 435, 190, 170); drawHill(390 - game.cameraX * .22, 435, 260, 195); drawHill(815 - game.cameraX * .22, 435, 220, 175); drawHill(1180 - game.cameraX * .22, 435, 280, 210);
    ctx.fillStyle = '#68ada9'; drawHill(230 - game.cameraX * .34, 470, 250, 190); drawHill(730 - game.cameraX * .34, 470, 300, 220); drawHill(1240 - game.cameraX * .34, 470, 250, 190);
  }
  function drawCloud(x, y, scale) { ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.arc(25, -11, 28, 0, Math.PI * 2); ctx.arc(54, 0, 21, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0, 0, 54, 20); ctx.restore(); }
  function drawHill(x, y, w, h) { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * .18, y - h, x + w / 2, y); ctx.closePath(); ctx.fill(); }

  function drawWorld() {
    ctx.save(); ctx.translate(-Math.round(game.cameraX), 0);
    for (const platform of game.platforms) { ctx.fillStyle = '#6e3f42'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h); ctx.fillStyle = '#83c85a'; ctx.fillRect(platform.x, platform.y, platform.w, 10); ctx.fillStyle = '#5c3438'; for (let x = platform.x + 14; x < platform.x + platform.w; x += 30) ctx.fillRect(x, platform.y + 24, 10, 10); }
    for (const block of game.blocks) { const offset = block.bump ? Math.sin(block.bump * 44) * 4 : 0; drawBlock(block, offset); }
    for (const coin of game.coins) if (!coin.collected) drawCoin(coin.x, coin.y + Math.sin(performance.now() / 300 + coin.phase) * 3);
    for (const enemy of game.enemies) if (enemy.alive) drawEnemy(enemy);
    drawGoal(game.goal); drawPlayer(game.player);
    for (const particle of game.particles) { ctx.globalAlpha = clamp(particle.life * 1.7, 0, 1); if (particle.coin) drawCoin(particle.x, particle.y, particle.size / 10); else { ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); } ctx.globalAlpha = 1; }
    ctx.restore();
  }
  function drawBlock(block, offset) { const y = block.y - offset; ctx.fillStyle = block.used ? '#b67c54' : block.type === 'question' ? '#f5b84b' : '#c66b4c'; ctx.fillRect(block.x, y, 40, 40); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(block.x + 3, y + 3, 34, 4); ctx.fillStyle = '#8b4b42'; ctx.fillRect(block.x, y + 36, 40, 4); if (block.type === 'question' && !block.used) { ctx.fillStyle = '#fff0bc'; ctx.font = 'bold 25px Arial'; ctx.fillText('?', block.x + 12, y + 29); } else { ctx.fillStyle = '#914f42'; ctx.fillRect(block.x + 8, y + 9, 9, 7); ctx.fillRect(block.x + 25, y + 24, 9, 7); } }
  function drawCoin(x, y, scale = 1) { ctx.fillStyle = '#f6bb35'; ctx.beginPath(); ctx.ellipse(x + 9, y + 11, 8 * scale, 11 * scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff0a6'; ctx.fillRect(x + 7, y + 3, 3 * scale, 12 * scale); }
  function drawEnemy(enemy) { ctx.fillStyle = '#6d483e'; ctx.fillRect(enemy.x + 3, enemy.y + 9, 26, 20); ctx.fillStyle = '#f2c28b'; ctx.fillRect(enemy.x + 7, enemy.y + 12, 18, 13); ctx.fillStyle = '#302b35'; ctx.fillRect(enemy.x + 8, enemy.y + 14, 4, 5); ctx.fillRect(enemy.x + 20, enemy.y + 14, 4, 5); ctx.fillRect(enemy.x, enemy.y + 28, 12, 4); ctx.fillRect(enemy.x + 20, enemy.y + 28, 12, 4); }
  function drawGoal(goal) { ctx.fillStyle = '#d9e3eb'; ctx.fillRect(goal.x, goal.y, 5, goal.h); ctx.fillStyle = '#ef6d64'; ctx.beginPath(); ctx.moveTo(goal.x + 5, goal.y + 5); ctx.lineTo(goal.x + 47, goal.y + 20); ctx.lineTo(goal.x + 5, goal.y + 35); ctx.fill(); ctx.fillStyle = '#6e3f42'; ctx.fillRect(goal.x - 15, goal.y + goal.h, 35, 10); }
  function drawPlayer(player) { const blink = game.hitCooldown > 0 && Math.floor(game.hitCooldown * 14) % 2 === 0; if (blink) return; const x = player.x; const y = player.y; ctx.fillStyle = '#28344a'; ctx.fillRect(x + 6, y + 9, 17, 15); ctx.fillStyle = '#e98756'; ctx.fillRect(x + 8, y + 12, 14, 13); ctx.fillStyle = '#e85e55'; ctx.fillRect(x + 4, y + 7, 22, 8); ctx.fillRect(x + 8, y + 4, 17, 7); ctx.fillStyle = '#f3c38d'; ctx.fillRect(x + 12, y + 15, 12, 8); ctx.fillStyle = '#202a3e'; ctx.fillRect(x + 20, y + 17, 3, 4); ctx.fillStyle = '#3e7fc2'; ctx.fillRect(x + 7, y + 24, 17, 15); ctx.fillStyle = '#293348'; ctx.fillRect(x + 4, y + 36, 10, 12); ctx.fillRect(x + 19, y + 36, 10, 12); ctx.fillStyle = '#1c2536'; ctx.fillRect(x + 2, y + 45, 13, 4); ctx.fillRect(x + 18, y + 45, 13, 4); }

  function render() { drawBackground(); drawWorld(); if (game.flash > 0) { ctx.fillStyle = `rgba(255,100,100,${game.flash * .25})`; ctx.fillRect(0, 0, W, H); } animationFrame = requestAnimationFrame(render); }
  function loop(timestamp) { const dt = Math.min(.033, (timestamp - lastTime) / 1000 || 0); lastTime = timestamp; update(dt); requestAnimationFrame(loop); }

  function startGame() { game.running = true; game.paused = false; startOverlay.classList.add('is-hidden'); resultOverlay.classList.add('is-hidden'); }
  function togglePause() { if (!game.running || game.won || game.gameOver) return; game.paused = !game.paused; pauseButton.textContent = game.paused ? '▶' : 'Ⅱ'; pauseButton.setAttribute('aria-label', game.paused ? '继续游戏' : '暂停游戏'); }
  document.addEventListener('keydown', (event) => { const map = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', A: 'left', d: 'right', D: 'right' }; if (map[event.key]) { keys.add(map[event.key]); event.preventDefault(); } if ([' ', 'ArrowUp', 'w', 'W'].includes(event.key)) { game.jumpQueued = true; event.preventDefault(); } if (event.key === 'p' || event.key === 'P') togglePause(); });
  document.addEventListener('keyup', (event) => { const map = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', A: 'left', d: 'right', D: 'right' }; if (map[event.key]) keys.delete(map[event.key]); });
  document.querySelectorAll('[data-key]').forEach((button) => { const key = button.dataset.key; const down = (event) => { event.preventDefault(); if (key === 'jump') game.jumpQueued = true; else touchKeys.add(key); }; const up = (event) => { event.preventDefault(); if (key !== 'jump') touchKeys.delete(key); }; button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', up); });
  startButton.addEventListener('click', startGame); resultButton.addEventListener('click', () => resetGame(true)); resetButton.addEventListener('click', () => resetGame(true)); pauseButton.addEventListener('click', togglePause);
  resetGame(false); render(); requestAnimationFrame(loop);
})();
