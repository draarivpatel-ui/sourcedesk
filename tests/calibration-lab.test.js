import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as engine from "../js/sourcedesk-engine.js";
import "../js/calibration-lab.js";

const SDLab = globalThis.SDLab;
const lab = SDLab.createLab(engine);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(repoRoot, "styles.css"), "utf8");
const labJs = fs.readFileSync(path.join(repoRoot, "js/calibration-lab.js"), "utf8");
const labUiJs = fs.readFileSync(path.join(repoRoot, "js/calibration-lab-ui.js"), "utf8");

const {
  DISPATCHES,
  PROBE_TYPES,
  STAMP_TYPES,
  CUSTOM_CLAIM_SIGNALS,
  createInitialGameState,
  getInspectedProbes,
  inspectProbe,
  submitDispatchStamp,
  calculateRoundScore,
  evaluateCustomClaim,
  getDispatchProgressSummary,
  getDispatchById,
} = engine;

const STRATEGY_IDS = SDLab.EDITOR_STRATEGIES.map((s) => s.id);
const PRESET_IDS = SDLab.CLAIM_PRESETS.map((p) => p.id);
const EXPECTED_STRATEGY_IDS = [
  "blind-guesser",
  "single-probe-skimmer",
  "evidence-efficient",
  "exhaustive-four-probe",
  "contrarian-flip",
];
const EXPECTED_PRESET_IDS = [
  "typosquat-sms",
  "truncated-axis",
  "n11-study",
  "gov-heat",
  "synthetic-audio",
];
const EXPECTED_TOTALS = {
  "blind-guesser": 106,
  "single-probe-skimmer": 459,
  "evidence-efficient": 585,
  "exhaustive-four-probe": 555,
  "contrarian-flip": 150,
};
const EXPECTED_PROBES = {
  "blind-guesser": 0,
  "single-probe-skimmer": 1,
  "evidence-efficient": 2,
  "exhaustive-four-probe": 4,
  "contrarian-flip": 2,
};

