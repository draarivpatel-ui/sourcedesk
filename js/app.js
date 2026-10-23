/**
 * SourceDesk Newsroom Desk UI Controller & Web Audio Synthesizer
 */

import {
  STAMP_TYPES,
  STAMP_LABELS,
  PROBE_TYPES,
  PROBE_METADATA,
  DISPATCHES,
  CUSTOM_CLAIM_SIGNALS,
  createInitialGameState,
  getInspectedProbes,
  inspectProbe,
  submitDispatchStamp,
  evaluateCustomClaim,
  resolveKeyboardShortcut,
  selectDispatchIndex,
  advanceToNextDispatch,
  toggleAudioMute,
  getDispatchProgressSummary,
} from "./sourcedesk-engine.js";

let gameState = createInitialGameState();
let audioCtx = null;
let archiveComparisonMode = "both";
const activeCustomSignals = new Set();

function ensureAudioContext() {
  if (gameState.audioMuted) {
    return null;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioContextCtor();
  }
  if (Object.is(audioCtx.state, "suspended")) {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playMechanicalSound(kind) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  if (Object.is(kind, "probe")) {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.055);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
    return;
  }

  if (Object.is(kind, "stamp-correct")) {
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.11);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
    return;
  }

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(95, now + 0.14);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.17);
}

function buildForensicGraphicSvg(dispatch) {
  const kind = dispatch.artifactData.type;
  if (Object.is(kind, "axis-truncation")) {
    return `
      <svg class="forensic-svg" viewBox="0 0 520 150" role="img" aria-label="Comparison of truncated axis 88 to 92 versus zero baseline 0 to 100">
        <rect x="8" y="8" width="240" height="134" rx="4" fill="#EFECE3" stroke="#121619" stroke-width="1.5"/>
        <text x="20" y="28" fill="#B45309" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600">VIRAL: Y-AXIS [88.0 - 92.0]</text>
        <line x1="36" y1="42" x2="36" y2="122" stroke="#121619" stroke-width="1.5"/>
        <line x1="36" y1="122" x2="226" y2="122" stroke="#121619" stroke-width="1.5"/>
        <rect x="64" y="48" width="46" height="74" fill="#D9381E"/>
        <rect x="146" y="112" width="46" height="10" fill="#B45309"/>
        <text x="65" y="136" fill="#121619" font-family="JetBrains Mono, monospace" font-size="10">TUE 91.6</text>
        <text x="145" y="136" fill="#121619" font-family="JetBrains Mono, monospace" font-size="10">WED 88.4</text>

        <rect x="272" y="8" width="240" height="134" rx="4" fill="#EFECE3" stroke="#121619" stroke-width="1.5"/>
        <text x="284" y="28" fill="#0F766E" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600">ARCHIVE: Y-AXIS [0.0 - 100.0]</text>
        <line x1="300" y1="42" x2="300" y2="122" stroke="#121619" stroke-width="1.5"/>
        <line x1="300" y1="122" x2="490" y2="122" stroke="#121619" stroke-width="1.5"/>
        <rect x="328" y="50" width="46" height="72" fill="#0F766E"/>
        <rect x="410" y="53" width="46" height="69" fill="#0F766E"/>
        <text x="329" y="136" fill="#121619" font-family="JetBrains Mono, monospace" font-size="10">TUE 91.6</text>
        <text x="409" y="136" fill="#121619" font-family="JetBrains Mono, monospace" font-size="10">WED 88.4</text>
      </svg>
    `;
  }

  if (Object.is(kind, "audio-spectrogram")) {
    return `
      <svg class="forensic-svg" viewBox="0 0 520 150" role="img" aria-label="Comparison of 8 kHz synthetic TTS spectral shelf versus 20 kHz natural voice spectrum">
        <rect x="8" y="8" width="240" height="134" rx="4" fill="#121619" stroke="#121619" stroke-width="1.5"/>
        <text x="20" y="28" fill="#D9381E" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600">SYNTHETIC CLIP: 8.0 kHz CUTOFF</text>
        <line x1="20" y1="74" x2="236" y2="74" stroke="#D9381E" stroke-dasharray="4 3" stroke-width="1.5"/>
        <text x="24" y="67" fill="#F6F3EC" font-family="JetBrains Mono, monospace" font-size="9">EMPTY BAND ABOVE 8.0 kHz</text>
        <path d="M22 115 Q45 82 68 112 T114 108 T160 114 T206 106 L234 115" fill="none" stroke="#D9381E" stroke-width="2"/>

        <rect x="272" y="8" width="240" height="134" rx="4" fill="#121619" stroke="#121619" stroke-width="1.5"/>
        <text x="284" y="28" fill="#2DD4BF" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600">NATURAL VOICE: FULL 20.0 kHz</text>
        <path d="M286 118 Q305 46 326 96 T368 52 T412 88 T456 48 L498 104" fill="none" stroke="#2DD4BF" stroke-width="2"/>
        <text x="288" y="134" fill="#F6F3EC" font-family="JetBrains Mono, monospace" font-size="9">NATURAL HARMONICS + GTFS LIVE</text>
      </svg>
    `;
  }

  return `
    <svg class="forensic-svg" viewBox="0 0 520 150" role="img" aria-label="Forensic discrepancy comparison diagram">
      <rect x="8" y="8" width="240" height="134" rx="4" fill="#EFECE3" stroke="#121619" stroke-width="1.5"/>
      <text x="20" y="30" fill="#B45309" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600">VIRAL ARTIFACT TRACE</text>
      <rect x="20" y="42" width="216" height="58" rx="3" fill="#F6F3EC" stroke="#B45309" stroke-dasharray="4 3" stroke-width="1.5"/>
      <text x="30" y="75" fill="#121619" font-family="JetBrains Mono, monospace" font-size="11">${dispatch.artifactData.viralMetric}</text>
      <text x="20" y="124" fill="#121619" font-family="Space Grotesk, sans-serif" font-size="11">${dispatch.sourceOutlet}</text>

      <rect x="272" y="8" width="240" height="134" rx="4" fill="#EFECE3" stroke="#121619" stroke-width="1.5"/>
      <text x="284" y="30" fill="#0F766E" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600">PRIMARY ARCHIVE RECORD</text>
      <rect x="284" y="42" width="216" height="58" rx="3" fill="#F6F3EC" stroke="#0F766E" stroke-width="1.5"/>
      <text x="294" y="75" fill="#0F766E" font-family="JetBrains Mono, monospace" font-size="11">${dispatch.artifactData.verifiedMetric}</text>
      <text x="284" y="124" fill="#121619" font-family="Space Grotesk, sans-serif" font-size="11">Cross-Checked Primary Telemetry</text>
    </svg>
  `;
}

