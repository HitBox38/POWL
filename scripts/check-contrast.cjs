/* global __dirname */
// WCAG normal-text contrast for the actual CSS tokens and translucent controls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'global.css'), 'utf8');
const rgb = ([h, s, l]) => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
};
const luminance = (color) => color
  .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const blend = (front, back, alpha) => front.map((v, i) => v * alpha + back[i] * (1 - alpha));
const ratio = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

for (const match of css.matchAll(/(\.dark:root|:root)\s*\{([^}]+)\}/g)) {
  const colors = Object.fromEntries([...match[2].matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)]
    .map(([, name, h, s, l]) => [name, rgb([+h, +s, +l])]));
  const results = [];
  const check = (name, foreground, background) => {
    const contrast = ratio(foreground, background);
    assert.ok(contrast >= 4.5, `${match[1]} ${name}: ${contrast.toFixed(2)}:1 (needs 4.5:1)`);
    results.push(contrast);
  };
  for (const surface of ['background', 'card', 'popover', 'secondary', 'muted', 'accent']) {
    for (const text of ['foreground', 'muted-foreground', 'destructive']) {
      check(`${text} on ${surface}`, colors[text], colors[surface]);
    }
  }
  check('native placeholder', colors['muted-foreground'], blend(colors.input, colors.background, 0.3));
  for (const tone of ['primary', 'destructive']) {
    check(`${tone} button`, colors[`${tone}-foreground`], colors[tone]);
    check(`${tone} pressed button`, colors[`${tone}-foreground`], blend(colors[tone], colors.card, 0.9));
    check(`${tone} tinted status button`, colors[tone], blend(colors[tone], colors.card, 0.2));
  }
  console.log(`${match[1]}: ${results.length} contrast checks passed; minimum ${Math.min(...results).toFixed(2)}:1`);
}
