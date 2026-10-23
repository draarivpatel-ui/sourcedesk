import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STAMP_TYPES,
  STAMP_LABELS,
  PROBE_TYPES,
  PROBE_METADATA,
  DISPATCHES,
  CUSTOM_CLAIM_SIGNALS,
  getDispatchById,
  createInitialGameState,
  getInspectedProbes,
  inspectProbe,
  calculateRoundScore,
  submitDispatchStamp,
  computeNewsroomRating,
  evaluateCustomClaim,
  resolveKeyboardShortcut,
  selectDispatchIndex,
  advanceToNextDispatch,
  toggleAudioMute,
  getDispatchProgressSummary,
} from "../js/sourcedesk-engine.js";

describe("SourceDesk Core Verification & Lateral-Reading Engine", () => {
  it("1. defines exactly 3 editorial stamp types and labels", () => {
    assert.equal(Object.keys(STAMP_TYPES).length, 3);
    assert.equal(STAMP_LABELS[STAMP_TYPES.VERIFIED_BULLETIN], "VERIFIED BULLETIN");
    assert.equal(STAMP_LABELS[STAMP_TYPES.MISLEADING_CONTEXT], "MISLEADING CONTEXT");
    assert.equal(STAMP_LABELS[STAMP_TYPES.FABRICATED_IMPOSTER], "FABRICATED / IMPOSTER");
  });

  it("2. defines 4 lateral-reading probe instruments with keyboard shortcuts 1-4", () => {
    assert.deepEqual(PROBE_TYPES, ["whois", "forensics", "primary", "rhetoric"]);
    assert.equal(PROBE_METADATA.whois.shortcutKey, "1");
    assert.equal(PROBE_METADATA.forensics.shortcutKey, "2");
    assert.equal(PROBE_METADATA.primary.shortcutKey, "3");
    assert.equal(PROBE_METADATA.rhetoric.shortcutKey, "4");
  });

  it("3. ships 6 authentic civic verification dispatches with complete probe telemetry", () => {
    assert.equal(DISPATCHES.length, 6);
    const ids = DISPATCHES.map((d) => d.id);
    assert.deepEqual(ids, [
      "dispatch-01-flood-release",
      "dispatch-02-miracle-study",
      "dispatch-03-aid-portal",
      "dispatch-04-nws-heat-bulletin",
      "dispatch-05-cherry-picked-chart",
      "dispatch-06-synthetic-audio",
    ]);

    for (const d of DISPATCHES) {
      assert.ok(d.headline.length > 10);
      assert.ok(d.viralVelocity >= 10000);
      assert.equal(d.keyProbes.length, 2);
      for (const pKey of PROBE_TYPES) {
        assert.ok(d.probes[pKey], `Missing probe ${pKey} on ${d.id}`);
        assert.ok(d.probes[pKey].summary.length > 15);
        assert.ok(d.probes[pKey].telemetry.length > 10);
      }
    }
  });

  it("4. getDispatchById resolves valid dispatch IDs and returns null for invalid inputs", () => {
    const first = getDispatchById("dispatch-01-flood-release");
    assert.ok(first);
    assert.equal(first.code, "SD-2026-01");
    assert.equal(getDispatchById("non-existent-id"), null);
    assert.equal(getDispatchById(""), null);
    assert.equal(getDispatchById("   "), null);
    assert.equal(getDispatchById(null), null);
    assert.equal(getDispatchById(undefined), null);
    assert.equal(getDispatchById(42), null);
  });

  it("5. createInitialGameState initializes clean zeroed telemetry and unmuted audio", () => {
    const state = createInitialGameState();
    assert.equal(state.currentIndex, 0);
    assert.equal(state.streak, 0);
    assert.equal(state.maxStreak, 0);
    assert.equal(state.totalScore, 0);
    assert.equal(state.sharesPrevented, 0);
    assert.equal(state.verifiedReachSupported, 0);
    assert.equal(state.audioMuted, false);
    assert.deepEqual(state.inspectedProbesByDispatch, {});
    assert.deepEqual(state.decisionsByDispatch, {});
  });

  it("6. getInspectedProbes safely handles invalid state or dispatchId", () => {
    assert.deepEqual(getInspectedProbes(null, "dispatch-01-flood-release"), []);
    assert.deepEqual(getInspectedProbes("bad", "dispatch-01-flood-release"), []);
    const state = createInitialGameState();
    assert.deepEqual(getInspectedProbes(state, 123), []);
    assert.deepEqual(getInspectedProbes(state, "dispatch-01-flood-release"), []);
  });

  it("7. inspectProbe records unique probe inspections immutably", () => {
    const s0 = createInitialGameState();
    const s1 = inspectProbe(s0, "dispatch-01-flood-release", "forensics");
    assert.deepEqual(getInspectedProbes(s0, "dispatch-01-flood-release"), []);
    assert.deepEqual(getInspectedProbes(s1, "dispatch-01-flood-release"), ["forensics"]);

    // Inspecting same probe again is idempotent
    const s2 = inspectProbe(s1, "dispatch-01-flood-release", "forensics");
    assert.deepEqual(getInspectedProbes(s2, "dispatch-01-flood-release"), ["forensics"]);

    // Inspecting second probe appends in order
    const s3 = inspectProbe(s2, "dispatch-01-flood-release", "primary");
    assert.deepEqual(getInspectedProbes(s3, "dispatch-01-flood-release"), [
      "forensics",
      "primary",
    ]);
  });

  it("8. inspectProbe throws on unknown dispatchId or invalid probeKey", () => {
    const state = createInitialGameState();
    assert.throws(() => inspectProbe(state, "bad-dispatch", "whois"), /Unknown dispatch id/);
    assert.throws(
      () => inspectProbe(state, "dispatch-01-flood-release", "invalid-probe"),
      /Invalid probe key/
    );
  });

  it("9. calculateRoundScore validates dispatch and stamp inputs", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    assert.throws(
      () => calculateRoundScore({ dispatch: null, selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT }),
      /Valid dispatch object/
    );
    assert.throws(
      () => calculateRoundScore({ dispatch: "str", selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT }),
      /Valid dispatch object/
    );
    assert.throws(
      () => calculateRoundScore({ dispatch: d1, selectedStamp: "BAD_STAMP" }),
      /Invalid stamp type/
    );
  });

  it("10. calculateRoundScore awards 95 base points (60+25+10) when correct with both key probes inspected", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["forensics", "primary"],
      currentStreak: 0,
    });
    assert.equal(res.isCorrect, true);
    assert.equal(res.accuracyPoints, 60);
    assert.equal(res.evidencePoints, 25);
    assert.equal(res.efficiencyBonus, 10);
    assert.equal(res.blindGuessPenalty, 0);
    assert.equal(res.streakBonus, 0);
    assert.equal(res.roundScore, 95);
    assert.equal(res.nextStreak, 1);
    assert.equal(res.sharesPreventedDelta, 18400);
    assert.equal(res.verifiedReachDelta, 0);
  });

  it("11. calculateRoundScore caps roundScore at 100 when streak bonus is active", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["forensics", "primary"],
      currentStreak: 5,
    });
    assert.equal(res.streakBonus, 5);
    assert.equal(res.roundScore, 100);
    assert.equal(res.nextStreak, 6);
  });

  it("12. calculateRoundScore reduces efficiency bonus to 5 when all 4 probes are inspected", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["whois", "forensics", "primary", "rhetoric"],
      currentStreak: 0,
    });
    assert.equal(res.evidencePoints, 25);
    assert.equal(res.efficiencyBonus, 5);
    assert.equal(res.roundScore, 90);
  });

  it("13. calculateRoundScore handles 1 key probe + 1 non-key probe accurately", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["forensics", "whois"],
      currentStreak: 0,
    });
    assert.equal(res.keyHits, 1);
    assert.equal(res.evidencePoints, 14);
    assert.equal(res.efficiencyBonus, 5);
    assert.equal(res.roundScore, 79);
    assert.equal(res.sharesPreventedDelta, Math.round(18400 * 0.85));
  });

  it("14. calculateRoundScore handles 1 non-key probe only (0 key hits, 1 probe inspected)", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["whois"],
      currentStreak: 0,
    });
    assert.equal(res.keyHits, 0);
    assert.equal(res.evidencePoints, 6);
    assert.equal(res.efficiencyBonus, 0);
    assert.equal(res.roundScore, 66);
    assert.equal(res.sharesPreventedDelta, Math.round(18400 * 0.65));
  });

  it("15. calculateRoundScore applies 25-point blind-guess penalty when 0 probes are inspected", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const resCorrectBlind = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: [],
      currentStreak: 0,
    });
    assert.equal(resCorrectBlind.blindGuessPenalty, 25);
    assert.equal(resCorrectBlind.roundScore, 35);
    assert.equal(resCorrectBlind.sharesPreventedDelta, Math.round(18400 * 0.35));

    const resWrongBlind = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.VERIFIED_BULLETIN,
      inspectedProbes: null,
      currentStreak: 3,
    });
    assert.equal(resWrongBlind.isCorrect, false);
    assert.equal(resWrongBlind.roundScore, 0);
    assert.equal(resWrongBlind.nextStreak, 0);
    assert.equal(resWrongBlind.sharesPreventedDelta, 0);
  });

  it("16. calculateRoundScore awards evidence points even on an incorrect stamp and resets streak", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.VERIFIED_BULLETIN,
      inspectedProbes: ["forensics", "primary"],
      currentStreak: 4,
    });
    assert.equal(res.isCorrect, false);
    assert.equal(res.accuracyPoints, 0);
    assert.equal(res.evidencePoints, 25);
    assert.equal(res.efficiencyBonus, 0);
    assert.equal(res.streakBonus, 0);
    assert.equal(res.roundScore, 25);
    assert.equal(res.nextStreak, 0);
  });

  it("17. calculateRoundScore credits verifiedReachDelta on VERIFIED_BULLETIN dispatches", () => {
    const d4 = getDispatchById("dispatch-04-nws-heat-bulletin");
    const res = calculateRoundScore({
      dispatch: d4,
      selectedStamp: STAMP_TYPES.VERIFIED_BULLETIN,
      inspectedProbes: ["primary", "whois"],
      currentStreak: 2,
    });
    assert.equal(res.isCorrect, true);
    assert.equal(res.sharesPreventedDelta, 0);
    assert.equal(res.verifiedReachDelta, 19800);
    assert.equal(res.roundScore, 97);
  });

  it("18. submitDispatchStamp updates decisions, streak, maxStreak, and impact totals across all 6 dispatches", () => {
    let state = createInitialGameState();
    for (const d of DISPATCHES) {
      state = inspectProbe(state, d.id, d.keyProbes[0]);
      state = inspectProbe(state, d.id, d.keyProbes[1]);
      state = submitDispatchStamp(state, d.id, d.correctStamp);
    }
    assert.equal(state.streak, 6);
    assert.equal(state.maxStreak, 6);
    assert.equal(state.totalScore, 95 + 96 + 97 + 98 + 99 + 100);
    assert.equal(state.sharesPrevented, 18400 + 14200 + 26500 + 15600 + 23100);
    assert.equal(state.verifiedReachSupported, 19800);
  });

  it("19. submitDispatchStamp resets runningStreak on an incorrect decision while preserving maxStreak", () => {
    let state = createInitialGameState();
    const d1 = DISPATCHES[0];
    const d2 = DISPATCHES[1];
    const d3 = DISPATCHES[2];

    state = inspectProbe(state, d1.id, d1.keyProbes[0]);
    state = inspectProbe(state, d1.id, d1.keyProbes[1]);
    state = submitDispatchStamp(state, d1.id, d1.correctStamp);

    state = inspectProbe(state, d2.id, d2.keyProbes[0]);
    state = inspectProbe(state, d2.id, d2.keyProbes[1]);
    state = submitDispatchStamp(state, d2.id, d2.correctStamp);
    assert.equal(state.streak, 2);
    assert.equal(state.maxStreak, 2);

    // Wrong stamp on d3
    state = submitDispatchStamp(state, d3.id, STAMP_TYPES.VERIFIED_BULLETIN);
    assert.equal(state.streak, 0);
    assert.equal(state.maxStreak, 2);

    // Re-submitting d3 with correct stamp uses streakBefore and restores streak
    state = inspectProbe(state, d3.id, d3.keyProbes[0]);
    state = inspectProbe(state, d3.id, d3.keyProbes[1]);
    state = submitDispatchStamp(state, d3.id, d3.correctStamp);
    assert.equal(state.streak, 3);
    assert.equal(state.maxStreak, 3);
  });

  it("20. submitDispatchStamp throws on unknown dispatchId", () => {
    const state = createInitialGameState();
    assert.throws(
      () => submitDispatchStamp(state, "unknown-id", STAMP_TYPES.VERIFIED_BULLETIN),
      /Unknown dispatch id/
    );
  });

  it("21. computeNewsroomRating returns S, A, B, and C grades at exact boundary thresholds", () => {
    assert.equal(computeNewsroomRating(540, 6).grade, "S"); // avg 90.0
    assert.equal(computeNewsroomRating(539, 6).grade, "A"); // avg 89.83
    assert.equal(computeNewsroomRating(450, 6).grade, "A"); // avg 75.0
    assert.equal(computeNewsroomRating(449, 6).grade, "B"); // avg 74.83
    assert.equal(computeNewsroomRating(330, 6).grade, "B"); // avg 55.0
    assert.equal(computeNewsroomRating(329, 6).grade, "C"); // avg 54.83
    assert.equal(computeNewsroomRating(95, 0).grade, "S"); // completedCount fallback to 1
  });

  it("22. evaluateCustomClaim computes risk score and recommended stamp across all signal tiers", () => {
    const low = evaluateCustomClaim([], "NWS issues Excessive Heat Warning from 12 PM to 8 PM");
    assert.equal(low.riskScore, 0);
    assert.equal(low.recommendedStamp, STAMP_TYPES.VERIFIED_BULLETIN);
    assert.equal(low.triggeredCount, 0);

    const mod = evaluateCustomClaim(["missingPrimary"], "Study shows coffee improves focus");
    assert.equal(mod.riskScore, 24);
    assert.equal(mod.recommendedStamp, STAMP_TYPES.MISLEADING_CONTEXT);
    assert.equal(mod.triggeredCount, 1);

    const domainOverride = evaluateCustomClaim(["domainSpoof"], "Normal headline");
    assert.equal(domainOverride.riskScore, 28);
    assert.equal(domainOverride.recommendedStamp, STAMP_TYPES.FABRICATED_IMPOSTER);

    const high = evaluateCustomClaim(
      ["missingPrimary", "croppedOrTruncated", "conflictOfInterest"],
      "Chart of city metrics"
    );
    assert.equal(high.riskScore, 56);
    assert.equal(high.recommendedStamp, STAMP_TYPES.FABRICATED_IMPOSTER);

    const textHeuristic = evaluateCustomClaim(
      [],
      "URGENT!! Share before deleted! Miracle 100% proven!"
    );
    assert.equal(textHeuristic.riskScore, 16);
    assert.equal(textHeuristic.recommendedStamp, STAMP_TYPES.VERIFIED_BULLETIN);

    const allSignals = evaluateCustomClaim(
      CUSTOM_CLAIM_SIGNALS.map((s) => s.id),
      "URGENT!! Share before deleted!!"
    );
    assert.equal(allSignals.riskScore, 100);
  });

  it("23. resolveKeyboardShortcut maps keys 1-4, V, M, F, N and ignores when input is focused", () => {
    assert.deepEqual(resolveKeyboardShortcut("1", false), {
      action: "probe",
      probeKey: "whois",
    });
    assert.deepEqual(resolveKeyboardShortcut("2", false), {
      action: "probe",
      probeKey: "forensics",
    });
    assert.deepEqual(resolveKeyboardShortcut("3", false), {
      action: "probe",
      probeKey: "primary",
    });
    assert.deepEqual(resolveKeyboardShortcut("4", false), {
      action: "probe",
      probeKey: "rhetoric",
    });
    assert.deepEqual(resolveKeyboardShortcut("v", false), {
      action: "stamp",
      stampType: STAMP_TYPES.VERIFIED_BULLETIN,
    });
    assert.deepEqual(resolveKeyboardShortcut("M", false), {
      action: "stamp",
      stampType: STAMP_TYPES.MISLEADING_CONTEXT,
    });
    assert.deepEqual(resolveKeyboardShortcut("f", false), {
      action: "stamp",
      stampType: STAMP_TYPES.FABRICATED_IMPOSTER,
    });
    assert.deepEqual(resolveKeyboardShortcut("N", false), {
      action: "next",
    });
    assert.equal(resolveKeyboardShortcut("1", true), null);
    assert.equal(resolveKeyboardShortcut("x", false), null);
    assert.equal(resolveKeyboardShortcut(null, false), null);
  });

  it("24. selectDispatchIndex, advanceToNextDispatch, toggleAudioMute, and getDispatchProgressSummary work deterministically", () => {
    let state = createInitialGameState();
    state = selectDispatchIndex(state, 3);
    assert.equal(state.currentIndex, 3);
    assert.throws(() => selectDispatchIndex(state, -1), /Invalid dispatch index/);
    assert.throws(() => selectDispatchIndex(state, 6), /Invalid dispatch index/);
    assert.throws(() => selectDispatchIndex(state, 1.5), /Invalid dispatch index/);

    state = advanceToNextDispatch(state);
    assert.equal(state.currentIndex, 4);
    state = selectDispatchIndex(state, 5);
    state = advanceToNextDispatch(state);
    assert.equal(state.currentIndex, 0);

    assert.equal(state.audioMuted, false);
    state = toggleAudioMute(state);
    assert.equal(state.audioMuted, true);
    state = toggleAudioMute(state);
    assert.equal(state.audioMuted, false);

    const emptyProgress = getDispatchProgressSummary(state);
    assert.equal(emptyProgress.completedCount, 0);
    assert.equal(emptyProgress.accuracyPercent, 0);
    assert.equal(emptyProgress.allCompleted, false);

    state = inspectProbe(state, "dispatch-01-flood-release", "forensics");
    state = inspectProbe(state, "dispatch-01-flood-release", "primary");
    state = submitDispatchStamp(
      state,
      "dispatch-01-flood-release",
      STAMP_TYPES.MISLEADING_CONTEXT
    );
    const partialProgress = getDispatchProgressSummary(state);
    assert.equal(partialProgress.completedCount, 1);
    assert.equal(partialProgress.correctCount, 1);
    assert.equal(partialProgress.accuracyPercent, 100);
    assert.equal(partialProgress.rating.grade, "S");
  });

  it("25. dispatch-01-flood-release requires MISLEADING_CONTEXT and keyProbes forensics+primary", () => {
    const d = getDispatchById("dispatch-01-flood-release");
    assert.equal(d.correctStamp, STAMP_TYPES.MISLEADING_CONTEXT);
    assert.deepEqual(d.keyProbes, ["forensics", "primary"]);
    assert.equal(d.artifactData.type, "image-crop");
  });

  it("26. dispatch-02-miracle-study requires MISLEADING_CONTEXT and keyProbes primary+whois", () => {
    const d = getDispatchById("dispatch-02-miracle-study");
    assert.equal(d.correctStamp, STAMP_TYPES.MISLEADING_CONTEXT);
    assert.deepEqual(d.keyProbes, ["primary", "whois"]);
    assert.equal(d.artifactData.type, "study-methodology");
  });

  it("27. dispatch-03-aid-portal requires FABRICATED_IMPOSTER and keyProbes whois+primary", () => {
    const d = getDispatchById("dispatch-03-aid-portal");
    assert.equal(d.correctStamp, STAMP_TYPES.FABRICATED_IMPOSTER);
    assert.deepEqual(d.keyProbes, ["whois", "primary"]);
    assert.equal(d.artifactData.type, "domain-spoof");
  });

  it("28. dispatch-04-nws-heat-bulletin requires VERIFIED_BULLETIN and keyProbes primary+whois", () => {
    const d = getDispatchById("dispatch-04-nws-heat-bulletin");
    assert.equal(d.correctStamp, STAMP_TYPES.VERIFIED_BULLETIN);
    assert.deepEqual(d.keyProbes, ["primary", "whois"]);
    assert.equal(d.artifactData.type, "telemetry-verification");
  });

  it("29. dispatch-05-cherry-picked-chart requires MISLEADING_CONTEXT and keyProbes forensics+primary", () => {
    const d = getDispatchById("dispatch-05-cherry-picked-chart");
    assert.equal(d.correctStamp, STAMP_TYPES.MISLEADING_CONTEXT);
    assert.deepEqual(d.keyProbes, ["forensics", "primary"]);
    assert.equal(d.artifactData.type, "axis-truncation");
  });

  it("30. dispatch-06-synthetic-audio requires FABRICATED_IMPOSTER and keyProbes forensics+primary", () => {
    const d = getDispatchById("dispatch-06-synthetic-audio");
    assert.equal(d.correctStamp, STAMP_TYPES.FABRICATED_IMPOSTER);
    assert.deepEqual(d.keyProbes, ["forensics", "primary"]);
    assert.equal(d.artifactData.type, "audio-spectrogram");
  });

  it("31. calculateRoundScore ignores invalid probe strings inside inspectedProbes array", () => {
    const d = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["forensics", "invalid_probe", "forensics"],
      currentStreak: 0,
    });
    assert.equal(res.probesInspectedCount, 1);
    assert.equal(res.keyHits, 1);
    assert.equal(res.evidencePoints, 14);
    assert.equal(res.efficiencyBonus, 0);
    assert.equal(res.roundScore, 74);
  });

  it("32. calculateRoundScore awards efficiencyBonus of 10 when 3 probes include both keyProbes", () => {
    const d = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["forensics", "primary", "whois"],
      currentStreak: 0,
    });
    assert.equal(res.probesInspectedCount, 3);
    assert.equal(res.keyHits, 2);
    assert.equal(res.efficiencyBonus, 10);
    assert.equal(res.roundScore, 95);
  });

  it("33. calculateRoundScore awards efficiencyBonus of 5 when 2 non-key probes are inspected", () => {
    const d = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["whois", "rhetoric"],
      currentStreak: 0,
    });
    assert.equal(res.probesInspectedCount, 2);
    assert.equal(res.keyHits, 0);
    assert.equal(res.evidencePoints, 6);
    assert.equal(res.efficiencyBonus, 5);
    assert.equal(res.roundScore, 71);
  });

  it("34. calculateRoundScore clamps negative currentStreak to 0", () => {
    const d = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["forensics", "primary"],
      currentStreak: -4,
    });
    assert.equal(res.streakBonus, 0);
    assert.equal(res.nextStreak, 1);
  });

  it("35. calculateRoundScore computes 35% impactDelta when correct with 0 probes on VERIFIED_BULLETIN", () => {
    const d4 = getDispatchById("dispatch-04-nws-heat-bulletin");
    const res = calculateRoundScore({
      dispatch: d4,
      selectedStamp: STAMP_TYPES.VERIFIED_BULLETIN,
      inspectedProbes: [],
      currentStreak: 0,
    });
    assert.equal(res.verifiedReachDelta, Math.round(19800 * 0.35));
    assert.equal(res.sharesPreventedDelta, 0);
  });

  it("36. evaluateCustomClaim handles non-array activeSignalIds and non-string headlineText safely", () => {
    const res = evaluateCustomClaim(null, null);
    assert.equal(res.riskScore, 0);
    assert.equal(res.recommendedStamp, STAMP_TYPES.VERIFIED_BULLETIN);
  });

  it("37. evaluateCustomClaim detects question-exclamation cluster (?!) in headlineText", () => {
    const res = evaluateCustomClaim([], "Can you believe this happened?!");
    assert.equal(res.riskScore, 8);
  });

  it("38. evaluateCustomClaim does not double-add urgency text heuristic when emotionalUrgency toggle is active", () => {
    const res = evaluateCustomClaim(["emotionalUrgency"], "URGENT!! FINAL NOTICE!!");
    assert.equal(res.riskScore, 16);
  });

  it("39. evaluateCustomClaim boundary at riskScore 52 triggers FABRICATED_IMPOSTER", () => {
    const res = evaluateCustomClaim(["missingPrimary", "croppedOrTruncated"], "Watch this!!");
    // 24 + 20 + 8 = 52
    assert.equal(res.riskScore, 52);
    assert.equal(res.recommendedStamp, STAMP_TYPES.FABRICATED_IMPOSTER);
  });

  it("40. evaluateCustomClaim boundary at riskScore 44 triggers MISLEADING_CONTEXT", () => {
    const res = evaluateCustomClaim(["missingPrimary", "croppedOrTruncated"], "Calm headline");
    // 24 + 20 = 44
    assert.equal(res.riskScore, 44);
    assert.equal(res.recommendedStamp, STAMP_TYPES.MISLEADING_CONTEXT);
  });

  it("41. getDispatchProgressSummary marks allCompleted true only when all 6 dispatches have decisions", () => {
    let state = createInitialGameState();
    for (let i = 0; i < DISPATCHES.length; i += 1) {
      const d = DISPATCHES[i];
      state = submitDispatchStamp(state, d.id, d.correctStamp);
      const summary = getDispatchProgressSummary(state);
      assert.equal(summary.completedCount, i + 1);
      assert.equal(summary.allCompleted, i + 1 === DISPATCHES.length);
    }
  });

  it("42. getDispatchProgressSummary computes accuracyPercent accurately for mixed decisions", () => {
    let state = createInitialGameState();
    state = submitDispatchStamp(state, DISPATCHES[0].id, DISPATCHES[0].correctStamp);
    state = submitDispatchStamp(state, DISPATCHES[1].id, STAMP_TYPES.VERIFIED_BULLETIN);
    const summary = getDispatchProgressSummary(state);
    assert.equal(summary.completedCount, 2);
    assert.equal(summary.correctCount, 1);
    assert.equal(summary.accuracyPercent, 50);
  });

  it("43. CUSTOM_CLAIM_SIGNALS weights sum to exactly 100", () => {
    const sum = CUSTOM_CLAIM_SIGNALS.reduce((acc, item) => acc + item.riskWeight, 0);
    assert.equal(sum, 100);
  });

  it("44. every dispatch debrief and claimCopy is free of em-dashes and en-dashes", () => {
    for (const d of DISPATCHES) {
      assert.equal(/[\u2013\u2014]/.test(d.headline), false);
      assert.equal(/[\u2013\u2014]/.test(d.claimCopy), false);
      assert.equal(/[\u2013\u2014]/.test(d.debrief), false);
    }
  });

  it("45. resolveKeyboardShortcut trims whitespace around key strings", () => {
    assert.deepEqual(resolveKeyboardShortcut("  2 ", false), {
      action: "probe",
      probeKey: "forensics",
    });
  });

  it("46. calculateRoundScore handles 1 key probe only with 65% impact coverage", () => {
    const d1 = getDispatchById("dispatch-01-flood-release");
    const res = calculateRoundScore({
      dispatch: d1,
      selectedStamp: STAMP_TYPES.MISLEADING_CONTEXT,
      inspectedProbes: ["forensics"],
      currentStreak: 0,
    });
    assert.equal(res.keyHits, 1);
    assert.equal(res.probesInspectedCount, 1);
    assert.equal(res.sharesPreventedDelta, Math.round(18400 * 0.65));
  });

  it("47. computeNewsroomRating returns expected titles for S, A, B, and C grades", () => {
    assert.equal(computeNewsroomRating(95, 1).title, "Senior Standards Editor");
    assert.equal(computeNewsroomRating(80, 1).title, "Verified Desk Correspondent");
    assert.equal(computeNewsroomRating(60, 1).title, "Junior Fact-Check Fellow");
    assert.equal(computeNewsroomRating(40, 1).title, "Provisional Copy Desk");
  });

  it("48. inspectProbe preserves previously inspected dispatches when switching dispatches", () => {
    let state = createInitialGameState();
    state = inspectProbe(state, "dispatch-01-flood-release", "whois");
    state = inspectProbe(state, "dispatch-02-miracle-study", "primary");
    assert.deepEqual(getInspectedProbes(state, "dispatch-01-flood-release"), ["whois"]);
    assert.deepEqual(getInspectedProbes(state, "dispatch-02-miracle-study"), ["primary"]);
  });
});