const b64url = (text) =>
  Buffer.from(text, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const matrix = lab.payoffMatrix();
const strategyRuns = lab.compareStrategies();
const runById = new Map(strategyRuns.map((r) => [r.strategyId, r]));

/* ------------------------------------------------------------------ */
/* Module loading, factory guards, and registries                      */
/* ------------------------------------------------------------------ */

describe("Calibration Lab Module Loading & Factory", () => {
  it("L1. UMD global SDLab is attached with the documented API surface", () => {
    assert.equal(typeof SDLab, "object");
    for (const key of [
      "createLab", "canonicalJson", "sha256Hex", "csvTextCell",
      "encodeSdHash", "decodeSdHash", "EDITOR_STRATEGIES", "CLAIM_PRESETS",
      "VERSION", "BRIEF_SCHEMA", "HASH_PREFIX",
    ]) {
      assert.ok(key in SDLab, `missing SDLab.${key}`);
    }
  });

  it("L2. createLab throws on null engine", () => {
    assert.throws(() => SDLab.createLab(null), /requires the sourcedesk engine/);
    assert.throws(() => SDLab.createLab(undefined), /requires the sourcedesk engine/);
    assert.throws(() => SDLab.createLab("engine"), /requires the sourcedesk engine/);
    assert.throws(() => SDLab.createLab(42), /requires the sourcedesk engine/);
  });

  it("L3. createLab throws when a required engine key is missing", () => {
    const partial = { ...engine };
    delete partial.calculateRoundScore;
    assert.throws(() => SDLab.createLab(partial), /missing calculateRoundScore/);
  });

  it("L4. createLab throws when engine does not ship exactly 6 dispatches", () => {
    const fake = { ...engine, DISPATCHES: engine.DISPATCHES.slice(0, 5) };
    assert.throws(() => SDLab.createLab(fake), /exactly 6 dispatches/);
  });

  it("L5. createLab throws when engine does not ship exactly 4 probe types", () => {
    const fake = { ...engine, PROBE_TYPES: ["whois", "forensics"] };
    assert.throws(() => SDLab.createLab(fake), /exactly 4 probe types/);
  });

  it("L6. strategies() returns exactly the 5 documented editor strategies in order", () => {
    const ids = lab.strategies().map((s) => s.id);
    assert.deepEqual(ids, EXPECTED_STRATEGY_IDS);
  });

  it("L7. strategy metadata carries name, deskNote, probePolicy and stampPolicy", () => {
    for (const s of lab.strategies()) {
      assert.ok(s.name.length > 3);
      assert.ok(s.deskNote.length > 20);
      assert.ok(["none", "top-signal", "key-pair", "all-four"].includes(s.probePolicy));
      assert.ok(["truthful", "fixed-misleading", "flip"].includes(s.stampPolicy));
    }
  });

  it("L8. claimPresets() returns exactly the 5 documented stress presets in order", () => {
    const ids = lab.claimPresets().map((p) => p.id);
    assert.deepEqual(ids, EXPECTED_PRESET_IDS);
  });

  it("L9. every preset signal id is a real CUSTOM_CLAIM_SIGNALS id", () => {
    const valid = new Set(CUSTOM_CLAIM_SIGNALS.map((s) => s.id));
    for (const p of lab.claimPresets()) {
      for (const sig of p.signalIds) {
        assert.ok(valid.has(sig), `unknown signal ${sig} in preset ${p.id}`);
      }
    }
  });

  it("L10. lab constants expose schema, hash prefix and version", () => {
    assert.equal(lab.HASH_PREFIX, "#sd=");
    assert.equal(lab.BRIEF_SCHEMA, "sourcedesk-desk-brief/1");
    assert.match(lab.VERSION, /^sourcedesk-calibration-lab\//);
  });
});

/* ------------------------------------------------------------------ */
/* SHA-256 FIPS 180-4                                                  */
/* ------------------------------------------------------------------ */

describe("Pure-JS SHA-256 (FIPS 180-4)", () => {
  const KATS = [
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
    [
      "The quick brown fox jumps over the lazy dog",
      "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    ],
    [
      "The quick brown fox jumps over the lazy dog.",
      "ef537f25c895bfa782526529a9b63d97aa631564d5d789c2b765448c8635fb6c",
    ],
    ["SourceDesk verification desk", "39d8a68eadec74ae97d93aeeace5c9652a140190194877c1e84d9c15cd277562"],
    ["Sourcé Dësk 東京 100", "0f3494017f0ed21fd55594e74a3114520459aa9b460d50ff65c08a7870879604"],
  ];

  KATS.forEach(([msg, expected], i) => {
    it(`H${i + 1}. known-answer vector ${i + 1} (${msg.length} chars)`, () => {
      assert.equal(lab.sha256Hex(msg), expected);
    });
  });

  const FUZZ_INPUTS = [
    "SD-2026-01",
    "dispatch-06-synthetic-audio",
    "VERIFIED_BULLETIN",
    "a".repeat(63),
    "b".repeat(64),
    "c".repeat(65),
    "d".repeat(128),
    "x".repeat(1000),
    "café müller 東京",
    "0".repeat(511),
  ];

  FUZZ_INPUTS.forEach((msg, i) => {
    it(`H${KATS.length + i + 1}. matches node:crypto for input ${i + 1} (${msg.length} chars)`, () => {
      const expected = crypto.createHash("sha256").update(msg, "utf8").digest("hex");
      assert.equal(lab.sha256Hex(msg), expected);
    });
  });

  it("H-multi. digest is lowercase 64-char hex", () => {
    assert.match(lab.sha256Hex("anything"), /^[0-9a-f]{64}$/);
  });
});

/* ------------------------------------------------------------------ */
/* canonicalJson                                                       */
/* ------------------------------------------------------------------ */

describe("Canonical JSON", () => {
  it("C1. sorts object keys recursively while keeping array order", () => {
    assert.equal(
      lab.canonicalJson({ b: 1, a: { d: [3, 2], c: 0 } }),
      '{"a":{"c":0,"d":[3,2]},"b":1}'
    );
  });

  it("C2. is byte-stable regardless of insertion order", () => {
    const a = lab.canonicalJson({ x: 1, m: { q: 2, b: 3 }, a: [1, 2] });
    const b = lab.canonicalJson({ a: [1, 2], m: { b: 3, q: 2 }, x: 1 });
    assert.equal(a, b);
  });

  it("C3. serializes a literal __proto__ own-property without polluting prototypes", () => {
    const parsed = JSON.parse('{"__proto__":1,"a":2}');
    const out = lab.canonicalJson(parsed);
    assert.equal(out, '{"__proto__":1,"a":2}');
    assert.equal({}.x, undefined);
  });

  it("C4. handles primitives, nulls, and nested arrays", () => {
    assert.equal(lab.canonicalJson(null), "null");
    assert.equal(lab.canonicalJson(5), "5");
    assert.equal(lab.canonicalJson("s"), '"s"');
    assert.equal(lab.canonicalJson([2, { b: 1, a: 0 }]), '[2,{"a":0,"b":1}]');
  });
});

/* ------------------------------------------------------------------ */
/* csvTextCell formula-injection escaping                              */
/* ------------------------------------------------------------------ */

describe("CSV Formula-Safe Text Cells", () => {
  const CASES = [
    ["=CMD()", '"\'=CMD()"'],
    ["=1+1", '"\'=1+1"'],
    ["+cmd", '"\'+cmd"'],
    ["-9", '"\'-9"'],
    ["@SUM(A1)", '"\'@SUM(A1)"'],
    ["\t=evil()", '"\'\t=evil()"'],
    [" =trim()", '"\' =trim()"'],
    ["plain", "plain"],
    ["SD-2026-01", "SD-2026-01"],
    ["with,comma", '"with,comma"'],
    ['say "hi"', '"say ""hi"""'],
    ["line\nbreak", '"line\nbreak"'],
    ["", ""],
    [null, ""],
    [undefined, ""],
    [42, "42"],
  ];

  CASES.forEach(([input, expected], i) => {
    it(`V${i + 1}. csvTextCell(${JSON.stringify(input)})`, () => {
      assert.equal(lab.csvTextCell(input), expected);
    });
  });

  it("V-multi. every hostile prefix produces a single-quote-led quoted cell", () => {
    for (const s of ["=", "+", "-", "@", "\t", " ", "\r", "\n"]) {
      const out = lab.csvTextCell(s + "x");
      assert.ok(out.startsWith('"\''), `prefix ${JSON.stringify(s)} not escaped: ${out}`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 5-Editor Strategy Comparator                                        */
/* ------------------------------------------------------------------ */

describe("Editor Strategy Comparator", () => {
  it("S1. runStrategy throws on unknown strategy ids", () => {
    for (const bad of ["bogus", "BLIND-GUESSER", "", null, undefined, 7, "__proto__"]) {
      assert.throws(() => lab.runStrategy(bad), /Unknown strategy id/);
    }
  });

  EXPECTED_STRATEGY_IDS.forEach((id) => {
    describe(`Strategy: ${id}`, () => {
      it(`S-${id}-1. exact total score matches the deterministic replay`, () => {
        assert.equal(runById.get(id).totalScore, EXPECTED_TOTALS[id]);
      });

      it(`S-${id}-2. inspects exactly ${EXPECTED_PROBES[id]} probes per dispatch`, () => {
        const run = runById.get(id);
        assert.equal(run.avgProbesPerDispatch, EXPECTED_PROBES[id]);
        for (const d of run.decisions) {
          assert.equal(d.probesInspectedCount, EXPECTED_PROBES[id]);
        }
      });

      it(`S-${id}-3. stamps all 6 dispatches and returns 6 decision records`, () => {
        const run = runById.get(id);
        assert.equal(run.decisions.length, 6);
        assert.equal(run.dispatchCount, 6);
        assert.equal(run.streakTrajectory.length, 6);
      });

      it(`S-${id}-4. replay is byte-deterministic across invocations`, () => {
        assert.equal(JSON.stringify(lab.runStrategy(id)), JSON.stringify(runById.get(id)));
      });
    });
  });

  it("S-blind-5. blind-guesser eats the -25 penalty on all 6 stamps", () => {
    const run = runById.get("blind-guesser");
    assert.equal(run.blindPenaltyCount, 6);
    assert.equal(run.blindPenaltyPoints, 150);
    for (const d of run.decisions) {
      assert.equal(d.blindGuessPenalty, 25);
      assert.equal(d.probesInspectedCount, 0);
      assert.equal(d.selectedStamp, STAMP_TYPES.MISLEADING_CONTEXT);
    }
  });

  it("S-blind-6. blind-guesser lands exactly 50% accuracy (3 of 6 modal guesses)", () => {
    const run = runById.get("blind-guesser");
    assert.equal(run.correctCount, 3);
    assert.equal(run.accuracyPercent, 50);
  });

  it("S-skimmer-5. skimmer always picks the max signal-weight probe, always a key probe", () => {
    for (const d of DISPATCHES) {
      const weights = PROBE_TYPES.map((k) => ({ k, w: d.probes[k].signalWeight }));
      weights.sort((a, b) => b.w - a.w);
      const expectedTop = weights[0].k;
      // rebuild the same probe list the strategy uses: exactly {expectedTop}
      const result = calculateRoundScore({
        dispatch: d,
        selectedStamp: d.correctStamp,
        inspectedProbes: [expectedTop],
        currentStreak: 0,
      });
      assert.ok(d.keyProbes.includes(expectedTop));
      assert.equal(result.keyHits, 1);
    }
    const run = runById.get("single-probe-skimmer");
    for (const d of run.decisions) {
      assert.equal(d.keyHits, 1);
      assert.equal(d.isCorrect, true);
    }
  });

  it("S-efficient-5. evidence-efficient earns +10 efficiency on all 6 dispatches (585 S-rank)", () => {
    const run = runById.get("evidence-efficient");
    assert.equal(run.efficiencyBonusTotal, 60);
    assert.equal(run.accuracyPercent, 100);
    for (const d of run.decisions) {
      assert.equal(d.efficiencyBonus, 10);
      assert.equal(d.keyHits, 2);
      assert.equal(d.isCorrect, true);
    }
  });

  it("S-exhaustive-5. exhaustive probing drops efficiency to +5 per dispatch", () => {
    const run = runById.get("exhaustive-four-probe");
    assert.equal(run.efficiencyBonusTotal, 30);
    for (const d of run.decisions) {
      assert.equal(d.efficiencyBonus, 5);
      assert.equal(d.isCorrect, true);
    }
  });

  it("S-contrarian-5. contrarian-flip stamps a wrong verdict on all 6 despite key evidence", () => {
    const run = runById.get("contrarian-flip");
    assert.equal(run.accuracyPercent, 0);
    for (const d of run.decisions) {
      assert.equal(d.isCorrect, false);
      assert.notEqual(d.selectedStamp, d.correctStamp);
      assert.equal(d.keyHits, 2);
      assert.equal(d.roundScore, 25);
    }
  });

  it("S-order-6. evidence-efficient strictly outscores every other strategy", () => {
    const best = Math.max(...strategyRuns.map((r) => r.totalScore));
    assert.equal(runById.get("evidence-efficient").totalScore, best);
    for (const r of strategyRuns) {
      if (r.strategyId !== "evidence-efficient") {
        assert.ok(r.totalScore < best, `${r.strategyId} ties or beats efficient`);
      }
    }
  });

  it("S-order-7. comparator ranking: 585 > 555 > 459 > 150 > 106", () => {
    assert.ok(runById.get("evidence-efficient").totalScore > runById.get("exhaustive-four-probe").totalScore);
    assert.ok(runById.get("exhaustive-four-probe").totalScore > runById.get("single-probe-skimmer").totalScore);
    assert.ok(runById.get("single-probe-skimmer").totalScore > runById.get("contrarian-flip").totalScore);
    assert.ok(runById.get("contrarian-flip").totalScore > runById.get("blind-guesser").totalScore);
  });

  it("S-streak-8. truthful strategies ride a clean 1-6 streak, contrarian and blind never streak past 2", () => {
    for (const id of ["single-probe-skimmer", "evidence-efficient", "exhaustive-four-probe"]) {
      assert.deepEqual(runById.get(id).streakTrajectory, [1, 2, 3, 4, 5, 6]);
      assert.equal(runById.get(id).maxStreak, 6);
    }
    assert.equal(runById.get("contrarian-flip").maxStreak, 0);
    assert.equal(runById.get("blind-guesser").maxStreak, 2);
  });

  it("S-clean-9. running strategies does not mutate the engine dispatch table", () => {
    const before = JSON.stringify(DISPATCHES.map((d) => [d.id, d.correctStamp, d.keyProbes]));
    lab.compareStrategies();
    const after = JSON.stringify(DISPATCHES.map((d) => [d.id, d.correctStamp, d.keyProbes]));
    assert.equal(before, after);
  });
});

/* ------------------------------------------------------------------ */
/* 16-subset probe-signal payoff matrix                                */
/* ------------------------------------------------------------------ */

describe("Probe-Signal Payoff Matrix (6 x 16)", () => {
  it("M1. matrix holds exactly 6 dispatch rows of exactly 16 cells", () => {
    assert.equal(matrix.rows.length, 6);
    for (const row of matrix.rows) {
      assert.equal(row.cells.length, 16);
      assert.equal(row.dispatchId.startsWith("dispatch-"), true);
    }
  });

  it("M2. probeSubset returns the exact popcount subset for every mask 0..15", () => {
    for (let m = 0; m < 16; m += 1) {
      const expected = PROBE_TYPES.filter((_, bit) => (m & (1 << bit)) !== 0);
      assert.deepEqual(lab.probeSubset(m), expected);
      assert.equal(lab.maskForProbes(expected), m);
    }
  });

  it("M3. optimal mask equals the bitmask of the 2 keyProbes per dispatch", () => {
    for (const row of matrix.rows) {
      const d = getDispatchById(row.dispatchId);
      const expected = lab.maskForProbes(d.keyProbes);
      assert.equal(row.optimalMask, expected);
      assert.equal(row.cells[row.optimalMask].keyHits, 2);
    }
  });

  DISPATCHES.forEach((dispatch, di) => {
    describe(`Payoff row: ${dispatch.code}`, () => {
      const row = matrix.rows[di];

      for (let m = 0; m < 16; m += 1) {
        it(`M-${dispatch.code}-${m}. cell mask ${m} is bounded and formula-consistent`, () => {
          const cell = row.cells[m];
          assert.equal(cell.mask, m);
          assert.ok(cell.roundScore >= 0 && cell.roundScore <= 100);
          const subset = PROBE_TYPES.filter((_, bit) => (m & (1 << bit)) !== 0);
          assert.deepEqual(cell.probes, subset);
          assert.equal(cell.probeCount, subset.length);
          const raw =
            cell.accuracyPoints + cell.evidencePoints + cell.efficiencyBonus +
            cell.streakBonus - cell.blindGuessPenalty;
          assert.equal(cell.roundScore, Math.max(0, Math.min(100, raw)));
          assert.equal(
            cell.scorePerProbe,
            subset.length > 0 ? cell.roundScore / subset.length : 0
          );
          const direct = calculateRoundScore({
            dispatch,
            selectedStamp: dispatch.correctStamp,
            inspectedProbes: subset,
            currentStreak: 0,
          });
          assert.equal(cell.roundScore, direct.roundScore);
          assert.equal(cell.accuracyPoints, direct.accuracyPoints);
          assert.equal(cell.evidencePoints, direct.evidencePoints);
          assert.equal(cell.efficiencyBonus, direct.efficiencyBonus);
          assert.equal(cell.blindGuessPenalty, direct.blindGuessPenalty);
        });
      }

      it(`M-${dispatch.code}-opt. optimal key pair strictly dominates blind and exhaustive`, () => {
        const d = row.dominance;
        assert.equal(d.optimalIsMaxScore, true);
        assert.equal(d.beatsBlindOnScore, true);
        assert.equal(d.beatsBlindOnPerProbe, true);
        assert.equal(d.beatsExhaustiveOnPerProbe, true);
        assert.equal(d.beatsAllSupersetsOnPerProbe, true);
        assert.equal(d.strictlyDominates, true);
        assert.equal(row.optimal.roundScore, 95);
        assert.equal(row.blind.roundScore, 35);
        assert.equal(row.exhaustive.roundScore, 90);
      });
    });
  });

  it("M4. global summary flags all 6 dispatches dominant", () => {
    assert.equal(matrix.allDominant, true);
  });

  it("M5. no subset outscores the optimal pair on any dispatch", () => {
    for (const row of matrix.rows) {
      for (const cell of row.cells) {
        assert.ok(cell.roundScore <= row.optimal.roundScore);
      }
    }
  });

  it("M6. blind mask 0 always carries the -25 penalty, exhaustive never does", () => {
    for (const row of matrix.rows) {
      assert.equal(row.cells[0].blindGuessPenalty, 25);
      assert.equal(row.cells[15].blindGuessPenalty, 0);
    }
  });

  it("M7. every 3-probe superset containing both keyProbes ties 95 but loses per-probe", () => {
    for (const row of matrix.rows) {
      const threeWithKeys = row.cells.filter(
        (c) => c.probeCount === 3 && c.keyHits === 2
      );
      assert.equal(threeWithKeys.length, 2);
      for (const c of threeWithKeys) {
        assert.equal(c.roundScore, 95);
        assert.ok(c.scorePerProbe < row.optimal.scorePerProbe);
      }
    }
  });

  it("M8. single-key subsets score exactly 74 with 1.0 keyHit", () => {
    for (const row of matrix.rows) {
      for (const cell of row.cells) {
        if (cell.probeCount === 1 && cell.keyHits === 1) {
          assert.equal(cell.roundScore, 74);
        }
      }
    }
  });

  it("M9. payoffCell returns null for hostile masks and dispatches", () => {
    const d = DISPATCHES[0];
    for (const bad of [-1, 16, 17, NaN, Infinity, -Infinity, 1.5, "6", null, undefined]) {
      assert.equal(lab.payoffCell(d, bad), null);
    }
    assert.equal(lab.payoffCell(null, 5), null);
    assert.equal(lab.payoffCell(undefined, 0), null);
    assert.equal(lab.payoffCell("dispatch-01-flood-release", 5), null);
  });

  it("M10. probeSubset and maskForProbes reject hostile inputs", () => {
    for (const bad of [-1, 16, NaN, 1.5, "6", null, undefined]) {
      assert.equal(lab.probeSubset(bad), null);
    }
    assert.equal(lab.maskForProbes(null), null);
    assert.equal(lab.maskForProbes("whois"), null);
    assert.equal(lab.maskForProbes(["bogus"]), null);
    assert.equal(lab.maskForProbes(["whois", "bogus"]), null);
  });
});

/* ------------------------------------------------------------------ */
/* Custom Claim Stress Presets                                         */
/* ------------------------------------------------------------------ */

describe("Custom Claim Stress Presets", () => {
  const EXPECTED_PRESET_RESULTS = {
    "typosquat-sms": { risk: 68, stamp: "FABRICATED_IMPOSTER" },
    "truncated-axis": { risk: 44, stamp: "MISLEADING_CONTEXT" },
    "n11-study": { risk: 36, stamp: "MISLEADING_CONTEXT" },
    "gov-heat": { risk: 0, stamp: "VERIFIED_BULLETIN" },
    "synthetic-audio": { risk: 52, stamp: "FABRICATED_IMPOSTER" },
  };

  EXPECTED_PRESET_IDS.forEach((id) => {
    it(`P-${id}-1. exact risk score and stamp`, () => {
      const { evaluation } = lab.evaluatePreset(id);
      assert.equal(evaluation.riskScore, EXPECTED_PRESET_RESULTS[id].risk);
      assert.equal(evaluation.recommendedStamp, EXPECTED_PRESET_RESULTS[id].stamp);
    });

    it(`P-${id}-2. triggered signal count matches declared signalIds`, () => {
      const preset = lab.claimPresets().find((p) => p.id === id);
      const { evaluation } = lab.evaluatePreset(id);
      assert.equal(evaluation.triggeredCount, preset.signalIds.length);
      assert.equal(evaluation.remediations.length, preset.signalIds.length);
    });

    it(`P-${id}-3. result equals calling the real engine directly`, () => {
      const preset = lab.claimPresets().find((p) => p.id === id);
      const direct = evaluateCustomClaim(preset.signalIds.slice(), preset.headline);
      const viaLab = lab.evaluatePreset(id).evaluation;
      assert.deepEqual(viaLab, direct);
    });
  });

  it("P6. evaluatePreset throws on unknown preset ids", () => {
    for (const bad of ["bogus", "GOV-HEAT", "", null, undefined, 9, "__proto__"]) {
      assert.throws(() => lab.evaluatePreset(bad), /Unknown claim preset/);
    }
  });

  it("P7. preset headlines and notes are free of em/en dashes", () => {
    for (const p of lab.claimPresets()) {
      assert.equal(/[\u2013\u2014]/.test(p.headline), false);
      assert.equal(/[\u2013\u2014]/.test(p.note), false);
      assert.equal(/[\u2013\u2014]/.test(p.label), false);
    }
  });

  it("P8. every preset risk score is inside 0..100", () => {
    for (const id of PRESET_IDS) {
      const { evaluation } = lab.evaluatePreset(id);
      assert.ok(evaluation.riskScore >= 0 && evaluation.riskScore <= 100);
    }
  });

  it("P9. gov-heat preset is the clean low-risk control", () => {
    const { evaluation, preset } = lab.evaluatePreset("gov-heat");
    assert.equal(preset.signalIds.length, 0);
    assert.equal(evaluation.riskScore, 0);
    assert.match(evaluation.verdictLabel, /LOW RISK/);
  });
});

/* ------------------------------------------------------------------ */
/* Audited Desk Brief Exporter                                         */
/* ------------------------------------------------------------------ */

describe("Audited Desk Brief Exporter", () => {
  function fullSGame() {
    let st = createInitialGameState();
    for (const d of DISPATCHES) {
      st = inspectProbe(st, d.id, d.keyProbes[0]);
      st = inspectProbe(st, d.id, d.keyProbes[1]);
      st = submitDispatchStamp(st, d.id, d.correctStamp);
    }
    return st;
  }

  it("B1. briefForState caches ONE canonical payload per state key", () => {
    const st = fullSGame();
    const b1 = lab.briefForState(st);
    const b2 = lab.briefForState(st);
    assert.equal(b1, b2, "expected the same cached brief object");
    assert.equal(b1.sha256, b2.sha256);
  });

  it("B2. digest parity: on-page, JSON, CSV header, and MD footer carry one digest", () => {
    const b = lab.briefForState(fullSGame());
    const digest = b.sha256;
    assert.match(digest, /^[0-9a-f]{64}$/);
    assert.equal(b.payload.integrity.canonicalJsonSha256, digest);
    assert.ok(b.json.includes(`"canonicalJsonSha256": "${digest}"`));
    assert.ok(b.csv.includes(`# sha256: ${digest}`));
    assert.ok(b.markdown.includes(`- Digest: ${digest}`));
  });

  it("B3. verifyBrief validates the intact signed payload", () => {
    const b = lab.briefForState(fullSGame());
    const res = lab.verifyBrief(b.payload);
    assert.equal(res.valid, true);
    assert.equal(res.expectedSha, b.sha256);
    assert.equal(res.actualSha, b.sha256);
  });

  it("B4. verifyBrief validates the exported JSON text", () => {
    const b = lab.briefForState(fullSGame());
    const res = lab.verifyBrief(b.json);
    assert.equal(res.valid, true);
  });

  it("B5. tamperDemo: intact passes, one edited field is caught", () => {
    const demo = lab.tamperDemo(fullSGame());
    assert.equal(demo.intactValid, true);
    assert.equal(demo.tamperedValid, false);
    assert.equal(demo.tamperCaught, true);
    assert.notEqual(demo.tamperedDigest, demo.intactDigest);
  });

  const TAMPER_PATHS = [
    (p) => { p.deskTotals.totalScore = 999; },
    (p) => { p.deskTotals.accuracyPercent = 1; },
    (p) => { p.decisions[0].roundScore = 0; },
    (p) => { p.decisions[0].isCorrect = false; },
    (p) => { p.decisions[0].selectedStamp = "VERIFIED_BULLETIN"; },
    (p) => { p.schema = "forged/9"; },
    (p) => { p.disclosure = "human playtesters"; },
    (p) => { delete p.deskTotals.streak; },
    (p) => { p.decisions.push({ dispatchId: "fake", roundScore: 100 }); },
  ];

  TAMPER_PATHS.forEach((mutate, i) => {
    it(`B6-${i + 1}. tamper path ${i + 1} is detected`, () => {
      const b = lab.briefForState(fullSGame());
      const forged = JSON.parse(b.json);
      mutate(forged);
      const res = lab.verifyBrief(forged);
      assert.equal(res.valid, false, `tamper path ${i + 1} not caught`);
      assert.equal(res.expectedSha, b.sha256);
      assert.notEqual(res.actualSha, b.sha256);
    });
  });

  it("B7. verifyBrief rejects malformed inputs fail-closed", () => {
    for (const bad of [
      "not json", "{", "[1,2]", "null", "42", "",
      JSON.stringify({ integrity: { algorithm: "MD5" } }),
      JSON.stringify({ integrity: { algorithm: "SHA-256" } }),
      JSON.stringify({ integrity: { algorithm: "SHA-256", canonicalJsonSha256: "zz" } }),
      JSON.stringify({ integrity: { algorithm: "SHA-256", canonicalJsonSha256: "0".repeat(64) }, x: 1 }),
    ]) {
      const res = lab.verifyBrief(bad);
      assert.equal(res.valid, false, `accepted malformed: ${bad.slice(0, 40)}`);
    }
    assert.equal(lab.verifyBrief(null).valid, false);
    assert.equal(lab.verifyBrief([1, 2]).valid, false);
    assert.equal(lab.verifyBrief(42).valid, false);
  });

  it("B8. empty desk state still produces a verifiable brief with 0 decisions", () => {
    const b = lab.briefForState(createInitialGameState());
    assert.equal(b.payload.decisions.length, 0);
    assert.equal(b.payload.deskTotals.completedCount, 0);
    assert.equal(lab.verifyBrief(b.payload).valid, true);
    assert.equal(lab.tamperDemo(createInitialGameState()).tamperCaught, true);
  });

  it("B9. brief is deterministic: same state yields the same digest in a fresh lab", () => {
    const st = fullSGame();
    const b1 = lab.briefForState(st);
    const lab2 = SDLab.createLab(engine);
    const b2 = lab2.briefForState(st);
    assert.equal(b1.sha256, b2.sha256);
    assert.equal(b1.json, b2.json);
  });

  it("B10. CSV provenance header and one row per decision", () => {
    const b = lab.briefForState(fullSGame());
    const lines = b.csv.trimEnd().split("\n");
    assert.equal(lines[0], "# sourcedesk-desk-brief/1");
    assert.match(lines[1], /^# sha256: [0-9a-f]{64}$/);
    assert.equal(lines[3], "dispatch_code,dispatch_id,selected_stamp,correct_stamp,is_correct,round_score,accuracy_points,evidence_points,efficiency_bonus,streak_bonus,blind_penalty,key_hits,probes_inspected,revised");
    assert.equal(lines.length - 4, 6);
  });

  it("B11. JSON brief round-trips schema, totals, and all 6 decisions", () => {
    const b = lab.briefForState(fullSGame());
    const parsed = JSON.parse(b.json);
    assert.equal(parsed.schema, "sourcedesk-desk-brief/1");
    assert.equal(parsed.deskTotals.totalScore, 585);
    assert.equal(parsed.decisions.length, 6);
    assert.equal(parsed.decisions[0].roundScore, 95);
    assert.equal(parsed.decisions[5].roundScore, 100);
  });

  it("B12. markdown footer states the digest scope honestly", () => {
    const b = lab.briefForState(fullSGame());
    assert.match(b.markdown, /SHA-256 over canonical JSON/);
    assert.match(b.markdown, /not a signature/);
    assert.match(b.markdown, /automated bot simulation harness across 592,704/);
  });

  it("B13. hostile state fields are normalized instead of crashing", () => {
    const hostile = {
      decisionsByDispatch: {
        "dispatch-01-flood-release": {
          selectedStamp: 42,
          isCorrect: "yes",
          roundScore: Infinity,
          efficiencyBonus: NaN,
          blindGuessPenalty: -Infinity,
        },
      },
      totalScore: NaN,
      streak: -Infinity,
      maxStreak: undefined,
      sharesPrevented: "many",
      verifiedReachSupported: null,
    };
    const b = lab.briefForState(hostile);
    assert.equal(lab.verifyBrief(b.payload).valid, true);
    assert.equal(b.payload.decisions.length, 1);
    assert.equal(b.payload.decisions[0].roundScore, 0);
    assert.equal(b.payload.decisions[0].selectedStamp, "");
  });

  it("B14. briefForState on junk state never throws", () => {
    for (const junk of [null, undefined, 0, "x", [], { decisionsByDispatch: "no" }]) {
      const b = lab.briefForState(junk);
      assert.equal(lab.verifyBrief(b.payload).valid, true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Strict #sd= URL-hash bookmark codec                                 */
/* ------------------------------------------------------------------ */

describe("URL-Hash Bookmark Codec (#sd=)", () => {
  it("D1. encode emits the #sd= prefix and a strict b64url payload", () => {
    const h = lab.encodeBookmark({ ed: "evidence-efficient", dp: 2, pm: 11, cp: "n11-study" });
    assert.ok(h.startsWith("#sd="));
    assert.match(h.slice(4), /^[A-Za-z0-9_-]+$/);
  });

  it("D2. full round-trip restores all four fields", () => {
    const state = { ed: "contrarian-flip", dp: 5, pm: 15, cp: "synthetic-audio" };
    assert.deepEqual(lab.decodeBookmark(lab.encodeBookmark(state)), state);
  });

  it("D3. empty state round-trips to the normalized all-null shape", () => {
    assert.deepEqual(lab.decodeBookmark(lab.encodeBookmark({})), {
      ed: null, dp: null, pm: null, cp: null,
    });
    assert.deepEqual(lab.decodeBookmark(lab.encodeBookmark(null)), {
      ed: null, dp: null, pm: null, cp: null,
    });
  });

  STRATEGY_IDS.forEach((id) => {
    it(`D-ed-${id}. strategy ${id} round-trips`, () => {
      const d = lab.decodeBookmark(lab.encodeBookmark({ ed: id }));
      assert.equal(d.ed, id);
    });
  });

  for (let dp = 0; dp < 6; dp += 1) {
    it(`D-dp-${dp}. dispatch index ${dp} round-trips`, () => {
      const d = lab.decodeBookmark(lab.encodeBookmark({ dp }));
      assert.equal(d.dp, dp);
    });
  }

  for (let pm = 0; pm < 16; pm += 1) {
    it(`D-pm-${pm}. probe mask ${pm} round-trips`, () => {
      const d = lab.decodeBookmark(lab.encodeBookmark({ pm }));
      assert.equal(d.pm, pm);
    });
  }

  PRESET_IDS.forEach((id) => {
    it(`D-cp-${id}. preset ${id} round-trips`, () => {
      const d = lab.decodeBookmark(lab.encodeBookmark({ cp: id }));
      assert.equal(d.cp, id);
    });
  });

  it("D4. invalid field values are dropped at encode, not encoded corrupt", () => {
    const h = lab.encodeBookmark({ ed: "bogus", dp: 99, pm: -3, cp: "bogus" });
    const d = lab.decodeBookmark(h);
    assert.deepEqual(d, { ed: null, dp: null, pm: null, cp: null });
  });

  it("D5. decode rejects malformed base strings fail-closed", () => {
    for (const bad of [
      null, undefined, 42, {}, [], "",
      "#sd=", "#sd=x", "#sd=%%%notb64", "#sd=" + "a".repeat(600),
      "#other=eyJ2IjoxfQ", "random-text",
    ]) {
      assert.equal(lab.decodeBookmark(bad), null, `accepted: ${String(bad).slice(0, 30)}`);
    }
  });

  it("D6. decode rejects structurally corrupt payloads", () => {
    for (const doc of [
      "not json at all",
      "[1,2,3]",
      "null",
      "42",
      '"text"',
      '{"v":9}',
      '{"v":null}',
      '{"v":1.5}',
      '{"ed":"evidence-efficient"}',
      '{"v":1,"ed":"bogus"}',
      '{"v":1,"dp":6}',
      '{"v":1,"dp":-1}',
      '{"v":1,"dp":1.5}',
      '{"v":1,"dp":"2"}',
      '{"v":1,"pm":16}',
      '{"v":1,"pm":-1}',
      '{"v":1,"pm":1.5}',
      '{"v":1,"pm":"11"}',
      '{"v":1,"cp":"bogus"}',
      '{"v":1,"cp":42}',
      '{"v":1,"ed":42}',
      '{"v":1,"__proto__":{"x":1}}',
      '{"v":1,"constructor":{"x":1}}',
      '{"v":1,"extra":1}',
      '{"v":1,"ed":"blind-guesser","zzz":1}',
    ]) {
      const h = "#sd=" + b64url(doc);
      assert.equal(lab.decodeBookmark(h), null, `accepted corrupt doc: ${doc}`);
    }
  });

  it("D7. decode accepts hash with or without the leading # character", () => {
    const h = lab.encodeBookmark({ dp: 3 });
    assert.deepEqual(lab.decodeBookmark(h), { ed: null, dp: 3, pm: null, cp: null });
    assert.deepEqual(lab.decodeBookmark(h.slice(1)), { ed: null, dp: 3, pm: null, cp: null });
  });

  it("D8. decoded output exposes exactly the 4 normalized fields", () => {
    const d = lab.decodeBookmark(lab.encodeBookmark({ ed: "blind-guesser" }));
    assert.deepEqual(Object.keys(d).sort(), ["cp", "dp", "ed", "pm"]);
  });

  it("D9. encode drops wrong-typed values silently", () => {
    const h = lab.encodeBookmark({ ed: 42, dp: "3", pm: "7", cp: null });
    assert.deepEqual(lab.decodeBookmark(h), { ed: null, dp: null, pm: null, cp: null });
  });

  it("D10. -0 probe mask normalizes to 0 through the codec", () => {
    const h = lab.encodeBookmark({ pm: -0 });
    assert.deepEqual(lab.decodeBookmark(h), { ed: null, dp: null, pm: 0, cp: null });
  });
});

/* ------------------------------------------------------------------ */
/* In-page deterministic self-tests                                    */
/* ------------------------------------------------------------------ */

describe("In-Page Deterministic Self-Test Runner", () => {
  const results = lab.runSelfTests();
  const byId = new Map(results.map((r) => [r.id, r]));
  const EXPECTED_CHECK_IDS = [
    "sha256-empty", "sha256-abc", "sha256-448", "sha256-utf8",
    "canonical-sort", "blind-penalty", "efficiency-10", "freeze-invariance",
    "dominance-6x16", "claim-bounds", "csv-injection", "tamper-detect",
    "codec-roundtrip", "strategy-determinism", "matrix-shape", "probe-counts",
  ];

  it("T1. runner returns at least 14 checks", () => {
    assert.ok(results.length >= 14, `only ${results.length} checks`);
  });

  it("T2. every check passes", () => {
    const failed = results.filter((r) => !r.pass);
    assert.equal(failed.length, 0, `failing: ${failed.map((f) => f.id).join(", ")}`);
  });

  it("T3. check ids are unique and named", () => {
    const ids = results.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const r of results) {
      assert.ok(r.name.length > 5);
      assert.ok(r.detail.length > 0);
    }
  });

  EXPECTED_CHECK_IDS.forEach((id) => {
    it(`T4-${id}. check ${id} exists and passes`, () => {
      assert.ok(byId.has(id), `missing check ${id}`);
      assert.equal(byId.get(id).pass, true);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Hostile input sweep across the lab surface                          */
/* ------------------------------------------------------------------ */

describe("Hostile Input Sweep", () => {
  it("X1. NaN / Infinity / -0 numeric hostiles", () => {
    assert.equal(lab.probeSubset(NaN), null);
    assert.equal(lab.probeSubset(Infinity), null);
    assert.equal(lab.probeSubset(-Infinity), null);
    assert.equal(lab.payoffCell(DISPATCHES[0], NaN), null);
    assert.equal(lab.payoffCell(DISPATCHES[0], Infinity), null);
    assert.equal(lab.maskForProbes(NaN), null);
    assert.throws(() => lab.runStrategy(NaN));
    assert.throws(() => lab.evaluatePreset(NaN));
  });

  it("X2. __proto__ and constructor keys are blocked across codec and signals", () => {
    assert.equal(
      lab.decodeBookmark("#sd=" + b64url('{"v":1,"__proto__":1,"ed":"blind-guesser"}')),
      null
    );
    const ev = evaluateCustomClaim(["__proto__", "constructor"], "calm text");
    assert.equal(ev.riskScore, 0);
    assert.equal({}.polluted, undefined);
  });

  it("X3. XSS strings in custom claim text stay inert text", () => {
    for (const xss of [
      '<img src=x onerror=alert(1)>',
      '"><script>alert(1)</script>',
      'javascript:alert(1)',
      '<svg onload=alert(1)>',
      '${alert(1)}',
    ]) {
      const ev = evaluateCustomClaim([], xss);
      assert.ok(ev.riskScore >= 0 && ev.riskScore <= 100);
      assert.equal(typeof ev.verdictLabel, "string");
    }
  });

  it("X4. oversize and weird hash payloads fail closed", () => {
    assert.equal(lab.decodeBookmark("#sd=" + "A".repeat(513)), null);
    const deep = '{"v":1,"ed":"' + "x".repeat(4000) + '"}';
    assert.equal(lab.decodeBookmark("#sd=" + b64url(deep)), null);
  });

  it("X5. runStrategy on hostile dispatch engine stays deterministic-safe", () => {
    for (const bad of [null, undefined, {}, "x", 0]) {
      assert.throws(() => lab.runStrategy(bad), /Unknown strategy id/);
    }
  });

  it("X6. codec cannot smuggle a second document through concatenation", () => {
    const h1 = lab.encodeBookmark({ dp: 1 }).slice(4);
    assert.equal(lab.decodeBookmark("#sd=" + h1 + h1), null);
  });

  it("X7. brief hostile decision fields are clamped to safe values", () => {
    const st = {
      decisionsByDispatch: {
        "dispatch-01-flood-release": {
          selectedStamp: "<script>",
          isCorrect: 1,
          roundScore: 1e9,
          accuracyPoints: -50,
          probesInspectedCount: 99,
          revisedFromFirstAttempt: "yes",
        },
      },
      totalScore: Infinity,
      streak: NaN,
      maxStreak: -1e9,
      sharesPrevented: {},
      verifiedReachSupported: [],
    };
    const b = lab.briefForState(st);
    const d = b.payload.decisions[0];
    assert.equal(d.selectedStamp, "<script>");
    assert.equal(typeof d.isCorrect, "boolean");
    assert.equal(lab.verifyBrief(b.payload).valid, true);
  });

  it("X8. self-test runner itself stays deterministic", () => {
    const a = lab.runSelfTests().map((r) => r.pass).join("");
    const b = lab.runSelfTests().map((r) => r.pass).join("");
    assert.equal(a, b);
  });
});

/* ------------------------------------------------------------------ */
/* Integration guards: HTML wiring, styles, fonts, hygiene             */
/* ------------------------------------------------------------------ */

describe("Lab Integration & Hygiene Guards", () => {
  it("G1. index.html mounts the lab section with every id the UI reads", () => {
    const ids = [
      "calibration-lab", "strategy-table-body", "strategy-detail-line",
      "payoff-heatmap-holder", "payoff-cell-detail", "claim-preset-row",
      "btn-export-json", "btn-export-csv", "btn-export-md", "btn-copy-share",
      "btn-verify-brief", "brief-digest-line", "export-status-line",
      "btn-run-selftests", "selftest-summary", "selftest-results",
    ];
    for (const id of ids) {
      assert.ok(indexHtml.includes(`id="${id}"`), `missing #${id}`);
    }
  });

  it("G2. index.html loads calibration-lab.js before the lab UI module", () => {
    const classic = indexHtml.indexOf('<script src="./js/calibration-lab.js">');
    const ui = indexHtml.indexOf('<script type="module" src="./js/calibration-lab-ui.js">');
    assert.ok(classic > -1 && ui > -1 && classic < ui);
  });

  it("G3. lab UI hides the section gracefully when SDLab is absent", () => {
    assert.match(labUiJs, /section\.hidden = true/);
    assert.match(labUiJs, /SDLab\.createLab/);
  });

  it("G4. lab section is hidden in @media print", () => {
    const printBlock = stylesCss.slice(stylesCss.indexOf("@media print"));
    assert.match(printBlock, /\.calibration-lab-section\s*\{[^}]*display:\s*none/);
  });

  it("G5. zero em-dashes or en-dashes across all new lab code and markup", () => {
    for (const [name, text] of [
      ["index.html", indexHtml],
      ["styles.css", stylesCss],
      ["calibration-lab.js", labJs],
      ["calibration-lab-ui.js", labUiJs],
    ]) {
      assert.equal(/[\u2013\u2014]/.test(text), false, `dash found in ${name}`);
    }
  });

  it("G6. no emoji in lab code or markup", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const [name, text] of [
      ["index.html", indexHtml],
      ["calibration-lab.js", labJs],
      ["calibration-lab-ui.js", labUiJs],
    ]) {
      assert.equal(emojiRegex.test(text), false, `emoji found in ${name}`);
    }
  });

  it("G7. zero external font/network references: fonts are self-hosted", () => {
    assert.equal(indexHtml.includes("fonts.googleapis.com"), false);
    assert.equal(indexHtml.includes("fonts.gstatic.com"), false);
    const fonts = fs.readdirSync(path.join(repoRoot, "fonts")).filter((f) => f.endsWith(".woff2"));
    assert.equal(fonts.length, 9);
    assert.match(stylesCss, /url\("\.\/fonts\/instrument-serif-400\.woff2"\)/);
    assert.match(stylesCss, /url\("\.\/fonts\/jetbrains-mono-700\.woff2"\)/);
    assert.match(stylesCss, /url\("\.\/fonts\/space-grotesk-700\.woff2"\)/);
  });

  it("G8. CSP tightened to self-only for style and font sources", () => {
    assert.match(indexHtml, /style-src 'self';/);
    assert.match(indexHtml, /font-src 'self';/);
    assert.equal(indexHtml.includes("connect-src 'self'"), true);
  });

  it("G9. honest playtesting disclosure is still present", () => {
    assert.match(indexHtml, /automated bot simulation harness across 592,704 simulated/);
    assert.match(labJs, /automated bot simulation harness across 592,704/);
  });

  it("G10. no personal emails or street addresses in lab files", () => {
    for (const [name, text] of [
      ["index.html", indexHtml],
      ["calibration-lab.js", labJs],
      ["calibration-lab-ui.js", labUiJs],
      ["styles.css", stylesCss],
    ]) {
      assert.equal(/someone@gmail\.com/i.test(text), false, name);
      assert.equal(/handle-redacted286@gmail\.com/i.test(text), false, name);
      assert.equal(/Exampleton\s+Manor/i.test(text), false, name);
    }
  });

  it("G11. lab section uses no uppercase eyebrow kicker or tagline under h2", () => {
    const section = indexHtml.slice(indexHtml.indexOf('id="calibration-lab"'), indexHtml.indexOf('id="print-guide"'));
    assert.equal(/<h2[^>]*>\s*<span/i.test(section), false);
    const h2Idx = section.indexOf("<h2>");
    const pIdx = section.indexOf("<p");
    // intro paragraph follows the h2, as in the custom verifier pattern
    assert.ok(pIdx > h2Idx);
    assert.equal(/eyebrow|kicker/i.test(section), false);
  });

  it("G12. keyboard instruments 1-4 and V, M, F, N still resolve through the engine", () => {
    assert.deepEqual(engine.resolveKeyboardShortcut("1", false), { action: "probe", probeKey: "whois" });
    assert.deepEqual(engine.resolveKeyboardShortcut("4", false), { action: "probe", probeKey: "rhetoric" });
    assert.deepEqual(engine.resolveKeyboardShortcut("v", false), { action: "stamp", stampType: "VERIFIED_BULLETIN" });
    assert.deepEqual(engine.resolveKeyboardShortcut("m", false), { action: "stamp", stampType: "MISLEADING_CONTEXT" });
    assert.deepEqual(engine.resolveKeyboardShortcut("f", false), { action: "stamp", stampType: "FABRICATED_IMPOSTER" });
    assert.deepEqual(engine.resolveKeyboardShortcut("n", false), { action: "next" });
    const appJs = fs.readFileSync(path.join(repoRoot, "js/app.js"), "utf8");
    assert.match(appJs, /resolveKeyboardShortcut\(event\.key, isInput\)/);
    assert.match(indexHtml, /id="btn-toggle-keys"/);
    assert.match(stylesCss, /:focus-visible\s*\{[\s\S]*?outline:/);
  });
});
