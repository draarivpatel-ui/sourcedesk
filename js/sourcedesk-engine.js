/**
 * SourceDesk Core Lateral-Reading & Verification Engine
 * Pure ES Module compatible with both browser UI and Node.js automated test suites.
 */

export const STAMP_TYPES = Object.freeze({
  VERIFIED_BULLETIN: "VERIFIED_BULLETIN",
  MISLEADING_CONTEXT: "MISLEADING_CONTEXT",
  FABRICATED_IMPOSTER: "FABRICATED_IMPOSTER",
});

export const STAMP_LABELS = Object.freeze({
  VERIFIED_BULLETIN: "VERIFIED BULLETIN",
  MISLEADING_CONTEXT: "MISLEADING CONTEXT",
  FABRICATED_IMPOSTER: "FABRICATED / IMPOSTER",
});

export const PROBE_TYPES = Object.freeze([
  "whois",
  "forensics",
  "primary",
  "rhetoric",
]);

export const PROBE_METADATA = Object.freeze({
  whois: {
    id: "whois",
    shortcutKey: "1",
    title: "Domain & WHOIS Registry",
    instrumentName: "DNS / Registration Lookup",
  },
  forensics: {
    id: "forensics",
    shortcutKey: "2",
    title: "Media & Chart Forensics",
    instrumentName: "Archive Loupe & Axis Scanner",
  },
  primary: {
    id: "primary",
    shortcutKey: "3",
    title: "Primary Source Cross-Check",
    instrumentName: "Official Telemetry & Trial Audit",
  },
  rhetoric: {
    id: "rhetoric",
    shortcutKey: "4",
    title: "Urgency & Framing Scanner",
    instrumentName: "Rhetorical Manipulation Index",
  },
});

