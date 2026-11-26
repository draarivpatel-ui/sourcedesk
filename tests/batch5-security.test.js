import test from "node:test";
import assert from "node:assert/strict";
import "../js/calibration-lab.js";
import * as engine from "../js/sourcedesk-engine.js";

test("batch5 csv formula hardening", () => {
  const csv = globalThis.SDLab.csvTextCell;

const payloads = ["\u200b=cmd", "\u061c+cmd", " \u200b@cmd", "\ufeff=cmd"];
for (const payload of payloads) {
  const cell = csv(payload);
  assert.ok(cell.startsWith("'") || cell.startsWith("\"'"), payload + " stayed live");
}
assert.equal(csv(-12.5), "-12.5");
assert.equal(csv("plain"), "plain");

  const lab = globalThis.SDLab.createLab(engine);
  const body = { x: 1 };
  const digest = globalThis.SDLab.sha256Hex(globalThis.SDLab.canonicalJson(body));
  const intact = JSON.stringify({ x: 1, integrity: { algorithm: "SHA-256", canonicalJsonSha256: digest } });
  const evil = intact.slice(0, -1) + ",\"__proto__\":{\"polluted\":true}}";
  assert.equal(lab.verifyBrief(evil).valid, false);
});
