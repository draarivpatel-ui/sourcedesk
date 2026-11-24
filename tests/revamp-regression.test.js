import test from "node:test";
import assert from "node:assert/strict";
import * as engine from "../js/sourcedesk-engine.js";
import "../js/calibration-lab.js";

const lab = globalThis.SDLab.createLab(engine);
const first = engine.DISPATCHES[0];

function validFirstDecisionState() {
  let state = engine.createInitialGameState();
  for (const probe of first.keyProbes) {
    state = engine.inspectProbe(state, first.id, probe);
  }
  return engine.submitDispatchStamp(state, first.id, first.correctStamp);
}

test("a correction re-stamp validates the stamp type before writing state", () => {
  const state = validFirstDecisionState();
  assert.throws(
    () => engine.submitDispatchStamp(state, first.id, "BOGUS_STAMP"),
    /Invalid stamp type/
  );
});

test("non finite streak input degrades to zero instead of poisoning nextStreak", () => {
  for (const bad of [Infinity, -Infinity, NaN]) {
    const result = engine.calculateRoundScore({
      dispatch: first,
      selectedStamp: first.correctStamp,
      inspectedProbes: first.keyProbes,
      currentStreak: bad,
    });
    assert.equal(result.streakBonus, 0);
    assert.equal(result.nextStreak, 1);
    assert.ok(Number.isFinite(result.nextStreak));
  }
});

test("selectDispatchIndex rejects null blank and boolean indices", () => {
  const state = engine.createInitialGameState();
  for (const bad of [null, "", "   ", false, true]) {
    assert.throws(() => engine.selectDispatchIndex(state, bad), /Invalid dispatch index/);
  }
  assert.equal(engine.selectDispatchIndex(state, "3").currentIndex, 3);
});

test("non finite total score cannot inflate the newsroom rating", () => {
  assert.equal(engine.computeNewsroomRating(Infinity, 6).grade, "C");
  assert.equal(engine.computeNewsroomRating(NaN, 6).grade, "C");
  assert.equal(engine.computeNewsroomRating(-50, 6).grade, "C");
  assert.equal(engine.computeNewsroomRating(95, 0).grade, "S");
});

test("desk brief completion counts only real dispatch decisions", () => {
  const state = validFirstDecisionState();
  const polluted = {
    ...state,
    decisionsByDispatch: {
      ...state.decisionsByDispatch,
      "fake-dispatch": { isCorrect: true, roundScore: 100 },
    },
  };
  const brief = lab.briefForState(polluted);
  assert.equal(brief.payload.decisions.length, 1);
  assert.equal(brief.payload.deskTotals.completedCount, 1);
  assert.equal(brief.payload.deskTotals.correctCount, 1);
});

test("the strict bookmark codec rejects non canonical payload bytes", () => {
  assert.deepEqual(lab.decodeBookmark("#sd=eyJ2IjoxLCJkcCI6MX0"), { ed: null, dp: 1, pm: null, cp: null });
  assert.equal(lab.decodeBookmark("#sd=eyJ2IjoxLCJkcCI6MX0JCQ"), null);
});
