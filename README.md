# SourceDesk: Civic Lateral-Reading & Media Verification Game

**Live Deployment:** [https://aariv.me/sourcedesk/](https://aariv.me/sourcedesk/)  
**Track:** Girls Who Code HHS Hackathon 2026 ("Level up your gameplay, level up the world. Build a game for social good")

## Overview

**SourceDesk** is an interactive civic media-literacy and lateral-reading desk game that trains students and community members to verify viral claims before sharing them. Built around the Stanford History Education Group (Civic Online Reasoning) lateral-reading methodology, players step into the role of an evening standards editor investigating six realistic public-interest dispatches:

1. **SD-2026-01 (`dispatch-01-flood-release`):** Viral emergency nighttime dam release claim using a cropped August 2017 reservoir photograph (`MISLEADING CONTEXT`).
2. **SD-2026-02 (`dispatch-02-miracle-study`):** "300% clinical memory boost" energy drink headline derived from an unblinded `n=11` manufacturer-funded poster (`MISLEADING CONTEXT`).
3. **SD-2026-03 (`dispatch-03-aid-portal`):** Urgent disaster utility grant SMS pointing to a 36-hour-old `.org` typosquat harvesting Social Security and bank routing numbers (`FABRICATED / IMPOSTER`).
4. **SD-2026-04 (`dispatch-04-nws-heat-bulletin`):** Official National Weather Service excessive heat warning corroborated across `.gov` ASOS station telemetry and municipal cooling center directives (`VERIFIED BULLETIN`).
5. **SD-2026-05 (`dispatch-05-cherry-picked-chart`):** Viral bar graph claiming a 90% overnight drop in city particulate pollution by truncating the vertical Y-axis from `88.0` to `92.0` (`MISLEADING CONTEXT`).
6. **SD-2026-06 (`dispatch-06-synthetic-audio`):** Forwarded commuter voice memo alleging an immediate rail shutdown, exhibiting a hard `8.0 kHz` synthetic TTS spectral ceiling and zero GTFS agency corroboration (`FABRICATED / IMPOSTER`).

## Core Gameplay & Educational Mechanics

- **4 Interactive Lateral-Reading Instruments (`[1]` to `[4]`):**
  - `[1]` **Domain & WHOIS Registry:** Inspects domain registration age, `.gov` vs `.org`/`.xyz` TLD authority, and undisclosed corporate ownership.
  - `[2]` **Media & Chart Forensics:** Compares cropped vs archival wire frames, truncated vs zero-baseline chart axes, and `8.0 kHz` synthetic audio spectrograms.
  - `[3]` **Primary Source Cross-Check:** Queries USGS river gauges, NOAA ASOS weather stations, EPA AirNow monitors, GTFS transit feeds, and clinical trial sample sizes (`n=11`).
  - `[4]` **Urgency & Framing Scanner:** Detects deletion paranoia, midnight countdown coercion, and anti-verification priming.
- **Evidence Efficiency Scoring & Blind-Stamp Penalty:**
  - Players earn base accuracy points (`+60`), lateral evidence points (`+25` for uncovering both high-signal probes), an **Evidence Efficiency Bonus** (`+10`) for identifying the two highest-signal probes before stamping, and streak bonuses (`+1` to `+5`).
  - Stamping a dispatch without inspecting any lateral evidence triggers a `-25` blind-guess penalty.
- **Custom Claim & Headline Verifier Lab:**
  - Students can paste any real-world headline or forwarded message and toggle five lateral-reading red flags to compute a live Credibility Risk Score (`0-100`) and remediation checklist.
- **Calibration & Scoring Lab (`js/calibration-lab.js`):**
  - **5-Editor Strategy Comparator:** deterministic replays of `blind-guesser`, `single-probe-skimmer`, `evidence-efficient`, `exhaustive-four-probe`, and `contrarian-flip` through the real scoring engine, reporting exact total score, accuracy, blind-stamp penalties, efficiency bonuses, average probes per dispatch, and streak trajectory (`evidence-efficient` scores `585`, strictly dominating blind guessing at `106`).
  - **6 x 16 Probe-Signal Payoff Matrix:** an interactive SVG heatmap of every `2^4` probe-inspection subset across all six dispatches, proving the two highest-signal probes maximize score-per-probe efficiency (`47.5`) versus blind stamping (`35` at zero probes) and exhaustive four-probing (`22.5` per probe).
  - **5 Custom-Claim Stress Presets:** one-click typosquat SMS, truncated Y-axis chart, unblinded `n=11` study, verified `.gov` heat alert, and synthetic audio memo profiles scored through the real risk engine (`0-100`).
  - **SHA-256 Audited Desk Brief Exporter:** pure-JS FIPS 180-4 hashing stamps one canonical digest across the on-page fingerprint, JSON export, formula-safe CSV provenance header, and Markdown footer, with an interactive tamper-verification demo.
  - **`#sd=` URL-Hash Bookmark Codec:** strict, fail-closed round-trip of the active editor strategy, dispatch, probe subset bitmask, and claim preset; `__proto__` and constructor keys are blocked via `Object.prototype.hasOwnProperty` checks.
  - **In-Page Self-Test Runner:** 16 deterministic self-tests covering SHA-256 known-answer vectors, scoring invariants, dominance checks, CSV escaping, tamper detection, and codec round-trips.
- **Synthesized Web Audio & Printable Field Guide:**
  - Uses the browser Web Audio API to synthesize tactile mechanical relay and stamp acoustics (with a one-click mute toggle) and formats into a printable Lateral Reading Field Guide via `Cmd/Ctrl + P`.

## Automated Bot Playtest Matrix & Verification

Playtesting and scoring balance verification were conducted via an automated bot simulation harness across **592,704** simulated clue-inspection and decision combinations (`scripts/verify-playtest-matrix.js`), not human subjects. The matrix exhaustively evaluates:

- `6` civic verification dispatches
- `16` ($2^4$) lateral-reading probe-inspection subsets
- `3` editorial stamp verdicts (`VERIFIED_BULLETIN`, `MISLEADING_CONTEXT`, `FABRICATED_IMPOSTER`)
- `6` active streak tiers (`0` through `5`)
- `343` ($7^3$) custom claim checklist and headline urgency profiles

Run the verification suite locally:

```bash
npm test
npm run verify:matrix
```

`npm test` runs **397** Node tests across four suites (`tests/sourcedesk.test.js`, `tests/dom-smoke.test.js`, `tests/calibration-lab.test.js`, `tests/revamp-regression.test.js`), covering the scoring engine, static DOM/accessibility hygiene, and the full Calibration Lab surface: every strategy replay, all 96 payoff-matrix cells, all claim presets, SHA-256 known-answer vectors, canonical JSON, CSV formula-injection escaping, export digest parity, tamper verification, `#sd=` round-trips, and hostile-input rejection (`NaN`, `Infinity`, `-0`, out-of-range masks, unknown dispatch ids, XSS strings, `__proto__`). `npm run verify:matrix` exhaustively confirms scoring invariants across the full 592,704-combination automated bot playtest space.

## AI Tool Assistance Disclosure

In accordance with Girls Who Code HHS Hackathon Rule 2, this project was developed with AI coding and illustration tool assistance for software engineering, test generation, and the isometric newsroom desk hero illustration (`img/newsroom-desk-hero.jpg`). All verification logic, educational dispatches, and scoring invariants are deterministically tested via `tests/sourcedesk.test.js`.
