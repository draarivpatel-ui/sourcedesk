# SourceDesk Editorial Design System

## Visual Direction: Mid-Century Swiss Editorial Newsroom

SourceDesk rejects generic dark-neon cyber dashboards and SaaS card grids in favor of a tactile, daylight-first archival print verification desk. The visual hierarchy draws from 1960s Swiss typographic grids and investigative fact-checking ledgers.

## Color Tokens

- **Archival Cotton Paper (`#F6F3EC`):** Primary canvas background, calibrated for extended reading comfort without harsh white glare.
- **Elevated Desk Card (`#EFECE3`):** Dossier surfaces, wire queue containers, and instrument modules.
- **Carbon Ink (`#121619`):** High-contrast primary typography and structural rules (`1px` and `1.5px` ink borders).
- **Slate-Sepia Secondary (`#374047`):** Supporting body copy and metadata (contrast ratio exceeds `8.2:1` on archival paper).
- **Verified Emerald (`#0F766E` / Surface `#E2F2EF`):** Authentic primary-source concordance and `VERIFIED BULLETIN` stamps.
- **Context Amber (`#B45309` / Surface `#F9EBDC`):** Recycled media, truncated chart axes, unblinded small-sample studies, and `MISLEADING CONTEXT` stamps.
- **Vermilion Stamp (`#D9381E` / Surface `#FCE8E4`):** Typosquatted phishing domains, synthetic voice clones, and `FABRICATED / IMPOSTER` stamps.

## Typography

- **Display Headlines:** `Instrument Serif` (balanced wrapping, tight editorial leading `1.06` to `1.12`).
- **UI Controls & Dispatch Copy:** `Space Grotesk` (65ch-70ch measure, clear weight steps).
- **Telemetry & Forensics:** `JetBrains Mono` with `font-variant-numeric: tabular-nums` enforced on all counters, WHOIS ages, axis baselines, spectral frequencies, and scores.

## Craft & Accessibility Standards

- **Zero Kicker/Eyebrow Labels:** Headings carry their own structural weight without uppercase labels stacked above them.
- **Custom Browser Surfaces:** Custom `::selection` in vermilion and paper, custom scrollbars, visible `2px` `:focus-visible` outlines, and full keyboard navigation (`1-4`, `V`, `M`, `F`, `N`).
- **Reduced Motion & Print Ready:** Respects `@media (prefers-reduced-motion: reduce)` and includes a `@media print` 1-page Lateral Reading Field Guide layout.