const ATTR_TRUE = String(Boolean(1));
const ATTR_FALSE = String(Boolean(0));

function renderScenarioSwitcher() {
  const container = document.getElementById("scenario-switcher");
  if (!container) {
    return;
  }
  container.innerHTML = DISPATCHES.map((d, idx) => {
    const isActive = Object.is(idx, gameState.currentIndex);
    const decision = gameState.decisionsByDispatch[d.id];
    let statusBadge = "UNSTAMPED";
    let statusClass = "pill-pending";
    if (decision) {
      statusBadge = decision.isCorrect ? `${decision.roundScore} PTS` : `REVIEW (${decision.roundScore})`;
      statusClass = decision.isCorrect ? "pill-verified" : "pill-alert";
    }
    return `
      <button
        type="button"
        class="dispatch-tab ${isActive ? "is-active" : ""}"
        data-dispatch-index="${idx}"
        aria-pressed="${isActive ? ATTR_TRUE : ATTR_FALSE}"
      >
        <span class="dispatch-tab-code">${d.code}</span>
        <span class="dispatch-tab-title">${d.headline}</span>
        <span class="dispatch-tab-pill ${statusClass}">${statusBadge}</span>
      </button>
    `;
  }).join("");
}

function renderTopTelemetry() {
  const progress = getDispatchProgressSummary(gameState);
  const scoreEl = document.getElementById("metric-total-score");
  const streakEl = document.getElementById("metric-streak");
  const preventedEl = document.getElementById("metric-shares-prevented");
  const ratingEl = document.getElementById("metric-trust-rating");
  const progressEl = document.getElementById("metric-progress-count");

  if (scoreEl) scoreEl.textContent = String(gameState.totalScore);
  if (streakEl) streakEl.textContent = `${gameState.streak} (MAX ${gameState.maxStreak})`;
  if (preventedEl) {
    const combinedCivicImpact = gameState.sharesPrevented + gameState.verifiedReachSupported;
    preventedEl.textContent = combinedCivicImpact.toLocaleString("en-US");
  }
  if (ratingEl) {
    ratingEl.textContent = `${progress.rating.grade} / ${progress.rating.title}`;
  }
  if (progressEl) {
    progressEl.textContent = `${progress.completedCount} of ${progress.totalDispatches} Dispatches Stamped`;
  }

  const muteBtn = document.getElementById("btn-toggle-audio");
  if (muteBtn) {
    muteBtn.setAttribute("aria-pressed", gameState.audioMuted ? ATTR_TRUE : ATTR_FALSE);
    const labelSpan = muteBtn.querySelector(".audio-label-text");
    if (labelSpan) {
      labelSpan.textContent = gameState.audioMuted ? "Desk Audio: Muted" : "Desk Audio: Active";
    }
  }
}

