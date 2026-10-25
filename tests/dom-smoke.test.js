import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAMP_TYPES,
  PROBE_TYPES,
  DISPATCHES,
  CUSTOM_CLAIM_SIGNALS,
  createInitialGameState,
  inspectProbe,
  submitDispatchStamp,
  getDispatchProgressSummary
} from "../js/sourcedesk-engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(repoRoot, "styles.css"), "utf8");
const appJs = fs.readFileSync(path.join(repoRoot, "js/app.js"), "utf8");

test("DOM Smoke 01: index.html starts with HTML5 doctype and lang=en", () => {
  assert.match(indexHtml.trimStart(), /^<!DOCTYPE html>/i);
  assert.match(indexHtml, /<html\s+lang="en"/i);
});

test("DOM Smoke 02: index.html contains exactly one <h1> element", () => {
  const h1Matches = indexHtml.match(/<h1\b[^>]*>/gi) || [];
  assert.equal(h1Matches.length, 1);
});

test("DOM Smoke 03: heading hierarchy in index.html never skips levels", () => {
  const levels = [...indexHtml.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  assert.ok(levels.length >= 8);
  assert.equal(levels[0], 1);
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(
      levels[i] <= levels[i - 1] + 1,
      `Heading level jumped from h${levels[i - 1]} to h${levels[i]}`
    );
  }
});

test("DOM Smoke 04: all id attributes in index.html are unique", () => {
  const ids = [...indexHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 25);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, "Duplicate IDs found in index.html");
});

test("DOM Smoke 05: OpenGraph and Twitter meta tags are complete", () => {
  assert.match(indexHtml, /property="og:title"\s+content="[^"]+"/);
  assert.match(indexHtml, /property="og:description"\s+content="[^"]+"/);
  assert.match(indexHtml, /property="og:type"\s+content="website"/);
  assert.match(indexHtml, /property="og:url"\s+content="https:\/\/[^"]+"/);
  assert.match(indexHtml, /name="twitter:card"\s+content="summary_large_image"/);
});

test("DOM Smoke 06: inline SVG favicon link is present in <head>", () => {
  assert.match(indexHtml, /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="data:image\/svg\+xml,/);
});

test("DOM Smoke 07: accessible skip-link points to #main-desk and target exists", () => {
  assert.match(indexHtml, /<a\s+class="skip-link"\s+href="#main-desk">/);
  assert.match(indexHtml, /<main\s+id="main-desk">/);
});

test("DOM Smoke 08: <noscript> fallback banner is present inside <body>", () => {
  assert.match(indexHtml, /<noscript>[\s\S]*?<div\s+class="noscript-banner"[\s\S]*?<\/noscript>/);
});

test("DOM Smoke 09: styles.css enforces overflow-x: clip on html and body", () => {
  assert.match(stylesCss, /html,\s*body\s*\{\s*overflow-x:\s*clip;/);
});

test("DOM Smoke 10: styles.css provides :focus-visible outline and reduced-motion guard", () => {
  assert.match(stylesCss, /:focus-visible\s*\{[\s\S]*?outline:/);
  assert.match(stylesCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("DOM Smoke 11: styles.css enforces tabular-nums on numeric readouts", () => {
  assert.match(stylesCss, /font-variant-numeric:\s*tabular-nums/);
});

test("DOM Smoke 12: zero em-dashes or en-dashes across HTML, CSS, and UI JS", () => {
  assert.equal(/[\u2013\u2014]/.test(indexHtml), false);
  assert.equal(/[\u2013\u2014]/.test(stylesCss), false);
  assert.equal(/[\u2013\u2014]/.test(appJs), false);
});

test("DOM Smoke 13: zero emoji characters across HTML, CSS, and UI JS", () => {
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.equal(emojiRegex.test(indexHtml), false);
  assert.equal(emojiRegex.test(stylesCss), false);
  assert.equal(emojiRegex.test(appJs), false);
});

test("DOM Smoke 14: zero uppercase CSS transforms in styles.css", () => {
  assert.equal(/text-transform\s*:\s*uppercase/i.test(stylesCss), false);
});

test("DOM Smoke 15: all 3 editorial verdict stamp buttons in index.html match STAMP_TYPES", () => {
  const stampBtns = [...indexHtml.matchAll(/data-stamp-type="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(stampBtns.length, 3);
  assert.deepEqual(stampBtns, Object.values(STAMP_TYPES));
});

test("DOM Smoke 16: all 3 artifact comparison view mode buttons exist in index.html", () => {
  const modeBtns = [...indexHtml.matchAll(/data-compare-mode="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(modeBtns, ["both", "viral", "verified"]);
});

test("DOM Smoke 17: all DOM IDs referenced via getElementById in js/app.js exist in index.html", () => {
  const htmlIds = new Set([...indexHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const jsIds = [...appJs.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(jsIds.length >= 20);
  for (const id of jsIds) {
    assert.ok(htmlIds.has(id), `ID #${id} referenced in js/app.js is missing from index.html`);
  }
});

test("DOM Smoke 18: footer explicitly discloses automated bot playtesting across 592,704 combinations", () => {
  assert.match(indexHtml, /automated bot simulation harness across 592,704 simulated/);
});

test("DOM Smoke 19: all 6 dispatches and 4 probes per dispatch are free of em/en-dashes and emojis", () => {
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.equal(DISPATCHES.length, 6);
  for (const d of DISPATCHES) {
    for (const pKey of PROBE_TYPES) {
      const p = d.probes[pKey];
      assert.equal(/[\u2013\u2014]/.test(p.summary), false);
      assert.equal(/[\u2013\u2014]/.test(p.telemetry), false);
      assert.equal(emojiRegex.test(p.summary), false);
    }
  }
  assert.equal(CUSTOM_CLAIM_SIGNALS.length, 5);
});

test("DOM Smoke 20: full 6-dispatch game loop achieves 585/600 S-Rank when key probes and correct stamps are applied", () => {
  let state = createInitialGameState();
  for (const d of DISPATCHES) {
    state = inspectProbe(state, d.id, d.keyProbes[0]);
    state = inspectProbe(state, d.id, d.keyProbes[1]);
    state = submitDispatchStamp(state, d.id, d.correctStamp);
  }
  const summary = getDispatchProgressSummary(state);
  assert.equal(summary.allCompleted, true);
  assert.equal(summary.accuracyPercent, 100);
  assert.equal(summary.rating.grade, "S");
  assert.equal(state.totalScore, 585);
});