export const DISPATCHES = Object.freeze([
  {
    id: "dispatch-01-flood-release",
    code: "SD-2026-01",
    category: "Civic Emergency Claim",
    headline: "Emergency Nighttime Dam Release Flooding Highway 6",
    sourceOutlet: "riverwatch-daily-buzz.net",
    sourceHandle: "@BrazosValleyAlertNow",
    timestampLabel: "23:42 LOCAL",
    viralVelocity: 18400,
    correctStamp: STAMP_TYPES.MISLEADING_CONTEXT,
    keyProbes: ["forensics", "primary"],
    claimCopy:
      "URGENT: County engineers just opened the floodgates at 11:40 PM without warning! Share before they delete this footage of the spillway overflowing onto the south feeder road!",
    contextNote:
      "Incoming viral post circulating in neighborhood messaging groups with a tightly cropped spillway photograph.",
    probes: {
      whois: {
        title: "Domain & WHOIS Registry",
        findingTag: "Unverified Aggregator",
        signalWeight: 18,
        summary:
          "Domain riverwatch-daily-buzz.net is registered to an ad-arbitrage LLC with zero municipal or hydrological affiliation.",
        telemetry: "REG-AGE: 412d | TLD: .net | AUTH: None (Commercial Ad Network)",
      },
      forensics: {
        title: "Media & Chart Forensics",
        findingTag: "Recycled 2017 Photo",
        signalWeight: 42,
        summary:
          "Reverse image archive match confirms the photograph was captured on August 29, 2017 at an out-of-state reservoir; the top date banner was cropped out.",
        telemetry: "EXIF-MATCH: AP-2017-08-29 | CROP-RATIO: 34% vertical trim",
      },
      primary: {
        title: "Primary Source Cross-Check",
        findingTag: "Contradicts Gauge Telemetry",
        signalWeight: 40,
        summary:
          "Official River Authority and County OEM gauges report 0 gate operations tonight. River stage is steady at 11.4 ft (flood action stage is 28.0 ft).",
        telemetry: "USGS-GAUGE: 11.40 ft | GATE-FLOW: 0 cfs | OEM-ALERTS: 0 active",
      },
      rhetoric: {
        title: "Urgency & Framing Scanner",
        findingTag: "Urgency Share-Bait",
        signalWeight: 22,
        summary:
          "Uses deletion paranoia ('Share before they delete this') and midnight panic framing to trigger forwarding before verification.",
        telemetry: "AROUSAL-INDEX: 88/100 | COERCION: Deletion paranoia",
      },
    },
    artifactData: {
      type: "image-crop",
      title: "Photographic Frame Comparison",
      viralHeader: "Viral Cropped Frame (2026 Post)",
      viralDetail:
        "Tightly cropped 16:9 spillway frame omitting sky, surrounding hills, and top-right wire timestamp.",
      viralMetric: "66% Frame Retained",
      verifiedHeader: "Original Wire Archive (Aug 2017)",
      verifiedDetail:
        "Full archival frame showing daytime California reservoir test release with August 29, 2017 caption.",
      verifiedMetric: "100% Original Wire",
    },
    debrief:
      "A genuine 2017 reservoir photograph was cropped to hide its date stamp and paired with an urgent nighttime flood claim. Cross-checking USGS and River Authority telemetry confirms normal water levels.",
  },
  {
    id: "dispatch-02-miracle-study",
    code: "SD-2026-02",
    category: "Health & Science Claim",
    headline: "Clinical Study Proves NeuroSpark Drink Boosts Exam Recall by 300%",
    sourceOutlet: "neurospark-labs-press.com",
    sourceHandle: "@DailyBioHackDigest",
    timestampLabel: "08:15 LOCAL",
    viralVelocity: 14200,
    correctStamp: STAMP_TYPES.MISLEADING_CONTEXT,
    keyProbes: ["primary", "whois"],
    claimCopy:
      "Scientists confirm drinking one can of NeuroSpark Citrus triples short-term memory retention in students within 20 minutes, outperforming sleep and flashcards.",
    contextNote:
      "Trending student study-hack article citing a 'landmark university poster' ahead of finals week.",
    probes: {
      whois: {
        title: "Domain & WHOIS Registry",
        findingTag: "Undisclosed Sponsor Site",
        signalWeight: 38,
        summary:
          "Domain neurospark-labs-press.com is owned directly by the beverage manufacturer's marketing division while styled as an independent science journal.",
        telemetry: "REGISTRANT: NeuroSpark Beverage Corp | DISCLOSURE: Buried in footer",
      },
      forensics: {
        title: "Media & Chart Forensics",
        findingTag: "Relative vs Absolute Distortion",
        signalWeight: 28,
        summary:
          "Chart converts a subgroup recall shift from 1 word to 3 words on a 20-word list into a headline '300% clinical memory boost'.",
        telemetry: "RAW-DELTA: +2.0 words | P-VALUE: 0.41 (Noise) | HEADLINE: 300%",
      },
      primary: {
        title: "Primary Source Cross-Check",
        findingTag: "Unblinded n=11 Poster",
        signalWeight: 45,
        summary:
          "Source document is an unblinded conference poster with sample size n=11, no placebo control group, and 100% manufacturer funding.",
        telemetry: "SAMPLE-SIZE: n=11 | BLINDING: None | PEER-REVIEW: Not indexed",
      },
      rhetoric: {
        title: "Urgency & Framing Scanner",
        findingTag: "Miracle Shortcut Appeal",
        signalWeight: 20,
        summary:
          "Targets student exam stress by claiming a commercial beverage replaces sleep and structured study.",
        telemetry: "AROUSAL-INDEX: 74/100 | AUTHORITY-CUES: Vague 'Scientists confirm'",
      },
    },
    artifactData: {
      type: "study-methodology",
      title: "Clinical Methodology Audit",
      viralHeader: "Viral Marketing Headline",
      viralDetail:
        "Claims peer-reviewed proof of a 300% memory boost across student populations.",
      viralMetric: "Claimed +300% Effect",
      verifiedHeader: "Actual Poster Footnote (n=11)",
      verifiedDetail:
        "Unblinded 11-participant internal pilot, p=0.41 (not statistically significant), funded by manufacturer.",
      verifiedMetric: "n=11 / p=0.41",
    },
    debrief:
      "An unblinded, statistically insignificant company pilot (n=11) was promoted through a sponsor-owned domain as a breakthrough clinical trial. Inspecting sample size and funding disclosures prevents science hype from spreading.",
  },
  {
    id: "dispatch-03-aid-portal",
    code: "SD-2026-03",
    category: "Phishing / Imposter Scam",
    headline: "48-Hour Federal Storm Relief Direct Deposit Portal ($1,850 Grant)",
    sourceOutlet: "fema-storm-grant-claim.org",
    sourceHandle: "SMS Forward / @ReliefClaimHelper",
    timestampLabel: "19:08 LOCAL",
    viralVelocity: 26500,
    correctStamp: STAMP_TYPES.FABRICATED_IMPOSTER,
    keyProbes: ["whois", "primary"],
    claimCopy:
      "FINAL NOTICE: Residents in affected ZIP codes have until midnight to claim their $1,850 emergency utility rebate at fema-storm-grant-claim.org. Enter SSN and bank routing PIN for instant payout.",
    contextNote:
      "Mass-forwarded SMS and community board link promising instant federal utility grants after severe weather.",
    probes: {
      whois: {
        title: "Domain & WHOIS Registry",
        findingTag: "36-Hour Typosquat .org",
        signalWeight: 48,
        summary:
          "Domain fema-storm-grant-claim.org was registered 36 hours ago via an anonymized registrar. Federal emergency agencies operate exclusively on .gov domains.",
        telemetry: "REG-AGE: 36 hours | TLD: .org (Non-Gov) | PRIVACY-PROXY: Masked",
      },
      forensics: {
        title: "Media & Chart Forensics",
        findingTag: "Spoofed Seal & Form Harvest",
        signalWeight: 24,
        summary:
          "Page embeds a pixelated agency emblem and submits SSN and bank credentials to an unverified third-party webhook.",
        telemetry: "TLS-CERT: Free DV (36h old) | FORM-POST: External webhook",
      },
      primary: {
        title: "Primary Source Cross-Check",
        findingTag: "Official Scam Advisory",
        signalWeight: 44,
        summary:
          "Verified DisasterAssistance.gov and FEMA advisories confirm no $1,850 SMS utility portal exists and warn residents against .org imposter links.",
        telemetry: "OFFICIAL-PORTAL: DisasterAssistance.gov | SMS-PIN-ASK: Never",
      },
      rhetoric: {
        title: "Urgency & Framing Scanner",
        findingTag: "Midnight Countdown Coercion",
        signalWeight: 30,
        summary:
          "Combines artificial midnight expiration ('FINAL NOTICE') with financial reward to rush victims past domain inspection.",
        telemetry: "AROUSAL-INDEX: 96/100 | COERCION: Expiring financial grant",
      },
    },
    artifactData: {
      type: "domain-spoof",
      title: "Domain & Credential Path Comparison",
      viralHeader: "Imposter Link: fema-storm-grant-claim.org",
      viralDetail:
        "Registered 36 hours ago on .org; demands Social Security Number and bank routing PIN before midnight.",
      viralMetric: "36h Old .org Domain",
      verifiedHeader: "Authentic Portal: DisasterAssistance.gov",
      verifiedDetail:
        "DNSSEC-verified US Government .gov registry; never demands banking PINs via forwarded text links.",
      verifiedMetric: "Verified .gov Registry",
    },
    debrief:
      "Disaster-relief imposters pair newly registered '.org' lookalike domains with midnight countdowns to harvest identity and banking data. Checking WHOIS age and official .gov portals exposes the scam before anyone loses funds.",
  },
  {
    id: "dispatch-04-nws-heat-bulletin",
    code: "SD-2026-04",
    category: "Public Safety Bulletin",
    headline: "National Weather Service Excessive Heat Warning & Cooling Centers",
    sourceOutlet: "weather.gov / city-oem.gov",
    sourceHandle: "@NWSRegionalDesk",
    timestampLabel: "11:30 LOCAL",
    viralVelocity: 19800,
    correctStamp: STAMP_TYPES.VERIFIED_BULLETIN,
    keyProbes: ["primary", "whois"],
    claimCopy:
      "NWS issues Excessive Heat Warning from 12:00 PM to 8:00 PM as heat index values reach 109 F. Four public libraries and two community centers are open as free cooling stations with transit fare waivers.",
    contextNote:
      "Regional public safety dispatch shared across municipal feeds and neighborhood bulletin boards.",
    probes: {
      whois: {
        title: "Domain & WHOIS Registry",
        findingTag: "Verified .gov DNSSEC",
        signalWeight: 40,
        summary:
          "Links resolve directly to federal weather.gov and municipal emergency management .gov domains with active DNSSEC signatures.",
        telemetry: "TLD: .gov | DNSSEC: Signed & Valid | REGISTRANT: NOAA / City OEM",
      },
      forensics: {
        title: "Media & Chart Forensics",
        findingTag: "Matches ASOS Telemetry",
        signalWeight: 32,
        summary:
          "Regional ASOS weather station telemetry confirms ambient 99 F and dewpoint 74 F, yielding a calibrated 109 F heat index.",
        telemetry: "ASOS-TEMP: 99.0 F | DEWPOINT: 74.0 F | HEAT-INDEX: 109.0 F",
      },
      primary: {
        title: "Primary Source Cross-Check",
        findingTag: "3-Source Primary Match",
        signalWeight: 46,
        summary:
          "Cross-verified across NWS CAP alert bulletin #URG-2026-884, public library operating schedules, and municipal transit directive #2026-14.",
        telemetry: "NWS-CAP: Active | COOLING-SITES: 6 confirmed | TRANSIT: Fare waived",
      },
      rhetoric: {
        title: "Urgency & Framing Scanner",
        findingTag: "Measured Public Advisory",
        signalWeight: 26,
        summary:
          "Clear, calm, time-bounded operational guidance with specific street resources and zero manipulative share-bait.",
        telemetry: "AROUSAL-INDEX: 18/100 | TONE: Neutral operational bulletin",
      },
    },
    artifactData: {
      type: "telemetry-verification",
      title: "Multi-Agency Telemetry Concordance",
      viralHeader: "Dispatched Civic Bulletin",
      viralDetail:
        "Window 12:00 PM to 8:00 PM, Heat Index 109 F, 6 municipal cooling centers with transit waivers.",
      viralMetric: "109 F Advisory",
      verifiedHeader: "NOAA ASOS + City OEM Primary Feed",
      verifiedDetail:
        "METAR observation 99 F / 74 F dewpoint (109 F Heat Index) + Directive #2026-14 confirmed live.",
      verifiedMetric: "100% Concordant",
    },
    debrief:
      "Media literacy includes recognizing trustworthy civic alerts. When verified .gov domains, independent weather station telemetry, and municipal transit notices align without manipulative framing, editors verify and amplify the bulletin.",
  },
  {
    id: "dispatch-05-cherry-picked-chart",
    code: "SD-2026-05",
    category: "Data Visualization Claim",
    headline: "Viral Bar Graph Claims City Particulate Pollution Plunged 90% Overnight",
    sourceOutlet: "metro-policy-watch.info",
    sourceHandle: "@CleanAirVictoryFeed",
    timestampLabel: "14:20 LOCAL",
    viralVelocity: 15600,
    correctStamp: STAMP_TYPES.MISLEADING_CONTEXT,
    keyProbes: ["forensics", "primary"],
    claimCopy:
      "Look at the giant drop in the second bar! City air pollution was practically eliminated overnight thanks to the new traffic signal timing algorithm!",
    contextNote:
      "High-engagement infographic comparing two vertical bars labeled Tuesday and Wednesday.",
    probes: {
      whois: {
        title: "Domain & WHOIS Registry",
        findingTag: "Unattributed Commentary Blog",
        signalWeight: 20,
        summary:
          "Domain metro-policy-watch.info lists no editorial masthead, environmental sensor network, or raw CSV repository.",
        telemetry: "TLD: .info | DATA-REPO: None linked | MASTHEAD: Anonymous",
      },
      forensics: {
        title: "Media & Chart Forensics",
        findingTag: "Truncated Y-Axis (88 to 92)",
        signalWeight: 48,
        summary:
          "The vertical axis starts at 88.0 instead of 0.0. A minor move from 91.6 to 88.4 (3.5% change) is drawn as a 90% collapse in bar height.",
        telemetry: "Y-AXIS-MIN: 88.0 | BAR-A: 91.6 | BAR-B: 88.4 | REAL-DELTA: -3.5%",
      },
      primary: {
        title: "Primary Source Cross-Check",
        findingTag: "Routine 3.5% Variance",
        signalWeight: 38,
        summary:
          "EPA AirNow continuous monitors show normal daily breeze fluctuation (-3.5%), well within the standard 30-day rolling band.",
        telemetry: "AIRNOW-DELTA: -3.5% | 30D-BAND: 86.0 to 94.0 | POLICY-EFFECT: Unproven",
      },
      rhetoric: {
        title: "Urgency & Framing Scanner",
        findingTag: "Visual Hyperbole",
        signalWeight: 22,
        summary:
          "Directs attention to visual bar height ('Look at the giant drop!') to distract readers from reading the truncated axis numbers.",
        telemetry: "AROUSAL-INDEX: 69/100 | DISTORTION: Axis baseline suppression",
      },
    },
    artifactData: {
      type: "axis-truncation",
      title: "Vertical Axis Baseline Inspection",
      viralHeader: "Viral Chart (Y-Axis: 88.0 to 92.0)",
      viralDetail:
        "Truncated baseline makes 88.4 appear 90% shorter than 91.6, creating a false visual cliff.",
      viralMetric: "90% Visual Drop",
      verifiedHeader: "Zero-Baseline Plot (Y-Axis: 0.0 to 100.0)",
      verifiedDetail:
        "Plotting from zero shows Bar A (91.6) and Bar B (88.4) differ by a routine 3.5% breeze fluctuation.",
      verifiedMetric: "3.5% Actual Shift",
    },
    debrief:
      "Truncating a bar chart's vertical axis from 88 to 92 turns a routine 3.5% daily fluctuation into a dramatic visual cliff. Checking the axis baseline and raw EPA AirNow figures catches the distortion immediately.",
  },
  {
    id: "dispatch-06-synthetic-audio",
    code: "SD-2026-06",
    category: "Synthetic Media / Deepfake",
    headline: "Forwarded Voice Memo Claiming Immediate Metro Rail Shutdown",
    sourceOutlet: "cdn-voice-clip-774.xyz",
    sourceHandle: "Forwarded Group Voice Note",
    timestampLabel: "16:45 LOCAL",
    viralVelocity: 23100,
    correctStamp: STAMP_TYPES.FABRICATED_IMPOSTER,
    keyProbes: ["forensics", "primary"],
    claimCopy:
      "Forwarded many times: Leaked voice note from the Transit Director ordering all rail lines locked down at 5:00 PM due to a grid failure. Do not wait for the news, leave work now!",
    contextNote:
      "Unverified 19-second audio clip spreading rapidly across commuter group chats before rush hour.",
    probes: {
      whois: {
        title: "Domain & WHOIS Registry",
        findingTag: "Ephemeral .xyz Bucket",
        signalWeight: 26,
        summary:
          "Audio file is hosted on an anonymous .xyz storage bucket created 12 hours ago with zero transit agency provenance.",
        telemetry: "HOST: cdn-voice-clip-774.xyz | BUCKET-AGE: 12h | CORP-AUTH: None",
      },
      forensics: {
        title: "Media & Chart Forensics",
        findingTag: "8 kHz TTS Spectral Cutoff",
        signalWeight: 47,
        summary:
          "Spectrogram shows a hard brick-wall frequency ceiling at 8.0 kHz, metallic formant artifacts, and zero natural breath pauses typical of low-bitrate voice cloning.",
        telemetry: "SPECTRAL-CEILING: 8.0 kHz | BREATH-CADENCE: 0 | CLONE-SCORE: 94%",
      },
      primary: {
        title: "Primary Source Cross-Check",
        findingTag: "Zero Agency Corroboration",
        signalWeight: 45,
        summary:
          "Official Transit Authority live GTFS-realtime feed and verified dispatch desk confirm all rail lines are running on normal 6-minute headways.",
        telemetry: "GTFS-STATUS: Normal Service | HEADWAY: 6 min | GRID-FAULTS: 0",
      },
      rhetoric: {
        title: "Urgency & Framing Scanner",
        findingTag: "Anti-Verification Priming",
        signalWeight: 28,
        summary:
          "Uses 'Forwarded many times' insider mystique and 'Do not wait for the news' instructions to discourage checking official transit status.",
        telemetry: "AROUSAL-INDEX: 92/100 | PRIMING: Explicit anti-check command",
      },
    },
    artifactData: {
      type: "audio-spectrogram",
      title: "Acoustic Spectrogram & GTFS Audit",
      viralHeader: "Viral Voice Clip (cdn-voice-clip-774.xyz)",
      viralDetail:
        "Hard 8.0 kHz brick-wall spectral cutoff, uniform robotic pitch contour, zero room ambience.",
      viralMetric: "8.0 kHz TTS Ceiling",
      verifiedHeader: "Authentic Press Audio + Live GTFS",
      verifiedDetail:
        "Full 20.0 kHz natural vocal harmonics and verified GTFS telemetry showing normal 6-minute train headways.",
      verifiedMetric: "20.0 kHz Natural / Live",
    },
    debrief:
      "Synthetic voice-clone hoaxes often exhibit a hard 8 kHz frequency ceiling and instruct listeners not to check official news. Pairing spectrogram inspection with live GTFS transit feeds neutralizes commuter panic.",
  },
]);