function renderActiveDispatch() {
  const dispatch = DISPATCHES[gameState.currentIndex];
  const inspected = getInspectedProbes(gameState, dispatch.id);
  const decision = gameState.decisionsByDispatch[dispatch.id];

  const codeEl = document.getElementById("dispatch-code-badge");
  const categoryEl = document.getElementById("dispatch-category-badge");
  const timeEl = document.getElementById("dispatch-timestamp");
  const headlineEl = document.getElementById("dispatch-headline");
  const sourceEl = document.getElementById("dispatch-source");
  const velocityEl = document.getElementById("dispatch-velocity");
  const claimEl = document.getElementById("dispatch-claim-copy");
  const contextEl = document.getElementById("dispatch-context-note");

  if (codeEl) codeEl.textContent = dispatch.code;
  if (categoryEl) categoryEl.textContent = dispatch.category;
  if (timeEl) timeEl.textContent = dispatch.timestampLabel;
  if (headlineEl) headlineEl.textContent = dispatch.headline;
  if (sourceEl) sourceEl.textContent = `${dispatch.sourceHandle} (${dispatch.sourceOutlet})`;
  if (velocityEl) {
    velocityEl.textContent = `${dispatch.viralVelocity.toLocaleString("en-US")} est. shares/hr`;
  }
  if (claimEl) claimEl.textContent = `"${dispatch.claimCopy}"`;
  if (contextEl) contextEl.textContent = dispatch.contextNote;

  // Forensic comparison card
  const artifactTitleEl = document.getElementById("artifact-title");
  const viralBoxEl = document.getElementById("artifact-viral-box");
  const verifiedBoxEl = document.getElementById("artifact-verified-box");
  const graphicHolder = document.getElementById("artifact-svg-holder");

  if (artifactTitleEl) artifactTitleEl.textContent = dispatch.artifactData.title;
  if (viralBoxEl) {
    viralBoxEl.hidden = Object.is(archiveComparisonMode, "verified");
    viralBoxEl.innerHTML = `
      <h4 class="artifact-pane-heading">${dispatch.artifactData.viralHeader}</h4>
      <p class="artifact-pane-body">${dispatch.artifactData.viralDetail}</p>
      <div class="artifact-pane-metric">${dispatch.artifactData.viralMetric}</div>
    `;
  }
  if (verifiedBoxEl) {
    verifiedBoxEl.hidden = Object.is(archiveComparisonMode, "viral");
    verifiedBoxEl.innerHTML = `
      <h4 class="artifact-pane-heading">${dispatch.artifactData.verifiedHeader}</h4>
      <p class="artifact-pane-body">${dispatch.artifactData.verifiedDetail}</p>
      <div class="artifact-pane-metric is-verified">${dispatch.artifactData.verifiedMetric}</div>
    `;
  }
  if (graphicHolder) {
    graphicHolder.innerHTML = buildForensicGraphicSvg(dispatch);
  }

  // Render 4 lateral-reading probe instruments
  const probesGrid = document.getElementById("probes-grid");
  if (probesGrid) {
    probesGrid.innerHTML = PROBE_TYPES.map((probeKey) => {
      const meta = PROBE_METADATA[probeKey];
      const probeData = dispatch.probes[probeKey];
      const isInspected = inspected.includes(probeKey);
      const isKeySignal = dispatch.keyProbes.includes(probeKey);

      return `
        <article class="probe-card ${isInspected ? "is-inspected" : ""}">
          <div class="probe-card-header">
            <button
              type="button"
              class="probe-trigger-btn"
              data-probe-key="${probeKey}"
              aria-expanded="${isInspected ? ATTR_TRUE : ATTR_FALSE}"
            >
              <span class="probe-key-badge">[${meta.shortcutKey}]</span>
              <span class="probe-title-text">${meta.title}</span>
              <span class="probe-action-state">${isInspected ? "INSPECTED" : "RUN PROBE"}</span>
            </button>
          </div>
          <div class="probe-card-body">
            ${
              isInspected
                ? `
                  <div class="probe-tag-row">
                    <span class="probe-finding-badge ${isKeySignal ? "is-high-signal" : ""}">
                      ${probeData.findingTag}
                    </span>
                    <span class="probe-weight-badge">
                      Signal Weight: ${probeData.signalWeight}%
                    </span>
                  </div>
                  <p class="probe-summary-text">${probeData.summary}</p>
                  <code class="probe-telemetry-line">${probeData.telemetry}</code>
                `
                : `
                  <p class="probe-uninspected-hint">
                    Instrument standby (${meta.instrumentName}). Activate probe [${meta.shortcutKey}] to inspect lateral evidence before stamping.
                  </p>
                `
            }
          </div>
        </article>
      `;
    }).join("");
  }

  // Render probe counter status
  const probeStatusEl = document.getElementById("probe-counter-status");
  if (probeStatusEl) {
    probeStatusEl.textContent = `${inspected.length} of 4 Probes Inspected (Tip: Find the 2 High-Signal Probes for maximum Efficiency Bonus)`;
  }

  // Render Stamp Buttons active state
  document.querySelectorAll("[data-stamp-type]").forEach((btn) => {
    const st = btn.getAttribute("data-stamp-type");
    const isChosen = Boolean(decision && Object.is(decision.selectedStamp, st));
    btn.classList.toggle("is-selected-stamp", isChosen);
    btn.setAttribute("aria-pressed", isChosen ? ATTR_TRUE : ATTR_FALSE);
  });

  // Render Editorial Debrief Banner
  const debriefPanel = document.getElementById("editorial-debrief-panel");
  if (debriefPanel) {
    if (!decision) {
      debriefPanel.innerHTML = `
        <div class="debrief-placeholder">
          <h3 class="debrief-heading">Awaiting Editorial Verdict Stamp</h3>
          <p class="debrief-copy">
            Run at least two lateral-reading probes above, then apply your editorial stamp:
            <strong>Verified Bulletin [V]</strong>, <strong>Misleading Context [M]</strong>, or
            <strong>Fabricated / Imposter [F]</strong>.
          </p>
        </div>
      `;
      debriefPanel.className = "debrief-panel is-idle";
    } else {
      const verdictClass = decision.isCorrect ? "is-correct" : "is-incorrect";
      const statusHeadline = decision.isCorrect
        ? `VERDICT CONFIRMED: ${STAMP_LABELS[decision.correctStamp]} (+${decision.roundScore} PTS)`
        : `EDITORIAL CORRECTION NEEDED: Expected ${STAMP_LABELS[decision.correctStamp]} (+${decision.roundScore} PTS)`;

      debriefPanel.className = `debrief-panel ${verdictClass}`;
      debriefPanel.innerHTML = `
        <div class="debrief-result-header">
          <h3 class="debrief-heading">${statusHeadline}</h3>
          <div class="debrief-score-pills">
            <span class="score-breakdown-pill">Accuracy: +${decision.accuracyPoints}</span>
            <span class="score-breakdown-pill">Evidence: +${decision.evidencePoints}</span>
            <span class="score-breakdown-pill">Efficiency: +${decision.efficiencyBonus}</span>
            <span class="score-breakdown-pill">Streak Bonus: +${decision.streakBonus}</span>
            ${
              decision.blindGuessPenalty
                ? `<span class="score-breakdown-pill is-penalty">Blind Stamp Penalty: -${decision.blindGuessPenalty}</span>`
                : ""
            }
          </div>
        </div>
        <p class="debrief-copy">${dispatch.debrief}</p>
      `;
    }
  }
}

