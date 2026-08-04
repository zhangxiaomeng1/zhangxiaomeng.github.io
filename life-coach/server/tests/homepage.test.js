const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const publicDir = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

const apps = [
  {
    id: 'deepcleanup-ios',
    priority: '1',
    href: 'https://apps.apple.com/us/app/deepcleanup-photo-cleaner/id6777354576',
  },
  {
    id: 'deepcleanup-mac',
    priority: '2',
    href: 'https://apps.apple.com/us/app/deepcleanup/id6777946333?mt=12',
  },
  {
    id: 'focuslock',
    priority: '3',
    href: 'https://apps.apple.com/us/app/focuslock-app-blocker/id6781309683',
  },
  {
    id: 'longshot',
    priority: '4',
    href: 'https://apps.apple.com/us/app/longshot-screenshot-stitch/id6745420963',
  },
  {
    id: 'lifelog',
    priority: '5',
    href: 'https://apps.apple.com/us/app/lifelog-countdown-journal/id1610261169',
  },
];

test('renders the five products in the PDF-recommended studio order', () => {
  const cards = [...html.matchAll(/<article[^>]+class="[^"]*app-card[^"]*"[^>]*data-app="([^"]+)"[^>]*data-priority="([^"]+)"/g)]
    .map((match) => ({ id: match[1], priority: match[2] }));

  assert.deepEqual(cards, apps.map(({ id, priority }) => ({ id, priority })));
});

test('gives every product card its exact App Store destination', () => {
  for (const app of apps) {
    const cardPattern = new RegExp(
      `<article[^>]+data-app="${app.id}"[\\s\\S]*?<\\/article>`,
    );
    const card = html.match(cardPattern)?.[0];

    assert.ok(card, `missing card for ${app.id}`);
    assert.ok(card.includes(`href="${app.href}"`), `missing App Store link for ${app.id}`);
    assert.ok(card.includes('target="_blank"'), `missing new-tab behavior for ${app.id}`);
    assert.ok(card.includes('rel="noopener noreferrer"'), `missing safe external-link rel for ${app.id}`);
  }
});

test('keeps the featured conversion path focused on DeepCleanup for iPhone', () => {
  const featured = html.match(/<section[^>]+data-featured-app="deepcleanup-ios"[\s\S]*?<\/section>/)?.[0];

  assert.ok(featured, 'missing featured DeepCleanup section');
  assert.ok(featured.includes(apps[0].href));
  assert.ok(featured.includes('Free up iPhone storage'));
});

test('ships every local image referenced by the homepage', () => {
  const sources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);

  assert.ok(sources.length >= 5);
  for (const source of sources) {
    assert.ok(fs.existsSync(path.join(publicDir, source)), `missing image: ${source}`);
  }
});

test('uses the original 1024px artwork for all five app icons', () => {
  const iconFiles = [
    'deepcleanup-ios.png',
    'deepcleanup-mac.png',
    'focuslock.png',
    'longshot.png',
    'lifelog.png',
  ];

  for (const iconFile of iconFiles) {
    const png = fs.readFileSync(path.join(publicDir, 'assets', 'icons', iconFile));
    assert.equal(png.readUInt32BE(16), 1024, `${iconFile} width`);
    assert.equal(png.readUInt32BE(20), 1024, `${iconFile} height`);
  }
});

test('keeps the social preview at the declared Open Graph dimensions', () => {
  const png = fs.readFileSync(path.join(publicDir, 'assets', 'homepage-og.png'));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('presents the X profile and current AI-native positioning instead of the old resume link', () => {
  assert.ok(html.includes('href="https://x.com/x_autonomy"'));
  assert.ok(html.includes('X · @x_autonomy'));
  assert.ok(html.includes('AI-native iOS/FDE engineer. I help founders ship AI apps to the App Store with subscriptions, paywalls, analytics, and automation. Building A19 + AI Growth OS.'));
  assert.ok(!html.includes('personGithub.html'));
  assert.ok(!html.includes('Résumé'));
});

test('keeps the public homepage English-only', () => {
  assert.equal(/[\u3400-\u9fff]/u.test(html), false);
});