export const CUSTOM_CLAIM_SIGNALS = Object.freeze([
  {
    id: "domainSpoof",
    label: "Lookalike or newly registered domain (e.g., .org/.xyz impersonating .gov or news desk)",
    riskWeight: 28,
    remediation: "Open a new tab and search the official agency or outlet masthead directly.",
  },
  {
    id: "missingPrimary",
    label: "No link to primary telemetry, full study methods, or official agency bulletin",
    riskWeight: 24,
    remediation: "Locate the original dataset, clinical trial registry, or public agency feed before sharing.",
  },
  {
    id: "croppedOrTruncated",
    label: "Cropped photo/video frame or chart axis that does not start at zero",
    riskWeight: 20,
    remediation: "Run a reverse image lookup or re-plot the chart from a zero baseline.",
  },
  {
    id: "emotionalUrgency",
    label: "High-arousal urgency ('Share before deleted!', 'FINAL NOTICE', all-caps panic)",
    riskWeight: 16,
    remediation: "Pause 30 seconds; urgent share commands are the primary vector for viral misinformation.",
  },
  {
    id: "conflictOfInterest",
    label: "Undisclosed financial sponsor, tiny sample size (n < 30), or anonymous 'insider' voice note",
    riskWeight: 12,
    remediation: "Check funding disclosures, sample size n, and independent corroboration.",
  },
]);