function renderCustomClaimVerifier() {
  const checklistHolder = document.getElementById("custom-claim-checklist");
  const inputEl = document.getElementById("custom-claim-input");
  const scoreEl = document.getElementById("custom-risk-score");
  const stampEl = document.getElementById("custom-recommended-stamp");
  const verdictEl = document.getElementById("custom-verdict-label");
  const remediationListEl = document.getElementById("custom-remediation-list");

  if (checklistHolder && Object.is(checklistHolder.children.length, 0)) {
    checklistHolder.innerHTML = CUSTOM_CLAIM_SIGNALS.map((sig) => {
      const checked = activeCustomSignals.has(sig.id);
      return `
        <label class="custom-signal-row">
          <input
            type="checkbox"
            class="custom-signal-checkbox"
            data-custom-signal="${sig.id}"
            ${checked ? "checked" : ""}
          />
          <span class="custom-signal-text">${sig.label}</span>
          <span class="custom-signal-weight">+${sig.riskWeight} Risk</span>
        </label>
      `;
    }).join("");
  }

  const headlineText = inputEl ? inputEl.value : "";
  const evaluation = evaluateCustomClaim(Array.from(activeCustomSignals), headlineText);

  if (scoreEl) scoreEl.textContent = `${evaluation.riskScore} / 100`;
  if (stampEl) {
    stampEl.textContent = evaluation.recommendedStampLabel;
    stampEl.setAttribute("data-stamp-badge", evaluation.recommendedStamp);
  }
  if (verdictEl) verdictEl.textContent = evaluation.verdictLabel;
  if (remediationListEl) {
    if (Object.is(evaluation.remediations.length, 0)) {
      remediationListEl.innerHTML = `
        <li>No red-flag lateral signals toggled yet. Paste a headline or toggle observed warning signs above to compute a live verification plan.</li>
      `;
    } else {
      remediationListEl.innerHTML = evaluation.remediations
        .map((item) => `<li>${item}</li>`)
        .join("");
    }
  }
}

