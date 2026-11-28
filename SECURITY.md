# Security policy

## Reporting a vulnerability

Use the private GitHub Security Advisory form at [Report a vulnerability](https://github.com/draarivpatel-ui/sourcedesk/security/advisories/new). Do not open a public issue, pull request or discussion with exploit details.

Never include a live secret, token, cookie, private key, victim hostname or proprietary payload in a report. Use synthetic values and redacted transcripts.

## Supported versions

| Version | Status |
| --- | --- |
| latest `main` | Supported |

Security fixes are applied to the latest state of the default branch.

## Scope

This policy covers the static SourceDesk browser game, including the lateral-reading instruments, the custom claim and headline verifier lab, the calibration and scoring lab, the SHA-256 desk brief exporter, the `#sd=` URL-hash bookmark codec, the in-page self-test runner, local persistence and browser rendering.

In scope:

- A cross-site scripting or HTML injection path through claim text, dispatch content, share links, imported text or report output.
- A share-link decoder or serialization flaw that bypasses validation, corrupts game state, or executes attacker-controlled code.
- A report export or spreadsheet escaping flaw that makes generated output execute a formula or script when opened.
- A digest or tamper-verification flaw that misrepresents the integrity of an exported desk brief.

Out of scope:

- Browser vulnerabilities, operating system compromise or physical access to the machine.
- Damage caused by modified copies of the static application that do not come from this repository.
- The educational accuracy of the media-literacy content, unless a report shows a specific validation or output integrity failure.

## Coordinated disclosure

- Acknowledgment: within 3 business days.
- Initial triage: within 14 calendar days.
- Fix or mitigation target: within 90 calendar days for confirmed reports.
- Coordinated public disclosure: up to 90 days by default, adjusted by mutual agreement when exploitation or user risk requires a different date.