export function getDispatchById(dispatchId) {
  if (typeof dispatchId !== "string" || dispatchId.trim() === "") {
    return null;
  }
  const found = DISPATCHES.find((d) => d.id === dispatchId);
  return found ? found : null;
}

export function createInitialGameState() {
  return {
    currentIndex: 0,
    inspectedProbesByDispatch: {},
    decisionsByDispatch: {},
    streak: 0,
    maxStreak: 0,
    totalScore: 0,
    sharesPrevented: 0,
    verifiedReachSupported: 0,
    audioMuted: false,
  };
}

export function getInspectedProbes(state, dispatchId) {
  if (!state || typeof state !== "object" || typeof dispatchId !== "string") {
    return [];
  }
  const list = state.inspectedProbesByDispatch[dispatchId];
  return Array.isArray(list) ? [...list] : [];
}

export function inspectProbe(state, dispatchId, probeKey) {
  const dispatch = getDispatchById(dispatchId);
  if (!dispatch) {
    throw new Error(`Unknown dispatch id: ${String(dispatchId)}`);
  }
  if (!PROBE_TYPES.includes(probeKey)) {
    throw new Error(`Invalid probe key: ${String(probeKey)}`);
  }

  const existing = getInspectedProbes(state, dispatchId);
  const alreadyInspected = existing.includes(probeKey);
  const nextProbes = alreadyInspected ? existing : [...existing, probeKey];

  return {
    ...state,
    inspectedProbesByDispatch: {
      ...state.inspectedProbesByDispatch,
      [dispatchId]: nextProbes,
    },
  };
}