function renderAll() {
  renderScenarioSwitcher();
  renderTopTelemetry();
  renderActiveDispatch();
  renderCustomClaimVerifier();
}

function handleProbeActivate(probeKey) {
  const currentDispatch = DISPATCHES[gameState.currentIndex];
  gameState = inspectProbe(gameState, currentDispatch.id, probeKey);
  playMechanicalSound("probe");
  renderAll();
}

function handleStampSubmit(stampType) {
  const currentDispatch = DISPATCHES[gameState.currentIndex];
  gameState = submitDispatchStamp(gameState, currentDispatch.id, stampType);
  const dec = gameState.decisionsByDispatch[currentDispatch.id];
  playMechanicalSound(dec && dec.isCorrect ? "stamp-correct" : "stamp-wrong");
  renderAll();
}

function handleNextDispatch() {
  gameState = advanceToNextDispatch(gameState);
  playMechanicalSound("probe");
  renderAll();
}

function initSourceDeskApp() {
  if (Object.is(typeof document, "undefined")) {
    return;
  }

  renderAll();

  document.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-dispatch-index]");
    if (tabBtn) {
      const idx = Number(tabBtn.getAttribute("data-dispatch-index"));
      gameState = selectDispatchIndex(gameState, idx);
      playMechanicalSound("probe");
      renderAll();
      return;
    }

    const probeBtn = event.target.closest("[data-probe-key]");
    if (probeBtn) {
      const probeKey = probeBtn.getAttribute("data-probe-key");
      handleProbeActivate(probeKey);
      return;
    }

    const stampBtn = event.target.closest("[data-stamp-type]");
    if (stampBtn) {
      const stampType = stampBtn.getAttribute("data-stamp-type");
      handleStampSubmit(stampType);
      return;
    }

    const modeBtn = event.target.closest("[data-compare-mode]");
    if (modeBtn) {
      archiveComparisonMode = modeBtn.getAttribute("data-compare-mode") || "both";
      document.querySelectorAll("[data-compare-mode]").forEach((b) => {
        const active = Object.is(b.getAttribute("data-compare-mode"), archiveComparisonMode);
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? ATTR_TRUE : ATTR_FALSE);
      });
      renderActiveDispatch();
      return;
    }

    if (event.target.closest("#btn-next-dispatch")) {
      handleNextDispatch();
      return;
    }

    if (event.target.closest("#btn-reset-desk")) {
      gameState = createInitialGameState();
      renderAll();
      return;
    }

    if (event.target.closest("#btn-toggle-audio")) {
      gameState = toggleAudioMute(gameState);
      renderTopTelemetry();
      return;
    }

    if (event.target.closest("#btn-print-guide")) {
      window.print();
    }
  });

  document.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-custom-signal]");
    if (checkbox) {
      const sigId = checkbox.getAttribute("data-custom-signal");
      if (checkbox.checked) {
        activeCustomSignals.add(sigId);
      } else {
        activeCustomSignals.delete(sigId);
      }
      renderCustomClaimVerifier();
    }
  });

  const customInput = document.getElementById("custom-claim-input");
  if (customInput) {
    customInput.addEventListener("input", () => {
      renderCustomClaimVerifier();
    });
  }

  document.addEventListener("keydown", (event) => {
    const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
    const isInput = Object.is(tag, "input") || Object.is(tag, "textarea") || Object.is(tag, "select");
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const resolved = resolveKeyboardShortcut(event.key, isInput);
    if (!resolved) {
      return;
    }
    event.preventDefault();
    if (Object.is(resolved.action, "probe")) {
      handleProbeActivate(resolved.probeKey);
    } else if (Object.is(resolved.action, "stamp")) {
      handleStampSubmit(resolved.stampType);
    } else if (Object.is(resolved.action, "next")) {
      handleNextDispatch();
    }
  });
}

if (!Object.is(typeof document, "undefined")) {
  if (Object.is(document.readyState, "loading")) {
    document.addEventListener("DOMContentLoaded", initSourceDeskApp);
  } else {
    initSourceDeskApp();
  }
}
