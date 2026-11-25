/**
 * SourceDesk Calibration & Scoring Lab UI Controller
 * Renders the strategy comparator, probe-payoff heatmap, claim stress presets,
 * audited export bar, and in-page self-test runner. Depends on the classic
 * script js/calibration-lab.js (global SDLab); if it is absent the lab section
 * hides itself gracefully. All dynamic text is written via textContent.
 */

import * as engine from "./sourcedesk-engine.js";

(function initCalibrationLab() {
  if (typeof document === "undefined") {
    return;
  }
  const section = document.getElementById("calibration-lab");
  if (!section) {
    return;
  }
  const SDLab = typeof globalThis !== "undefined" ? globalThis.SDLab : undefined;
  if (!SDLab || typeof SDLab.createLab !== "function") {
    section.hidden = true;
    return;
  }

  const lab = SDLab.createLab(engine);
  const ATTR_TRUE = "true";
  const ATTR_FALSE = "false";

  // Live view state mirrored into the #sd= bookmark hash.
  const labState = { ed: null, dp: null, pm: null, cp: null };
  // Latest desk game state, broadcast by app.js as "sourcedesk:game-state".
  let latestGameState = engine.createInitialGameState();
  let latestBrief = null;

  const $ = (id) => document.getElementById(id);

  function syncHash() {
    const hash = lab.encodeBookmark(labState);
    if (window.location.hash !== hash) {
      try {
        history.replaceState(null, "", window.location.pathname + window.location.search + hash);
      } catch (err) {
        window.location.hash = hash;
      }
    }
  }

  /* ---------------- Editor Strategy Comparator ---------------- */

  const strategyRuns = lab.compareStrategies();
  const strategyRunById = new Map(strategyRuns.map((r) => [r.strategyId, r]));

  function renderStrategyTable() {
    const body = $("strategy-table-body");
    if (!body) {
      return;
    }
    body.innerHTML = "";
    for (const run of strategyRuns) {
      const tr = document.createElement("tr");
      tr.className = "strategy-row";
      tr.dataset.strategyId = run.strategyId;
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.setAttribute(
        "aria-pressed",
        labState.ed === run.strategyId ? ATTR_TRUE : ATTR_FALSE
      );
      if (labState.ed === run.strategyId) {
        tr.classList.add("is-active-strategy");
      }

      const cells = [
        `${run.name}`,
        `${run.avgProbesPerDispatch}`,
        `${run.totalScore} / ${run.dispatchCount * 100}`,
        `${run.accuracyPercent}%`,
        run.blindPenaltyCount > 0 ? `-${run.blindPenaltyPoints} (${run.blindPenaltyCount} stamps)` : "0",
        `+${run.efficiencyBonusTotal}`,
        run.streakTrajectory.join(" > "),
      ];
      cells.forEach((text, idx) => {
        const td = document.createElement("td");
        td.textContent = text;
        if (idx === 0) {
          td.className = "strategy-name-cell";
          const note = document.createElement("span");
          note.className = "strategy-note";
          note.textContent = run.deskNote;
          td.appendChild(document.createElement("br"));
          td.appendChild(note);
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    }
  }

  function selectStrategy(id, opts) {
    const silent = opts && opts.silent;
    if (!strategyRunById.has(id)) {
      return;
    }
    labState.ed = id;
    document.querySelectorAll(".strategy-row").forEach((row) => {
      const active = row.dataset.strategyId === id;
      row.classList.toggle("is-active-strategy", active);
      row.setAttribute("aria-pressed", active ? ATTR_TRUE : ATTR_FALSE);
    });
    const run = strategyRunById.get(id);
    const line = $("strategy-detail-line");
    if (line) {
      line.textContent =
        `${run.name}: ${run.totalScore} points, ${run.accuracyPercent}% accuracy, ` +
        `${run.avgProbesPerDispatch} probes per dispatch, ${run.blindPenaltyPoints} penalty points, ` +
        `+${run.efficiencyBonusTotal} efficiency bonus. ${run.deskNote}`;
    }
    if (!silent) {
      syncHash();
    }
  }

  /* ---------------- 6x16 Probe-Payoff Heatmap ---------------- */

  const matrix = lab.payoffMatrix();
  const CELL = 30;
  const GAP = 4;
  const LABEL_W = 64;
  const TOP_H = 22;
  const COLS = 16;

  function cellFill(score) {
    const hue = 8 + (168 - 8) * (score / 100);
    return `hsl(${hue.toFixed(0)} 62% 60%)`;
  }

  function renderHeatmap() {
    const holder = $("payoff-heatmap-holder");
    if (!holder) {
      return;
    }
    const width = LABEL_W + COLS * (CELL + GAP);
    const height = TOP_H + matrix.rows.length * (CELL + GAP) + 20;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "payoff-heatmap");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", "Probe-subset payoff matrix: 6 dispatches by 16 probe subsets");

    for (let m = 0; m < COLS; m += 1) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", String(LABEL_W + m * (CELL + GAP) + CELL / 2));
      t.setAttribute("y", "14");
      t.setAttribute("class", "hm-col-label");
      t.setAttribute("text-anchor", "middle");
      t.textContent = String(m);
      svg.appendChild(t);
    }

    matrix.rows.forEach((row, r) => {
      const y = TOP_H + r * (CELL + GAP);
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", "0");
      label.setAttribute("y", String(y + CELL / 2 + 4));
      label.setAttribute("class", "hm-row-label");
      label.textContent = `SD-0${r + 1}`;
      svg.appendChild(label);

      row.cells.forEach((cell, m) => {
        const g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "hm-cell");
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.dataset.dispatchIdx = String(r);
        g.dataset.mask = String(m);
        g.setAttribute(
          "aria-label",
          `${row.code} subset mask ${m}: ${cell.probeCount} probes, score ${cell.roundScore}`
        );
        g.setAttribute("aria-pressed", ATTR_FALSE);

        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", String(LABEL_W + m * (CELL + GAP)));
        rect.setAttribute("y", String(y));
        rect.setAttribute("width", String(CELL));
        rect.setAttribute("height", String(CELL));
        rect.setAttribute("rx", "3");
        rect.setAttribute("fill", cellFill(cell.roundScore));
        if (m === row.optimalMask) {
          rect.setAttribute("class", "hm-cell-rect is-optimal");
        } else {
          rect.setAttribute("class", "hm-cell-rect");
        }
        g.appendChild(rect);

        const tx = document.createElementNS(svgNS, "text");
        tx.setAttribute("x", String(LABEL_W + m * (CELL + GAP) + CELL / 2));
        tx.setAttribute("y", String(y + CELL / 2 + 4));
        tx.setAttribute("class", "hm-cell-num");
        tx.setAttribute("text-anchor", "middle");
        tx.textContent = String(cell.probeCount);
        g.appendChild(tx);
        svg.appendChild(g);
      });
    });

    const legend = document.createElementNS(svgNS, "text");
    legend.setAttribute("x", "0");
    legend.setAttribute("y", String(height - 4));
    legend.setAttribute("class", "hm-legend");
    legend.textContent = "Rows: 6 dispatches | Columns: probe-subset mask 0-15 | Cell number: probes inspected | Bold border: optimal key pair";
    svg.appendChild(legend);

    const mobile = document.createElement("div");
    mobile.setAttribute("class", "hm-mobile-matrix");
    matrix.rows.forEach((row, r) => {
      const group = document.createElement("div");
      group.setAttribute("class", "hm-mobile-row");
      const title = document.createElement("div");
      title.setAttribute("class", "hm-mobile-row-title");
      title.textContent = `${row.code} probe-subset masks`;
      group.appendChild(title);
      const grid = document.createElement("div");
      grid.setAttribute("class", "hm-mobile-cells");
      row.cells.forEach((cell, m) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("class", "hm-mobile-cell");
        if (m === row.optimalMask) {
          btn.classList.add("is-optimal");
        }
        btn.dataset.dispatchIdx = String(r);
        btn.dataset.mask = String(m);
        btn.setAttribute(
          "aria-label",
          `${row.code} subset mask ${m}: ${cell.probeCount} probes, score ${cell.roundScore}`
        );
        btn.setAttribute("aria-pressed", ATTR_FALSE);
        btn.style.backgroundColor = cellFill(cell.roundScore);
        const maskText = document.createElement("span");
        maskText.setAttribute("class", "hm-mobile-mask");
        maskText.textContent = `mask ${m}`;
        const probeText = document.createElement("span");
        probeText.setAttribute("class", "hm-mobile-probes");
        probeText.textContent = `${cell.probeCount} probes | ${cell.roundScore}`;
        btn.appendChild(maskText);
        btn.appendChild(probeText);
        grid.appendChild(btn);
      });
      group.appendChild(grid);
      mobile.appendChild(group);
    });

    holder.innerHTML = "";
    holder.appendChild(svg);
    holder.appendChild(mobile);
  }

  function selectCell(dispatchIdx, mask, opts) {
    const silent = opts && opts.silent;
    const row = matrix.rows[dispatchIdx];
    if (!row) {
      return;
    }
    const cell = row.cells[mask];
    if (!cell) {
      return;
    }
    labState.dp = dispatchIdx;
    labState.pm = mask;
    document.querySelectorAll(".hm-cell, .hm-mobile-cell").forEach((g) => {
      const match =
        Number(g.dataset.dispatchIdx) === dispatchIdx && Number(g.dataset.mask) === mask;
      g.classList.toggle("is-selected-cell", match);
      g.setAttribute("aria-pressed", match ? ATTR_TRUE : ATTR_FALSE);
    });
    const detail = $("payoff-cell-detail");
    if (detail) {
      const probeList = cell.probeCount > 0 ? cell.probes.join(", ") : "none";
      const keyList = row.keyProbes.join(", ");
      detail.textContent =
        `${row.code} | probes inspected: ${probeList} | key pair: ${keyList} | ` +
        `${cell.accuracyPoints} accuracy + ${cell.evidencePoints} evidence + ${cell.efficiencyBonus} efficiency ` +
        `+ ${cell.streakBonus} streak - ${cell.blindGuessPenalty} blind penalty = ${cell.roundScore} points ` +
        `(${cell.scorePerProbe.toFixed(2)} per probe)`;
    }
    if (!silent) {
      syncHash();
    }
  }

  /* ---------------- Custom Claim Stress Presets ---------------- */

  function renderPresets() {
    const row = $("claim-preset-row");
    if (!row) {
      return;
    }
    row.innerHTML = "";
    for (const preset of lab.claimPresets()) {
      const ev = lab.evaluatePreset(preset.id).evaluation;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-btn";
      btn.dataset.presetId = preset.id;
      btn.setAttribute(
        "aria-pressed",
        labState.cp === preset.id ? ATTR_TRUE : ATTR_FALSE
      );
      if (labState.cp === preset.id) {
        btn.classList.add("is-active-preset");
      }
      const title = document.createElement("span");
      title.className = "preset-btn-title";
      title.textContent = preset.label;
      const chip = document.createElement("span");
      chip.className = "preset-btn-chip";
      chip.textContent = `${ev.riskScore} / 100`;
      const note = document.createElement("span");
      note.className = "preset-btn-note";
      note.textContent = preset.note;
      btn.appendChild(title);
      btn.appendChild(chip);
      btn.appendChild(note);
      row.appendChild(btn);
    }
  }

  function applyPreset(presetId, opts) {
    const silent = opts && opts.silent;
    let preset = null;
    for (const p of lab.claimPresets()) {
      if (p.id === presetId) {
        preset = p;
      }
    }
    if (!preset) {
      return;
    }
    labState.cp = presetId;

    // Load into the Custom Claim Verifier through the same DOM events a human
    // would fire, so app.js owns the verifier state and rendering.
    const input = $("custom-claim-input");
    if (input) {
      input.value = preset.headline;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    document.querySelectorAll("[data-custom-signal]").forEach((cb) => {
      const sigId = cb.getAttribute("data-custom-signal");
      const want = preset.signalIds.indexOf(sigId) !== -1;
      if (cb.checked !== want) {
        cb.checked = want;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    document.querySelectorAll(".preset-btn").forEach((b) => {
      const active = b.dataset.presetId === presetId;
      b.classList.toggle("is-active-preset", active);
      b.setAttribute("aria-pressed", active ? ATTR_TRUE : ATTR_FALSE);
    });
    if (!silent) {
      syncHash();
    }
  }

  /* ---------------- Audited Export Bar ---------------- */

  function refreshBrief() {
    latestBrief = lab.briefForState(latestGameState);
    const line = $("brief-digest-line");
    if (line) {
      const t = latestBrief.payload.deskTotals;
      line.textContent =
        `SHA-256 ${latestBrief.sha256} | ${t.completedCount} decisions, ` +
        `${t.totalScore} points, ${t.accuracyPercent}% accuracy`;
    }
  }

  function downloadText(name, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      return false;
    }
  }

  function setExportStatus(text) {
    const el = $("export-status-line");
    if (el) {
      el.textContent = text;
    }
  }

  function handleExport(format) {
    if (!latestBrief) {
      refreshBrief();
    }
    const b = latestBrief;
    if (format === "json") {
      setExportStatus(downloadText("sourcedesk-desk-brief.json", b.json, "application/json")
        ? `JSON brief exported, digest ${b.sha256.slice(0, 16)}...`
        : "Export blocked by the browser");
    } else if (format === "csv") {
      setExportStatus(downloadText("sourcedesk-desk-brief.csv", b.csv, "text/csv")
        ? `CSV brief exported, digest ${b.sha256.slice(0, 16)}... in provenance header`
        : "Export blocked by the browser");
    } else if (format === "md") {
      setExportStatus(downloadText("sourcedesk-desk-brief.md", b.markdown, "text/markdown")
        ? `Markdown brief exported, digest ${b.sha256.slice(0, 16)}... in footer`
        : "Export blocked by the browser");
    }
  }

  function handleCopyLink() {
    const url = window.location.origin + window.location.pathname + lab.encodeBookmark(labState);
    const done = () => setExportStatus(`Share link ready: ${url.slice(0, 80)}`);
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(url).then(done, () => {
        setExportStatus(`Clipboard blocked; copy manually: ${url.slice(0, 80)}`);
      });
    } else {
      setExportStatus(`Clipboard unavailable; copy manually: ${url.slice(0, 80)}`);
    }
  }

  function handleVerifyDemo() {
    const demo = lab.tamperDemo(latestGameState);
    setExportStatus(
      `INTACT brief verify: ${demo.intactValid ? "PASS" : "FAIL"} | ` +
        `after editing one field verify: ${demo.tamperedValid ? "PASS" : "REJECTED"} | ` +
        `tamper caught: ${demo.tamperCaught ? "yes" : "no"}`
    );
  }

  /* ---------------- Self-Test Runner ---------------- */

  function runSelfTestsUI() {
    const results = lab.runSelfTests();
    const passed = results.filter((r) => r.pass).length;
    const summary = $("selftest-summary");
    if (summary) {
      summary.textContent = `${passed} / ${results.length} deterministic checks passed`;
      summary.classList.toggle("all-pass", passed === results.length);
      summary.classList.toggle("has-fail", passed !== results.length);
    }
    const list = $("selftest-results");
    if (list) {
      list.innerHTML = "";
      for (const r of results) {
        const li = document.createElement("li");
        li.className = `selftest-item ${r.pass ? "is-pass" : "is-fail"}`;
        const name = document.createElement("span");
        name.className = "selftest-name";
        name.textContent = r.name;
        const detail = document.createElement("span");
        detail.className = "selftest-detail";
        detail.textContent = `${r.pass ? "PASS" : "FAIL"}: ${r.detail}`;
        li.appendChild(name);
        li.appendChild(detail);
        list.appendChild(li);
      }
    }
    return results;
  }

  /* ---------------- Bookmark restore ---------------- */

  function restoreFromHash() {
    const decoded = lab.decodeBookmark(window.location.hash);
    if (!decoded) {
      return false;
    }
    if (decoded.ed) {
      selectStrategy(decoded.ed, { silent: true });
    }
    if (decoded.dp !== null && decoded.pm !== null) {
      selectCell(decoded.dp, decoded.pm, { silent: true });
    } else if (decoded.pm !== null) {
      selectCell(0, decoded.pm, { silent: true });
    }
    if (decoded.cp) {
      applyPreset(decoded.cp, { silent: true });
    }
    return true;
  }

  /* ---------------- Wiring ---------------- */

  renderStrategyTable();
  renderHeatmap();
  renderPresets();
  refreshBrief();
  restoreFromHash();

  document.addEventListener("sourcedesk:game-state", (event) => {
    if (event && event.detail && typeof event.detail === "object") {
      latestGameState = event.detail;
      refreshBrief();
    }
  });

  section.addEventListener("click", (event) => {
    const stratRow = event.target.closest(".strategy-row");
    if (stratRow) {
      selectStrategy(stratRow.dataset.strategyId);
      return;
    }
    const hmCell = event.target.closest(".hm-cell");
    if (hmCell) {
      selectCell(Number(hmCell.dataset.dispatchIdx), Number(hmCell.dataset.mask));
      return;
    }
    const hmMobileCell = event.target.closest(".hm-mobile-cell");
    if (hmMobileCell) {
      selectCell(Number(hmMobileCell.dataset.dispatchIdx), Number(hmMobileCell.dataset.mask));
      return;
    }
    const presetBtn = event.target.closest(".preset-btn");
    if (presetBtn) {
      applyPreset(presetBtn.dataset.presetId);
      return;
    }
    if (event.target.closest("#btn-export-json")) {
      handleExport("json");
      return;
    }
    if (event.target.closest("#btn-export-csv")) {
      handleExport("csv");
      return;
    }
    if (event.target.closest("#btn-export-md")) {
      handleExport("md");
      return;
    }
    if (event.target.closest("#btn-copy-share")) {
      handleCopyLink();
      return;
    }
    if (event.target.closest("#btn-verify-brief")) {
      handleVerifyDemo();
      return;
    }
    if (event.target.closest("#btn-run-selftests")) {
      runSelfTestsUI();
    }
  });

  section.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const stratRow = event.target.closest(".strategy-row");
    if (stratRow) {
      event.preventDefault();
      selectStrategy(stratRow.dataset.strategyId);
      return;
    }
    const hmCell = event.target.closest(".hm-cell");
    if (hmCell) {
      event.preventDefault();
      selectCell(Number(hmCell.dataset.dispatchIdx), Number(hmCell.dataset.mask));
    }
  });

  window.addEventListener("hashchange", () => {
    restoreFromHash();
  });
})();