export function calculateRoundScore({
  dispatch,
  selectedStamp,
  inspectedProbes,
  currentStreak = 0,
}) {
  if (!dispatch || typeof dispatch !== "object") {
    throw new Error("Valid dispatch object is required");
  }
  if (!Object.values(STAMP_TYPES).includes(selectedStamp)) {
    throw new Error(`Invalid stamp type: ${String(selectedStamp)}`);
  }

  const probes = Array.isArray(inspectedProbes)
    ? Array.from(new Set(inspectedProbes.filter((p) => PROBE_TYPES.includes(p))))
    : [];

  const isCorrect = selectedStamp === dispatch.correctStamp;
  const keyProbes = dispatch.keyProbes;
  const keyHits = keyProbes.filter((k) => probes.includes(k)).length;

  // Base accuracy score
  const accuracyPoints = isCorrect ? 60 : 0;

  // Evidence gathering points (up to 25 points)
  let evidencePoints = 0;
  if (keyHits === 2) {
    evidencePoints = 25;
  } else if (keyHits === 1) {
    evidencePoints = 14;
  } else if (probes.length >= 1) {
    evidencePoints = 6;
  }

  // Lateral efficiency bonus: inspected both high-signal probes without needing all 4, and stamped accurately
  let efficiencyBonus = 0;
  if (isCorrect && keyHits === 2 && probes.length <= 3) {
    efficiencyBonus = 10;
  } else if (isCorrect && probes.length >= 2) {
    efficiencyBonus = 5;
  }

  // Blind-guess penalty if player stamps with 0 probes inspected
  const blindGuessPenalty = probes.length === 0 ? 25 : 0;

  // Streak bonus (up to +5 points when correct and on an active streak)
  const safeStreak = Math.max(0, Number(currentStreak) || 0);
  const streakBonus = isCorrect ? Math.min(5, safeStreak) : 0;

  const rawScore =
    accuracyPoints +
    evidencePoints +
    efficiencyBonus +
    streakBonus -
    blindGuessPenalty;

  const roundScore = Math.max(0, Math.min(100, rawScore));

  // Impact metrics
  let impactDelta = 0;
  if (isCorrect && probes.length >= 1) {
    const coverageRatio = keyHits === 2 ? 1.0 : probes.length >= 2 ? 0.85 : 0.65;
    impactDelta = Math.round(dispatch.viralVelocity * coverageRatio);
  } else if (isCorrect && probes.length === 0) {
    impactDelta = Math.round(dispatch.viralVelocity * 0.35);
  }

  const sharesPreventedDelta =
    dispatch.correctStamp !== STAMP_TYPES.VERIFIED_BULLETIN ? impactDelta : 0;
  const verifiedReachDelta =
    dispatch.correctStamp === STAMP_TYPES.VERIFIED_BULLETIN ? impactDelta : 0;

  return {
    isCorrect,
    roundScore,
    accuracyPoints,
    evidencePoints,
    efficiencyBonus,
    blindGuessPenalty,
    streakBonus,
    keyHits,
    probesInspectedCount: probes.length,
    nextStreak: isCorrect ? safeStreak + 1 : 0,
    sharesPreventedDelta,
    verifiedReachDelta,
  };
}

