const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..', '..', '..');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const countdownStoreUrl = 'https://apps.apple.com/us/app/x%E8%87%AA%E4%B8%BB%E5%80%92%E8%AE%A1%E6%97%B6/id6504705716?mt=12';

test('keeps the original homepage sections and service architecture', () => {
  assert.ok(html.includes('id="services"'));
  assert.ok(html.includes('id="contact"'));
  assert.ok(html.includes('把 AI 应用'));
  assert.ok(html.includes('三档独立服务'));
});

test('adds X Autonomy Countdown as the eighth app without reordering the original seven', () => {
  const cards = [...html.matchAll(/<article[^>]+class="[^"]*app-card[^"]*"[^>]*data-app="([^"]+)"[^>]*data-priority="([^"]+)"/g)]
    .map((match) => ({ id: match[1], priority: Number(match[2]) }));

  assert.equal(cards.length, 8);
  assert.deepEqual(cards.slice(0, 7), [
    { id: 'deepcleanup-ios', priority: 1 },
    { id: 'deepcleanup-mac', priority: 2 },
    { id: 'focuslock', priority: 3 },
    { id: 'longshot', priority: 4 },
    { id: 'lifelog', priority: 5 },
    { id: 'ratepilot', priority: 6 },
    { id: 'stamp-studio', priority: 7 },
  ]);
  assert.deepEqual(cards[7], { id: 'x-autonomy-countdown', priority: 8 });
});

test('publishes the eighth Mac app with its App Store link and local icon', () => {
  const card = html.match(/<article[^>]+data-app="x-autonomy-countdown"[\s\S]*?<\/article>/)?.[0];

  assert.ok(card, 'missing X Autonomy Countdown card');
  assert.ok(card.includes('X Autonomy Countdown'));
  assert.ok(card.includes('Mac · 效率提升'));
  assert.ok(card.includes(`href="${countdownStoreUrl}"`));
  assert.ok(card.includes('life-coach/assets/icons/x-autonomy-countdown.png'));
});

test('updates the visible portfolio count to eight', () => {
  assert.ok(html.includes('8 款 App'));
  assert.ok(html.includes('8款 App 运营'));
  assert.ok(!html.includes('阳明科技 7 款 App 产品矩阵'));
});

test('ships every local image referenced by the homepage', () => {
  const sources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);

  assert.ok(sources.length >= 8);
  for (const source of sources) {
    assert.ok(fs.existsSync(path.join(rootDir, source)), `missing image: ${source}`);
  }
});
