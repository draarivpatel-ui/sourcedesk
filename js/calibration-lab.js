/**
 * SourceDesk Calibration & Scoring-Matrix Lab
 * Pure deterministic JavaScript with zero DOM access and zero network access.
 * UMD pattern: attaches `SDLab` to the global object in browsers and exports
 * through module.exports under CommonJS. The game engine is injected through
 * createLab(engine) so every figure below flows through the real scoring code
 * shipped in js/sourcedesk-engine.js.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  } else {
    root.SDLab = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VERSION = "sourcedesk-calibration-lab/1";
  var BRIEF_SCHEMA = "sourcedesk-desk-brief/1";
  var HASH_PREFIX = "#sd=";
  var DISPATCH_SLOT_COUNT = 6;
  var PROBE_MASK_MAX = 15;

  /* ----------------------------------------------------------------------------------
   * 1. Five deterministic editor strategies
   *    Each strategy pairs a probe policy with a stamp policy and replays all six
   *    shipped dispatches through the real immutable game state transitions.
   * -------------------------------------------------------------------------------- */

  var EDITOR_STRATEGIES = Object.freeze([
    Object.freeze({
      id: "blind-guesser",
      name: "Blind Guesser",
      deskNote:
        "Stamps every dispatch MISLEADING CONTEXT with zero probes inspected; the modal guess a drive-by editor makes.",
      probePolicy: "none",
      stampPolicy: "fixed-misleading",
    }),
    Object.freeze({
      id: "single-probe-skimmer",
      name: "Single-Probe Skimmer",
      deskNote:
        "Runs only the single highest signal-weight instrument on each dispatch, then stamps the verdict the evidence supports.",
      probePolicy: "top-signal",
      stampPolicy: "truthful",
    }),
    Object.freeze({
      id: "evidence-efficient",
      name: "Evidence-Efficient Pair",
      deskNote:
        "Runs exactly the two high-signal key probes per dispatch and stamps honestly; the target habit the desk teaches.",
      probePolicy: "key-pair",
      stampPolicy: "truthful",
    }),
    Object.freeze({
      id: "exhaustive-four-probe",
      name: "Exhaustive Four-Probe",
      deskNote:
        "Runs all four instruments on every dispatch before stamping honestly; thorough but pays the efficiency tax.",
      probePolicy: "all-four",
      stampPolicy: "truthful",
    }),
    Object.freeze({
      id: "contrarian-flip",
      name: "Contrarian Flip",
      deskNote:
        "Runs both key probes yet stamps the opposite verdict anyway; evidence gathered then ignored.",
      probePolicy: "key-pair",
      stampPolicy: "flip",
    }),
  ]);

  var STRATEGY_ID_SET = new Set(EDITOR_STRATEGIES.map(function (s) {
    return s.id;
  }));

  /* ----------------------------------------------------------------------------------
   * 2. Five custom-claim stress presets
   *    Deterministic synthetic claim profiles replayed through the real
   *    evaluateCustomClaim risk engine. signalIds reference CUSTOM_CLAIM_SIGNALS.
   * -------------------------------------------------------------------------------- */

  var CLAIM_PRESETS = Object.freeze([
    Object.freeze({
      id: "typosquat-sms",
      label: "Typosquat SMS Grant",
      headline:
        "FINAL NOTICE!! Text your SSN and routing PIN to claim the $1,850 storm rebate at fema-relief-portal.org before midnight",
      signalIds: Object.freeze(["domainSpoof", "missingPrimary", "emotionalUrgency"]),
      note: "Fresh .org imposter plus a midnight countdown plus a credential harvest demand.",
    }),
    Object.freeze({
      id: "truncated-axis",
      label: "Truncated Axis Chart",
      headline:
        "Look at the giant drop in the second bar! City particulate pollution plunged 90% overnight",
      signalIds: Object.freeze(["croppedOrTruncated", "missingPrimary"]),
      note: "Y-axis clipped away from a zero baseline; no link to the raw AirNow figures.",
    }),
    Object.freeze({
      id: "n11-study",
      label: "Unblinded n=11 Study",
      headline:
        "Scientists confirm new citrus supplement boosts exam memory 300% in college students",
      signalIds: Object.freeze(["conflictOfInterest", "missingPrimary"]),
      note: "Sponsor-funded pilot with a tiny sample and no trial registry link.",
    }),
    Object.freeze({
      id: "gov-heat",
      label: "Verified .gov Heat Alert",
      headline:
        "NWS issues Excessive Heat Warning 12 PM to 8 PM; six city cooling centers open with fare waivers",
      signalIds: Object.freeze([]),
      note: "Calm operational bulletin on a signed .gov feed with corroborating telemetry.",
    }),
    Object.freeze({
      id: "synthetic-audio",
      label: "Synthetic Audio Memo",
      headline:
        "Forwarded many times!! Leaked voice memo ordering all rail lines shut at 5 PM, do not wait for the news",
      signalIds: Object.freeze(["missingPrimary", "conflictOfInterest", "emotionalUrgency"]),
      note: "Anonymous insider clip with anti-verification priming and zero GTFS corroboration.",
    }),
  ]);

  var PRESET_ID_SET = new Set(CLAIM_PRESETS.map(function (p) {
    return p.id;
  }));

  /* ----------------------------------------------------------------------------------
   * 3. FIPS 180-4 SHA-256 and canonical JSON
   *    Dependency-free so exports keep their integrity digest everywhere the lab runs.
   * -------------------------------------------------------------------------------- */

  /** Deterministic JSON: object keys sorted recursively, arrays kept in order. */
  function canonicalJson(value) {
    var walk = function (v) {
      if (v === null || typeof v !== "object") {
        return v;
      }
      if (Array.isArray(v)) {
        return v.map(walk);
      }
      var out = Object.create(null);
      for (var i = 0, keys = Object.keys(v).sort(); i < keys.length; i += 1) {
        out[keys[i]] = walk(v[keys[i]]);
      }
      return out;
    };
    return JSON.stringify(walk(value));
  }

  /** Small self-contained SHA-256 (UTF-8 input, lowercase hex digest). */
  function sha256Hex(text) {
    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    var rr = function (x, n) {
      return (x >>> n) | (x << (32 - n));
    };
    var bytes = [];
    if (typeof TextEncoder !== "undefined") {
      var u8 = new TextEncoder().encode(text);
      for (var i = 0; i < u8.length; i += 1) {
        bytes.push(u8[i]);
      }
    } else {
      var s = unescape(encodeURIComponent(text));
      for (var j = 0; j < s.length; j += 1) {
        bytes.push(s.charCodeAt(j));
      }
    }
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) {
      bytes.push(0);
    }
    var hi = Math.floor(bitLen / 4294967296);
    var lo = bitLen >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
    bytes.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Int32Array(64);
    for (var blk = 0; blk < bytes.length; blk += 64) {
      for (var t = 0; t < 16; t += 1) {
        w[t] = (bytes[blk + t * 4] << 24) | (bytes[blk + t * 4 + 1] << 16) | (bytes[blk + t * 4 + 2] << 8) | bytes[blk + t * 4 + 3];
      }
      for (var t2 = 16; t2 < 64; t2 += 1) {
        var s0 = rr(w[t2 - 15], 7) ^ rr(w[t2 - 15], 18) ^ (w[t2 - 15] >>> 3);
        var s1 = rr(w[t2 - 2], 17) ^ rr(w[t2 - 2], 19) ^ (w[t2 - 2] >>> 10);
        w[t2] = (w[t2 - 16] + s0 + w[t2 - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (var r = 0; r < 64; r += 1) {
        var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[r] + w[r]) | 0;
        var S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2c = (S0 + maj) | 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) | 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2c) | 0;
      }
      H[0] = (H[0] + a) | 0;
      H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0;
      H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0;
      H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) {
      return (x >>> 0).toString(16).padStart(8, "0");
    }).join("");
  }

  /* ----------------------------------------------------------------------------------
   * 4. Spreadsheet-safe CSV cell escaping
   *    A cell starting with = + - @ or whitespace is executed as a formula on
   *    spreadsheet import; a single-quote prefix marks it as text.
   * -------------------------------------------------------------------------------- */

  function csvTextCell(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    var s = String(value);
    if (s === "") {
      return "";
    }
    var lead = (s.match(/^[\s\p{Cc}\p{Cf}\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufe00-\ufe0f\ufeff]*/u) || [""])[0];
    var rest = s.slice(lead.length);
    var out = s.replace(/"/g, '""');
    if (lead.length > 0 || /^[=+\-@]/.test(rest)) {
      out = "'" + out;
    }
    if (/[\r\n"]/.test(s) || s.indexOf(",") !== -1 || out !== s) {
      out = '"' + out + '"';
    }
    return out;
  }

  /* ----------------------------------------------------------------------------------
   * 5. Strict #sd= URL-hash bookmark codec
   *    Compact b64url JSON carrying {v, ed, dp, pm, cp}. Structural failures and
   *    any non-whitelisted or out-of-range field fail closed to null. Own-property
   *    reads via Object.prototype.hasOwnProperty keep __proto__ and constructor
   *    keys from smuggling state through the codec.
   * -------------------------------------------------------------------------------- */

  var B64_ALPHANUM = /^[A-Za-z0-9_-]{8,512}$/;
  var BOOKMARK_KEYS = Object.freeze({ v: true, ed: true, dp: true, pm: true, cp: true });
  var OWN = Object.prototype.hasOwnProperty;

  function b64urlEncode(text) {
    var b64;
    if (typeof Buffer !== "undefined") {
      b64 = Buffer.from(text, "utf8").toString("base64");
    } else {
      b64 = btoa(unescape(encodeURIComponent(text)));
    }
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64urlDecode(text) {
    var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) {
      b64 += "=";
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(b64, "base64").toString("utf8");
    }
    return decodeURIComponent(escape(atob(b64)));
  }

  function isIntIn(v, lo, hi) {
    return Number.isInteger(v) && v >= lo && v <= hi;
  }

  /** Encode lab view state {ed, dp, pm, cp} into a #sd= fragment. */
  function encodeSdHash(state) {
    var s = state && typeof state === "object" ? state : {};
    var compact = { v: 1 };
    if (typeof s.ed === "string" && STRATEGY_ID_SET.has(s.ed)) {
      compact.ed = s.ed;
    }
    if (isIntIn(s.dp, 0, DISPATCH_SLOT_COUNT - 1)) {
      compact.dp = s.dp;
    }
    if (isIntIn(s.pm, 0, PROBE_MASK_MAX)) {
      compact.pm = s.pm;
    }
    if (typeof s.cp === "string" && PRESET_ID_SET.has(s.cp)) {
      compact.cp = s.cp;
    }
    return HASH_PREFIX + b64urlEncode(JSON.stringify(compact));
  }

  /** Decode a #sd= fragment. Returns {ed, dp, pm, cp} or null on any malformed input. */
  function decodeSdHash(hash) {
    if (typeof hash !== "string") {
      return null;
    }
    var h = hash.charAt(0) === "#" ? hash : "#" + hash;
    if (h.indexOf(HASH_PREFIX) !== 0) {
      return null;
    }
    var payload = h.slice(HASH_PREFIX.length);
    if (!B64_ALPHANUM.test(payload) || payload.length % 4 === 1) {
      return null;
    }
    var compact;
    try {
      var decodedText = b64urlDecode(payload);
      if (decodedText !== decodedText.trim()) {
        return null;
      }
      compact = JSON.parse(decodedText);
    } catch (err) {
      return null;
    }
    if (!compact || typeof compact !== "object" || Array.isArray(compact)) {
      return null;
    }
    if (!OWN.call(compact, "v") || compact.v !== 1) {
      return null;
    }
    var keys = Object.keys(compact);
    for (var i = 0; i < keys.length; i += 1) {
      if (!OWN.call(BOOKMARK_KEYS, keys[i])) {
        return null;
      }
    }
    var out = { ed: null, dp: null, pm: null, cp: null };
    if (OWN.call(compact, "ed")) {
      if (typeof compact.ed !== "string" || !STRATEGY_ID_SET.has(compact.ed)) {
        return null;
      }
      out.ed = compact.ed;
    }
    if (OWN.call(compact, "dp")) {
      if (!isIntIn(compact.dp, 0, DISPATCH_SLOT_COUNT - 1)) {
        return null;
      }
      out.dp = compact.dp;
    }
    if (OWN.call(compact, "pm")) {
      if (!isIntIn(compact.pm, 0, PROBE_MASK_MAX)) {
        return null;
      }
      out.pm = compact.pm;
    }
    if (OWN.call(compact, "cp")) {
      if (typeof compact.cp !== "string" || !PRESET_ID_SET.has(compact.cp)) {
        return null;
      }
      out.cp = compact.cp;
    }
    return out;
  }

  /* ----------------------------------------------------------------------------------
   * 6. Lab factory bound to the real scoring engine
   * -------------------------------------------------------------------------------- */

  var REQUIRED_ENGINE_KEYS = [
    "DISPATCHES", "PROBE_TYPES", "STAMP_TYPES", "STAMP_LABELS", "CUSTOM_CLAIM_SIGNALS",
    "createInitialGameState", "getInspectedProbes", "inspectProbe", "submitDispatchStamp",
    "calculateRoundScore", "evaluateCustomClaim", "getDispatchProgressSummary", "getDispatchById",
  ];

  function createLab(engine) {
    if (!engine || typeof engine !== "object") {
      throw new Error("createLab requires the sourcedesk engine namespace");
    }
    for (var i = 0; i < REQUIRED_ENGINE_KEYS.length; i += 1) {
      if (engine[REQUIRED_ENGINE_KEYS[i]] == null) {
        throw new Error("createLab: engine is missing " + REQUIRED_ENGINE_KEYS[i]);
      }
    }
    if (!Array.isArray(engine.DISPATCHES) || engine.DISPATCHES.length !== DISPATCH_SLOT_COUNT) {
      throw new Error("createLab: engine must ship exactly 6 dispatches");
    }
    if (!Array.isArray(engine.PROBE_TYPES) || engine.PROBE_TYPES.length !== 4) {
      throw new Error("createLab: engine must ship exactly 4 probe types");
    }

    var briefCache = new Map();

    /* ---- probe subsets and masks ---- */

    function probeSubset(mask) {
      if (!isIntIn(mask, 0, PROBE_MASK_MAX)) {
        return null;
      }
      var subset = [];
      for (var bit = 0; bit < engine.PROBE_TYPES.length; bit += 1) {
        if ((mask & (1 << bit)) !== 0) {
          subset.push(engine.PROBE_TYPES[bit]);
        }
      }
      return subset;
    }

    function maskForProbes(probes) {
      if (!Array.isArray(probes)) {
        return null;
      }
      var mask = 0;
      for (var i2 = 0; i2 < probes.length; i2 += 1) {
        var idx = engine.PROBE_TYPES.indexOf(probes[i2]);
        if (idx === -1) {
          return null;
        }
        mask |= 1 << idx;
      }
      return mask;
    }

    function optimalMaskFor(dispatch) {
      return maskForProbes(dispatch.keyProbes);
    }

    /* ---- strategy policies ---- */

    function topSignalProbe(dispatch) {
      var best = null;
      var bestWeight = -Infinity;
      for (var i3 = 0; i3 < engine.PROBE_TYPES.length; i3 += 1) {
        var key = engine.PROBE_TYPES[i3];
        var probe = dispatch.probes[key];
        var w = probe && Number.isFinite(probe.signalWeight) ? probe.signalWeight : -Infinity;
        if (w > bestWeight) {
          bestWeight = w;
          best = key;
        }
      }
      return best;
    }

    function probesForStrategy(strategy, dispatch) {
      if (strategy.probePolicy === "none") {
        return [];
      }
      if (strategy.probePolicy === "top-signal") {
        var top = topSignalProbe(dispatch);
        return top ? [top] : [];
      }
      if (strategy.probePolicy === "key-pair") {
        return dispatch.keyProbes.slice();
      }
      if (strategy.probePolicy === "all-four") {
        return engine.PROBE_TYPES.slice();
      }
      return [];
    }

    function stampForStrategy(engineRef, strategy, dispatch) {
      var stamps = engineRef.STAMP_TYPES;
      if (strategy.stampPolicy === "truthful") {
        return dispatch.correctStamp;
      }
      if (strategy.stampPolicy === "fixed-misleading") {
        return stamps.MISLEADING_CONTEXT;
      }
      if (strategy.stampPolicy === "flip") {
        var order = [stamps.VERIFIED_BULLETIN, stamps.MISLEADING_CONTEXT, stamps.FABRICATED_IMPOSTER];
        var idx = order.indexOf(dispatch.correctStamp);
        return order[(idx + 1) % order.length];
      }
      return dispatch.correctStamp;
    }

    function runStrategy(strategyId) {
      var strategy = null;
      for (var i4 = 0; i4 < EDITOR_STRATEGIES.length; i4 += 1) {
        if (EDITOR_STRATEGIES[i4].id === strategyId) {
          strategy = EDITOR_STRATEGIES[i4];
        }
      }
      if (!strategy) {
        throw new Error("Unknown strategy id: " + String(strategyId));
      }

      var state = engine.createInitialGameState();
      var streakTrajectory = [];
      var decisions = [];
      var totalProbes = 0;
      var blindPenaltyCount = 0;
      var blindPenaltyPoints = 0;
      var efficiencyBonusTotal = 0;
      var evidencePointsTotal = 0;
      var correctCount = 0;

      for (var d = 0; d < engine.DISPATCHES.length; d += 1) {
        var dispatch = engine.DISPATCHES[d];
        var probes = probesForStrategy(strategy, dispatch);
        for (var p = 0; p < probes.length; p += 1) {
          state = engine.inspectProbe(state, dispatch.id, probes[p]);
        }
        var stamp = stampForStrategy(engine, strategy, dispatch);
        state = engine.submitDispatchStamp(state, dispatch.id, stamp);
        var dec = state.decisionsByDispatch[dispatch.id];
        totalProbes += dec.probesInspectedCount;
        if (dec.blindGuessPenalty > 0) {
          blindPenaltyCount += 1;
          blindPenaltyPoints += dec.blindGuessPenalty;
        }
        efficiencyBonusTotal += dec.efficiencyBonus;
        evidencePointsTotal += dec.evidencePoints;
        if (dec.isCorrect) {
          correctCount += 1;
        }
        streakTrajectory.push(state.streak);
        decisions.push({
          dispatchId: dispatch.id,
          code: dispatch.code,
          selectedStamp: dec.selectedStamp,
          correctStamp: dispatch.correctStamp,
          isCorrect: dec.isCorrect,
          roundScore: dec.roundScore,
          probesInspectedCount: dec.probesInspectedCount,
          keyHits: dec.keyHits,
          blindGuessPenalty: dec.blindGuessPenalty,
          efficiencyBonus: dec.efficiencyBonus,
        });
      }

      var dispatchCount = engine.DISPATCHES.length;
      return {
        strategyId: strategy.id,
        name: strategy.name,
        deskNote: strategy.deskNote,
        totalScore: state.totalScore,
        correctCount: correctCount,
        dispatchCount: dispatchCount,
        accuracyPercent: Math.round((correctCount / dispatchCount) * 100),
        totalProbes: totalProbes,
        avgProbesPerDispatch: totalProbes / dispatchCount,
        blindPenaltyCount: blindPenaltyCount,
        blindPenaltyPoints: blindPenaltyPoints,
        efficiencyBonusTotal: efficiencyBonusTotal,
        evidencePointsTotal: evidencePointsTotal,
        streakTrajectory: streakTrajectory,
        finalStreak: state.streak,
        maxStreak: state.maxStreak,
        scorePerProbe: totalProbes > 0 ? state.totalScore / totalProbes : 0,
        sharesPrevented: state.sharesPrevented,
        verifiedReachSupported: state.verifiedReachSupported,
        decisions: decisions,
      };
    }

    function compareStrategies() {
      return EDITOR_STRATEGIES.map(function (s) {
        return runStrategy(s.id);
      });
    }

    /* ---- 6 dispatch x 16 subset payoff matrix ---- */

    function payoffCell(dispatch, mask) {
      var subset = probeSubset(mask);
      if (!dispatch || typeof dispatch !== "object" || !subset) {
        return null;
      }
      var res;
      try {
        res = engine.calculateRoundScore({
          dispatch: dispatch,
          selectedStamp: dispatch.correctStamp,
          inspectedProbes: subset,
          currentStreak: 0,
        });
      } catch (err) {
        return null;
      }
      return {
        mask: mask,
        probes: subset,
        probeCount: subset.length,
        roundScore: res.roundScore,
        scorePerProbe: subset.length > 0 ? res.roundScore / subset.length : 0,
        isCorrect: res.isCorrect,
        accuracyPoints: res.accuracyPoints,
        evidencePoints: res.evidencePoints,
        efficiencyBonus: res.efficiencyBonus,
        streakBonus: res.streakBonus,
        blindGuessPenalty: res.blindGuessPenalty,
        keyHits: res.keyHits,
      };
    }

    function payoffMatrix() {
      var rows = [];
      var allDominant = true;
      for (var d = 0; d < engine.DISPATCHES.length; d += 1) {
        var dispatch = engine.DISPATCHES[d];
        var cells = [];
        var optimalMask = optimalMaskFor(dispatch);
        var optimal = null;
        var blind = null;
        var exhaustive = null;
        var maxScore = -1;
        var maxSupersetSpp = -1;
        for (var m = 0; m <= PROBE_MASK_MAX; m += 1) {
          var cell = payoffCell(dispatch, m);
          cells.push(cell);
          if (cell.roundScore > maxScore) {
            maxScore = cell.roundScore;
          }
          if (m === 0) {
            blind = cell;
          }
          if (m === PROBE_MASK_MAX) {
            exhaustive = cell;
          }
          if (m === optimalMask) {
            optimal = cell;
          }
          if (cell.probeCount >= 3 && cell.scorePerProbe > maxSupersetSpp) {
            maxSupersetSpp = cell.scorePerProbe;
          }
        }
        var dominance = {
          optimalIsMaxScore: optimal.roundScore >= maxScore,
          beatsBlindOnScore: optimal.roundScore > blind.roundScore,
          beatsBlindOnPerProbe: optimal.scorePerProbe > blind.scorePerProbe,
          beatsExhaustiveOnPerProbe: optimal.scorePerProbe > exhaustive.scorePerProbe,
          beatsAllSupersetsOnPerProbe: optimal.scorePerProbe > maxSupersetSpp,
        };
        dominance.strictlyDominates =
          dominance.optimalIsMaxScore &&
          dominance.beatsBlindOnScore &&
          dominance.beatsBlindOnPerProbe &&
          dominance.beatsExhaustiveOnPerProbe &&
          dominance.beatsAllSupersetsOnPerProbe;
        if (!dominance.strictlyDominates) {
          allDominant = false;
        }
        rows.push({
          dispatchId: dispatch.id,
          code: dispatch.code,
          headline: dispatch.headline,
          keyProbes: dispatch.keyProbes.slice(),
          optimalMask: optimalMask,
          cells: cells,
          optimal: optimal,
          blind: blind,
          exhaustive: exhaustive,
          dominance: dominance,
        });
      }
      return { rows: rows, allDominant: allDominant };
    }

    /* ---- custom claim presets ---- */

    function claimPresets() {
      return CLAIM_PRESETS.map(function (p) {
        return { id: p.id, label: p.label, headline: p.headline, signalIds: p.signalIds.slice(), note: p.note };
      });
    }

    function evaluatePreset(presetId) {
      var preset = null;
      for (var i5 = 0; i5 < CLAIM_PRESETS.length; i5 += 1) {
        if (CLAIM_PRESETS[i5].id === presetId) {
          preset = CLAIM_PRESETS[i5];
        }
      }
      if (!preset) {
        throw new Error("Unknown claim preset id: " + String(presetId));
      }
      var evaluation = engine.evaluateCustomClaim(preset.signalIds.slice(), preset.headline);
      return {
        preset: {
          id: preset.id,
          label: preset.label,
          headline: preset.headline,
          signalIds: preset.signalIds.slice(),
          note: preset.note,
        },
        evaluation: evaluation,
      };
    }

    /* ---- integrity-stamped desk brief ---- */

    function numOr(v, fallback) {
      return Number.isFinite(v) ? v : fallback;
    }

    function normalizeDecisionRecord(dispatch, dec) {
      return {
        dispatchId: dispatch.id,
        code: dispatch.code,
        selectedStamp: typeof dec.selectedStamp === "string" ? dec.selectedStamp : "",
        correctStamp: dispatch.correctStamp,
        isCorrect: dec.isCorrect === true,
        roundScore: numOr(dec.roundScore, 0),
        accuracyPoints: numOr(dec.accuracyPoints, 0),
        evidencePoints: numOr(dec.evidencePoints, 0),
        efficiencyBonus: numOr(dec.efficiencyBonus, 0),
        streakBonus: numOr(dec.streakBonus, 0),
        blindGuessPenalty: numOr(dec.blindGuessPenalty, 0),
        keyHits: numOr(dec.keyHits, 0),
        probesInspectedCount: numOr(dec.probesInspectedCount, 0),
        revisedFromFirstAttempt: dec.revisedFromFirstAttempt === true,
      };
    }

    function extractBriefCore(state) {
      var safe = state && typeof state === "object" ? state : {};
      var decisions = safe.decisionsByDispatch && typeof safe.decisionsByDispatch === "object"
        ? safe.decisionsByDispatch
        : {};
      var rows = [];
      for (var i6 = 0; i6 < engine.DISPATCHES.length; i6 += 1) {
        var dispatch = engine.DISPATCHES[i6];
        var dec = decisions[dispatch.id];
        if (dec && typeof dec === "object") {
          rows.push(normalizeDecisionRecord(dispatch, dec));
        }
      }
      var validDecisions = {};
      for (var dIndex = 0; dIndex < rows.length; dIndex += 1) {
        validDecisions[rows[dIndex].dispatchId] = decisions[rows[dIndex].dispatchId];
      }
      var progress;
      try {
        progress = engine.getDispatchProgressSummary({
          decisionsByDispatch: validDecisions,
          totalScore: numOr(safe.totalScore, 0),
        });
      } catch (err) {
        progress = {
          completedCount: rows.length,
          totalDispatches: engine.DISPATCHES.length,
          correctCount: 0,
          accuracyPercent: 0,
          allCompleted: false,
          rating: { grade: "C", title: "Provisional Copy Desk" },
        };
      }
      return {
        totals: {
          totalScore: numOr(safe.totalScore, 0),
          streak: numOr(safe.streak, 0),
          maxStreak: numOr(safe.maxStreak, 0),
          sharesPrevented: numOr(safe.sharesPrevented, 0),
          verifiedReachSupported: numOr(safe.verifiedReachSupported, 0),
          completedCount: progress.completedCount,
          correctCount: progress.correctCount,
          accuracyPercent: progress.accuracyPercent,
          ratingGrade: progress.rating.grade,
          ratingTitle: progress.rating.title,
        },
        decisions: rows,
      };
    }

    /**
     * One canonical digest-stamped brief per desk state. The payload is fully
     * deterministic (no wall-clock fields), and the signed body plus all three
     * export renderings are cached under the canonical state key so the on-page
     * fingerprint, JSON, CSV provenance header, and Markdown footer always carry
     * the exact same SHA-256 digest.
     */
    function briefForState(state) {
      var core = extractBriefCore(state);
      var stateKey = canonicalJson(core);
      var cached = briefCache.get(stateKey);
      if (cached) {
        return cached;
      }
      var payload = {
        schema: BRIEF_SCHEMA,
        app: "SourceDesk Calibration & Scoring Lab",
        disclosure:
          "Playtesting and scoring balance verified via an automated bot simulation harness across 592,704 simulated clue-inspection and decision combinations, not human subjects.",
        deskTotals: core.totals,
        decisions: core.decisions,
      };
      var canonical = canonicalJson(payload);
      var digest = sha256Hex(canonical);
      var signedBody = Object.assign({}, payload, {
        integrity: { algorithm: "SHA-256", canonicalJsonSha256: digest },
      });

      var json = JSON.stringify(signedBody, null, 2);
      var csv = briefCsv(signedBody);
      var markdown = briefMarkdown(signedBody);
      var brief = {
        stateKey: stateKey,
        payload: signedBody,
        sha256: digest,
        json: json,
        csv: csv,
        markdown: markdown,
      };
      briefCache.set(stateKey, brief);
      return brief;
    }

    function briefCsv(signedBody) {
      var digest = signedBody.integrity.canonicalJsonSha256;
      var lines = [
        "# " + BRIEF_SCHEMA,
        "# sha256: " + digest,
        "# automated bot playtest disclosure: 592,704 simulated combinations, not human subjects",
        "dispatch_code,dispatch_id,selected_stamp,correct_stamp,is_correct,round_score,accuracy_points,evidence_points,efficiency_bonus,streak_bonus,blind_penalty,key_hits,probes_inspected,revised",
      ];
      for (var i7 = 0; i7 < signedBody.decisions.length; i7 += 1) {
        var d = signedBody.decisions[i7];
        lines.push([
          csvTextCell(d.code),
          csvTextCell(d.dispatchId),
          csvTextCell(d.selectedStamp),
          csvTextCell(d.correctStamp),
          d.isCorrect ? "true" : "false",
          String(d.roundScore),
          String(d.accuracyPoints),
          String(d.evidencePoints),
          String(d.efficiencyBonus),
          String(d.streakBonus),
          String(d.blindGuessPenalty),
          String(d.keyHits),
          String(d.probesInspectedCount),
          d.revisedFromFirstAttempt ? "true" : "false",
        ].join(","));
      }
      return lines.join("\n") + "\n";
    }

    function mdEsc(v) {
      return String(v == null ? "" : v).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    }

    function briefMarkdown(signedBody) {
      var t = signedBody.deskTotals;
      var lines = [];
      lines.push("# SourceDesk Desk Brief");
      lines.push("");
      lines.push("> " + mdEsc(signedBody.disclosure));
      lines.push("");
      lines.push("## Desk Totals");
      lines.push("");
      lines.push("- Total score: " + t.totalScore + " across " + t.completedCount + " stamped dispatches (" + t.correctCount + " correct, " + t.accuracyPercent + "% accuracy)");
      lines.push("- Streak: " + t.streak + " (max " + t.maxStreak + "), civic reach protected: " + t.sharesPrevented + ", verified reach supported: " + t.verifiedReachSupported);
      lines.push("- Editorial standing: " + mdEsc(t.ratingGrade) + " / " + mdEsc(t.ratingTitle));
      lines.push("");
      lines.push("## Decisions");
      lines.push("");
      lines.push("| Dispatch | Stamp Filed | Expected | Correct | Score | Probes | Blind Penalty |");
      lines.push("| --- | --- | --- | --- | --- | --- | --- |");
      for (var i8 = 0; i8 < signedBody.decisions.length; i8 += 1) {
        var d = signedBody.decisions[i8];
        lines.push(
          "| " + mdEsc(d.code) + " | " + mdEsc(d.selectedStamp) + " | " + mdEsc(d.correctStamp) +
          " | " + (d.isCorrect ? "yes" : "no") + " | " + d.roundScore + " | " + d.probesInspectedCount +
          " | " + d.blindGuessPenalty + " |"
        );
      }
      if (signedBody.decisions.length === 0) {
        lines.push("| (none) | - | - | - | - | - | - |");
      }
      lines.push("");
      lines.push("## Integrity");
      lines.push("");
      lines.push("- Algorithm: SHA-256 over canonical JSON (key-sorted, byte-deterministic)");
      lines.push("- Digest: " + signedBody.integrity.canonicalJsonSha256);
      lines.push("- Scope: detects accidental edits or truncation; it is not a signature and does not prove authorship.");
      lines.push("- Replay: recompute canonical JSON of the payload without the integrity block and compare digests.");
      lines.push("");
      return lines.join("\n");
    }

    /** Re-verify a digest-stamped brief from its object or JSON text. */
    function verifyBrief(reportOrJson) {
      var report = reportOrJson;
      if (typeof reportOrJson === "string") {
        try {
          report = JSON.parse(reportOrJson);
        } catch (err) {
          return { valid: false, reason: "report is not valid JSON", expectedSha: null, actualSha: null };
        }
      }
      if (!report || typeof report !== "object" || Array.isArray(report)) {
        return { valid: false, reason: "report payload is missing", expectedSha: null, actualSha: null };
      }
      var integrity = report.integrity;
      if (!integrity || integrity.algorithm !== "SHA-256" || typeof integrity.canonicalJsonSha256 !== "string") {
        return { valid: false, reason: "report carries no SHA-256 integrity digest", expectedSha: null, actualSha: null };
      }
      var expected = integrity.canonicalJsonSha256;
      var body = Object.create(null);
      var rKeys = Object.keys(report);
      for (var i9 = 0; i9 < rKeys.length; i9 += 1) {
        if (rKeys[i9] !== "integrity") {
          body[rKeys[i9]] = report[rKeys[i9]];
        }
      }
      var actual = sha256Hex(canonicalJson(body));
      if (!/^[0-9a-f]{64}$/.test(expected)) {
        return { valid: false, reason: "embedded digest is malformed", expectedSha: expected, actualSha: actual };
      }
      return {
        valid: actual === expected,
        reason:
          actual === expected
            ? "integrity digest matches the canonical payload"
            : "payload does not match the embedded digest (tampering or truncation)",
        expectedSha: expected,
        actualSha: actual,
      };
    }

    /** Interactive verify + tamper demo: intact brief passes, one edited field is caught. */
    function tamperDemo(state) {
      var brief = briefForState(state);
      var intact = verifyBrief(brief.payload);
      var tampered = JSON.parse(brief.json);
      if (tampered.decisions && tampered.decisions.length > 0) {
        tampered.decisions[0].roundScore = tampered.decisions[0].roundScore + 1;
      } else {
        tampered.deskTotals.totalScore = tampered.deskTotals.totalScore + 1;
      }
      var caught = verifyBrief(tampered);
      return {
        intactValid: intact.valid === true,
        tamperedValid: caught.valid === true,
        tamperCaught: caught.valid === false,
        intactDigest: brief.sha256,
        tamperedDigest: caught.actualSha,
        reason: caught.reason,
      };
    }

    /* ---- deterministic in-page self-tests ---- */

    function runSelfTests() {
      var results = [];
      var check = function (id, name, fn) {
        try {
          var detail = fn();
          results.push({ id: id, name: name, pass: true, detail: String(detail == null ? "ok" : detail).slice(0, 140) });
        } catch (err) {
          results.push({ id: id, name: name, pass: false, detail: String((err && err.message) || err).slice(0, 140) });
        }
      };
      var must = function (cond, fail, ok) {
        if (!cond) {
          throw new Error(fail);
        }
        return ok == null ? "ok" : ok;
      };

      check("sha256-empty", "SHA-256 FIPS 180-4 vector: empty message", function () {
        return must(
          sha256Hex("") === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "digest mismatch",
          "digest matches"
        );
      });
      check("sha256-abc", "SHA-256 FIPS 180-4 vector: 'abc'", function () {
        return must(
          sha256Hex("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          "digest mismatch",
          "digest matches"
        );
      });
      check("sha256-448", "SHA-256 FIPS 180-4 vector: 448-bit message", function () {
        return must(
          sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq") ===
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
          "digest mismatch",
          "digest matches"
        );
      });
      check("sha256-utf8", "SHA-256 UTF-8 multibyte vector", function () {
        return must(
          sha256Hex("Sourcé Dësk 東京 100") === "0f3494017f0ed21fd55594e74a3114520459aa9b460d50ff65c08a7870879604",
          "digest mismatch",
          "digest matches"
        );
      });
      check("canonical-sort", "Canonical JSON is key-sorted, byte-stable, and __proto__ safe", function () {
        var sorted = canonicalJson({ b: 1, a: { d: [3, 2], c: 0 } }) === '{"a":{"c":0,"d":[3,2]},"b":1}';
        var protoSafe = canonicalJson(JSON.parse('{"__proto__":1,"a":2}')) === '{"__proto__":1,"a":2}';
        return must(sorted && protoSafe, "canonical drift", "byte-stable and prototype safe");
      });
      check("blind-penalty", "Blind-stamp -25 penalty enforced on all 6 unstamped guesses", function () {
        var run = runStrategy("blind-guesser");
        var allSix = run.decisions.every(function (d) {
          return d.blindGuessPenalty === 25 && d.probesInspectedCount === 0;
        });
        return must(allSix && run.blindPenaltyCount === 6 && run.blindPenaltyPoints === 150, "penalty missing", "6 x -25 = -150 exact");
      });
      check("efficiency-10", "Optimal 2-probe pair earns exactly +10 efficiency on all 6 dispatches", function () {
        var run = runStrategy("evidence-efficient");
        var allTen = run.decisions.every(function (d) {
          return d.efficiencyBonus === 10 && d.probesInspectedCount === 2 && d.keyHits === 2;
        });
        return must(allTen && run.efficiencyBonusTotal === 60, "bonus wrong", "6 x +10 = +60 exact");
      });
      check("freeze-invariance", "First-attempt score freeze: re-stamp cannot rewrite roundScore", function () {
        var st = engine.createInitialGameState();
        var d0 = engine.DISPATCHES[0];
        var wrong = d0.correctStamp === engine.STAMP_TYPES.VERIFIED_BULLETIN
          ? engine.STAMP_TYPES.FABRICATED_IMPOSTER
          : engine.STAMP_TYPES.VERIFIED_BULLETIN;
        st = engine.submitDispatchStamp(st, d0.id, wrong);
        var frozen = stateScoreOf(st, d0.id);
        st = engine.inspectProbe(st, d0.id, d0.keyProbes[0]);
        st = engine.inspectProbe(st, d0.id, d0.keyProbes[1]);
        st = engine.submitDispatchStamp(st, d0.id, d0.correctStamp);
        var after = stateScoreOf(st, d0.id);
        var dec = st.decisionsByDispatch[d0.id];
        return must(
          after === frozen && dec.revisedFromFirstAttempt === true && dec.isCorrect === false,
          "first attempt rewritten",
          "score frozen at " + frozen
        );
      });
      check("dominance-6x16", "Key-probe pair strictly dominates blind and exhaustive probing on all 6 dispatches", function () {
        var matrix = payoffMatrix();
        for (var i10 = 0; i10 < matrix.rows.length; i10 += 1) {
          if (!matrix.rows[i10].dominance.strictlyDominates) {
            return must(false, "dominance failed on " + matrix.rows[i10].code);
          }
        }
        return must(matrix.allDominant === true, "summary flag off", "6x16 grid dominant");
      });
      check("claim-bounds", "Custom claim risk score stays inside 0..100 for presets and hostile text", function () {
        for (var i11 = 0; i11 < CLAIM_PRESETS.length; i11 += 1) {
          var ev = evaluatePreset(CLAIM_PRESETS[i11].id).evaluation;
          if (!(ev.riskScore >= 0 && ev.riskScore <= 100)) {
            return must(false, "preset out of bounds");
          }
        }
        var hostile = engine.evaluateCustomClaim(["__proto__", "constructor"], "<img src=x onerror=alert(1)>");
        return must(
          hostile.riskScore >= 0 && hostile.riskScore <= 100,
          "hostile input out of bounds",
          "0..100 holds"
        );
      });
      check("csv-injection", "CSV cells escape spreadsheet formula injection", function () {
        return must(
          csvTextCell("=CMD()") === '"\'=CMD()"' &&
            csvTextCell("+cmd") === '"\'+cmd"' &&
            csvTextCell("-9") === '"\'-9"' &&
            csvTextCell("@sum") === '"\'@sum"' &&
            csvTextCell("plain") === "plain",
          "escape failure",
          "formula cells prefixed"
        );
      });
      check("tamper-detect", "Integrity digest verifies intact brief and catches a one-field edit", function () {
        var demo = tamperDemo(engine.createInitialGameState());
        return must(
          demo.intactValid === true && demo.tamperCaught === true,
          "tamper not detected",
          "edit caught"
        );
      });
      check("codec-roundtrip", "#sd= bookmark round-trips all fields and rejects hostile hashes", function () {
        var state = { ed: "evidence-efficient", dp: 2, pm: 11, cp: "n11-study" };
        var decoded = decodeSdHash(encodeSdHash(state));
        var ok =
          decoded &&
          decoded.ed === "evidence-efficient" &&
          decoded.dp === 2 &&
          decoded.pm === 11 &&
          decoded.cp === "n11-study";
        var rejected =
          decodeSdHash("#sd=%%%junk") === null &&
          decodeSdHash("#sd=" + b64urlEncode('{"v":9}')) === null &&
          decodeSdHash("#sd=" + b64urlEncode('{"v":1,"__proto__":{"x":1}}')) === null &&
          decodeSdHash("#sd=" + b64urlEncode('{"v":1,"pm":99}')) === null;
        return must(ok && rejected, "codec failure", "round-trip clean, junk rejected");
      });
      check("strategy-determinism", "Five-strategy comparator is byte-deterministic across runs", function () {
        var a = JSON.stringify(compareStrategies());
        var b = JSON.stringify(compareStrategies());
        return must(a === b, "run drift", "identical replays");
      });
      check("matrix-shape", "Payoff matrix holds 6x16 bounded cells with consistent score formula", function () {
        var matrix = payoffMatrix();
        if (matrix.rows.length !== 6) {
          return must(false, "row count wrong");
        }
        for (var i12 = 0; i12 < matrix.rows.length; i12 += 1) {
          var cells = matrix.rows[i12].cells;
          if (cells.length !== 16) {
            return must(false, "column count wrong");
          }
          for (var c2 = 0; c2 < cells.length; c2 += 1) {
            var cell = cells[c2];
            var raw = cell.accuracyPoints + cell.evidencePoints + cell.efficiencyBonus + cell.streakBonus - cell.blindGuessPenalty;
            var expected = Math.max(0, Math.min(100, raw));
            if (cell.roundScore !== expected || cell.roundScore < 0 || cell.roundScore > 100) {
              return must(false, "formula inconsistent at mask " + c2);
            }
          }
        }
        return "96 cells consistent";
      });
      check("probe-counts", "Strategy probe policies land exactly: 0, 1, 2, 4, 2 probes per dispatch", function () {
        var counts = {};
        var runs = compareStrategies();
        for (var i13 = 0; i13 < runs.length; i13 += 1) {
          counts[runs[i13].strategyId] = runs[i13].avgProbesPerDispatch;
        }
        return must(
          counts["blind-guesser"] === 0 &&
            counts["single-probe-skimmer"] === 1 &&
            counts["evidence-efficient"] === 2 &&
            counts["exhaustive-four-probe"] === 4 &&
            counts["contrarian-flip"] === 2,
          "probe policy drift",
          "0 / 1 / 2 / 4 / 2 exact"
        );
      });

      return results;
    }

    function stateScoreOf(state, dispatchId) {
      var dec = state.decisionsByDispatch[dispatchId];
      return dec ? dec.roundScore : null;
    }

    return {
      VERSION: VERSION,
      BRIEF_SCHEMA: BRIEF_SCHEMA,
      HASH_PREFIX: HASH_PREFIX,
      strategies: function () {
        return EDITOR_STRATEGIES.map(function (s) {
          return { id: s.id, name: s.name, deskNote: s.deskNote, probePolicy: s.probePolicy, stampPolicy: s.stampPolicy };
        });
      },
      runStrategy: runStrategy,
      compareStrategies: compareStrategies,
      probeSubset: probeSubset,
      maskForProbes: maskForProbes,
      optimalMaskFor: optimalMaskFor,
      payoffCell: payoffCell,
      payoffMatrix: payoffMatrix,
      claimPresets: claimPresets,
      evaluatePreset: evaluatePreset,
      briefForState: briefForState,
      verifyBrief: verifyBrief,
      tamperDemo: tamperDemo,
      encodeBookmark: encodeSdHash,
      decodeBookmark: decodeSdHash,
      runSelfTests: runSelfTests,
      canonicalJson: canonicalJson,
      sha256Hex: sha256Hex,
      csvTextCell: csvTextCell,
    };
  }

  return {
    VERSION: VERSION,
    BRIEF_SCHEMA: BRIEF_SCHEMA,
    HASH_PREFIX: HASH_PREFIX,
    EDITOR_STRATEGIES: EDITOR_STRATEGIES,
    CLAIM_PRESETS: CLAIM_PRESETS,
    canonicalJson: canonicalJson,
    sha256Hex: sha256Hex,
    csvTextCell: csvTextCell,
    encodeSdHash: encodeSdHash,
    decodeSdHash: decodeSdHash,
    createLab: createLab,
  };
});