export function submitDispatchStamp(state, dispatchId, selectedStamp) {
  const dispatch = getDispatchById(dispatchId);
  if (!dispatch) {
    throw new Error(`Unknown dispatch id: ${String(dispatchId)}`);
  }

  // Prevent double-scoring if already stamped; allow idempotent read or clean re-evaluation
  const previousDecision = state.decisionsByDispatch[dispatchId];
  const inspectedProbes = getInspectedProbes(state, dispatchId);

  const baseStreak = previousDecision ? previousDecision.streakBefore : state.streak;
  const result = calculateRoundScore({
    dispatch,
    selectedStamp,
    inspectedProbes,
    currentStreak: baseStreak,
  });

  const nextDecisions = {
    ...state.decisionsByDispatch,
    [dispatchId]: {
      dispatchId,
      selectedStamp,
      correctStamp: dispatch.correctStamp,
      streakBefore: baseStreak,
      ...result,
    },
  };

  // Recompute aggregate totals across all recorded decisions deterministically
  let totalScore = 0;
  let sharesPrevented = 0;
  let verifiedReachSupported = 0;
  let runningStreak = 0;
  let maxStreak = 0;

  for (const item of DISPATCHES) {
    const dec = nextDecisions[item.id];
    if (dec) {
      totalScore += dec.roundScore;
      sharesPrevented += dec.sharesPreventedDelta;
      verifiedReachSupported += dec.verifiedReachDelta;
      if (dec.isCorrect) {
        runningStreak += 1;
        if (runningStreak > maxStreak) {
          maxStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }
  }

  return {
    ...state,
    decisionsByDispatch: nextDecisions,
    streak: runningStreak,
    maxStreak,
    totalScore,
    sharesPrevented,
    verifiedReachSupported,
  };
}

export function computeNewsroomRating(totalScore, completedCount = DISPATCHES.length) {
  const count = Math.max(1, Number(completedCount) || 1);
  const averageScore = totalScore / count;

  if (averageScore >= 90) {
    return {
      grade: "S",
      title: "Senior Standards Editor",
      summary: "Exemplary lateral verification across primary telemetry, WHOIS provenance, and media forensics.",
    };
  }
  if (averageScore >= 75) {
    return {
      grade: "A",
      title: "Verified Desk Correspondent",
      summary: "Strong lateral verification habits with reliable primary-source cross-checking.",
    };
  }
  if (averageScore >= 55) {
    return {
      grade: "B",
      title: "Junior Fact-Check Fellow",
      summary: "Caught major fabrications, but inspect both high-signal probes before stamping to maximize accuracy.",
    };
  }
  return {
    grade: "C",
    title: "Provisional Copy Desk",
    summary: "Slow down before sharing: open WHOIS and primary telemetry probes before issuing an editorial stamp.",
  };
}

export function evaluateCustomClaim(activeSignalIds = [], headlineText = "") {
  const activeSet = new Set(Array.isArray(activeSignalIds) ? activeSignalIds : []);
  let riskScore = 0;
  const triggeredSignals = [];

  for (const signal of CUSTOM_CLAIM_SIGNALS) {
    if (activeSet.has(signal.id)) {
      riskScore += signal.riskWeight;
      triggeredSignals.push(signal);
    }
  }

  // Check headline text heuristics for all-caps urgency or exclamation clusters
  const trimmed = typeof headlineText === "string" ? headlineText.trim() : "";
  const hasExclamationCluster = trimmed.includes("!!") || trimmed.includes("?!");
  const hasUrgentKeyword =
    /\b(share before|deleted|final notice|urgent|leaked|miracle|100% proven)\b/i.test(
      trimmed
    );

  if (hasExclamationCluster && !activeSet.has("emotionalUrgency")) {
    riskScore = Math.min(100, riskScore + 8);
  }
  if (hasUrgentKeyword && !activeSet.has("emotionalUrgency")) {
    riskScore = Math.min(100, riskScore + 8);
  }

  const clampedRisk = Math.max(0, Math.min(100, riskScore));

  let recommendedStamp = STAMP_TYPES.VERIFIED_BULLETIN;
  let verdictLabel = "LOW RISK: PROCEED WITH PRIMARY VERIFICATION";
  if (clampedRisk >= 52 || activeSet.has("domainSpoof")) {
    recommendedStamp = STAMP_TYPES.FABRICATED_IMPOSTER;
    verdictLabel = "HIGH RISK: HOLD & QUARANTINE AS LIKELY IMPOSTER / FABRICATED";
  } else if (clampedRisk >= 24) {
    recommendedStamp = STAMP_TYPES.MISLEADING_CONTEXT;
    verdictLabel = "MODERATE RISK: AUDIT FOR MISSING OR DISTORTED CONTEXT";
  }

  return {
    riskScore: clampedRisk,
    recommendedStamp,
    recommendedStampLabel: STAMP_LABELS[recommendedStamp],
    verdictLabel,
    triggeredCount: triggeredSignals.length,
    remediations: triggeredSignals.map((s) => s.remediation),
  };
}

export function resolveKeyboardShortcut(key, isInputFocused = false) {
  if (isInputFocused || typeof key !== "string") {
    return null;
  }
  const normalized = key.trim().toLowerCase();
  if (normalized === "1") {
    return { action: "probe", probeKey: "whois" };
  }
  if (normalized === "2") {
    return { action: "probe", probeKey: "forensics" };
  }
  if (normalized === "3") {
    return { action: "probe", probeKey: "primary" };
  }
  if (normalized === "4") {
    return { action: "probe", probeKey: "rhetoric" };
  }
  if (normalized === "v") {
    return { action: "stamp", stampType: STAMP_TYPES.VERIFIED_BULLETIN };
  }
  if (normalized === "m") {
    return { action: "stamp", stampType: STAMP_TYPES.MISLEADING_CONTEXT };
  }
  if (normalized === "f") {
    return { action: "stamp", stampType: STAMP_TYPES.FABRICATED_IMPOSTER };
  }
  if (normalized === "n") {
    return { action: "next" };
  }
  return null;
}

export function selectDispatchIndex(state, nextIndex) {
  const numeric = Number(nextIndex);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric >= DISPATCHES.length) {
    throw new Error(`Invalid dispatch index: ${String(nextIndex)}`);
  }
  return {
    ...state,
    currentIndex: numeric,
  };
}

export function advanceToNextDispatch(state) {
  const nextIndex = (state.currentIndex + 1) % DISPATCHES.length;
  return {
    ...state,
    currentIndex: nextIndex,
  };
}

export function toggleAudioMute(state) {
  return {
    ...state,
    audioMuted: !state.audioMuted,
  };
}

export function getDispatchProgressSummary(state) {
  const completedIds = Object.keys(state.decisionsByDispatch);
  const completedCount = completedIds.length;
  const correctCount = completedIds.filter(
    (id) => state.decisionsByDispatch[id] && state.decisionsByDispatch[id].isCorrect === true
  ).length;
  const rating = computeNewsroomRating(
    state.totalScore,
    completedCount === 0 ? 1 : completedCount
  );
  return {
    completedCount,
    totalDispatches: DISPATCHES.length,
    correctCount,
    accuracyPercent:
      completedCount === 0 ? 0 : Math.round((correctCount / completedCount) * 100),
    allCompleted: completedCount === DISPATCHES.length,
    rating,
  };
}

