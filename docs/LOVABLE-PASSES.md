# Lovable design passes

Status: archived draft prompts, not submitted. The connected app is implemented locally. Do not apply the old localStorage/photo instructions below to the current backend-connected app; the connected-app specification supersedes them. Record actual project URL and observed results after each pass. Do not describe prepared prompts as completed iterations.

## Pass 1: composition and complete demo
Build LeakLens, a Water Quality student competition prototype, as one React application with a public website, utility operations dashboard and mobile-friendly field crew app. This is NOT a generic water conservation dashboard. It links contamination-intrusion susceptibility at leaking pipes with sustained low-pressure events and human-approved response.

Use an original engineering-editorial visual language: warm paper #F5F3EC, ink #122A38, water blue #176B91, subtle fine-line grids and restrained amber/red for operational status. Distinctive serif editorial headlines paired with a crisp sans-serif interface and tabular telemetry numerals. Asymmetrical layouts and strong negative space on the website, practical data density inside the app. No purple gradients, glassmorphism, pill-heavy cards, fake logos/testimonials or meaningless metrics. Build original SVG schematics showing the same cracked pipe under normal internal pressure versus an inward gradient during a pressure-loss scenario. The schematic is explanatory, not a validated hydraulic simulation.

Website: headline 'Clean at the plant. Protected to the tap.'; clear Water Quality positioning; annotated pipe schematic; risk -> pressure event -> operator response narrative; evidence and limitations; pilot plan; working 'Explore the demo' link. Do not invent health outcomes, customers, costs or measured performance.

App: fictional California-style network map, risk-ranked segment list, explainable weighted risk breakdown, pressure chart with 20 psi line, active incident timeline and visible 'SIMULATED DATA' label. At exactly 20 psi do not trigger a below-20 event. Missing/stale readings must not look normal. Provide deterministic 'Run main-break scenario' and reset controls. No live connections required.

Response: editable advisory draft and sampling plan; explicit operator approval before simulated notice and crew assignment; mobile crew checklist for repair/flushing, photo attachment and sample IDs/results. A failed sample resets the consecutive-clear streak and requires flushing/resampling. Two consecutive clear samples make the demo eligible for operator-approved clearance, never automatic clearance. State that this is a configurable demo rule requiring California regulator validation, not compliance certification. Never send real messages or control equipment. Role switching is demo navigation, not secure authentication.

Use a small testable event reducer, reject duplicate sample IDs/out-of-order actions, preserve versioned local state and recover safely from corrupt storage. Include keyboard focus and reduced-motion support. All CTAs must work. Avoid external maps/fonts being required for the demo to remain usable. Build routes for website, operations and crew, with direct-link reload support.

## Pass 2: art-direction critique
Use after inspecting pass 1. Identify specific observed issues before submitting; do not blindly claim defects exist.

Review the current LeakLens screens as an experienced editorial/industrial interface designer. Keep all working behavior. Remove generic template patterns and focus on original composition, consistent alignment, intentional typography and meaningful water-system diagrams. Ensure the website feels like a serious technical project with a point of view, while the app feels like an actual utility workflow, not a marketing page disguised as a dashboard. Differentiate display typography from operational labels. Give diagrams precise labels, clear flow arrows, a legend and honest caveats. Keep warning colors operationally meaningful. Improve the selected-segment panel and incident hierarchy rather than adding decorative cards. Explain changes made and remaining limitations.

## Pass 3: responsive and interaction polish
Use after inspecting desktop and mobile output. Add concrete observed defects to this brief.

Refine LeakLens at 1440px, 768px and 390px. No unintended horizontal page scroll. Make network information available as an accessible list on mobile. Maintain legible units, pressure threshold labels, status text and touch targets. Keyboard focus must be visible; dialogs must trap and restore focus; all controls must have names; statuses must not depend only on color. Honor reduced motion. Verify stale telemetry, empty incident state, invalid/duplicate sample IDs, failed sample recovery, explicit notice/job approvals and clearance gate. Make reset reproducible and protect against corrupt local state. Preserve simulated-data labels and no-real-messages/no-equipment-control boundaries. Fix broken navigation and direct route reloads. Do not call the result verified merely because code was generated.

## Evidence log
- Access: Lovable login page reached in Chrome on 2026-11-19 Pacific. Authentication not yet confirmed.
- Pass 1: not submitted.
- Pass 2: not submitted.
- Pass 3: not submitted.
- Code export/local integration: not started.

### Connected app delivery update (2026-11-19 Pacific)
- Desktop Lovable was found signed in earlier. Current background Accessibility inspection exposed only nested groups; deeper inspection timed out after 20 seconds. No reliable background prompt submission was available.
- No repeated Lovable generation/refinement is claimed. We did not steal focus or mix prompts with the user’s foreground typing.
- Local implementation completed instead. Actual production screenshots were inspected, an interactive normal-pressure/pressure-loss schematic was added, and desktop/mobile browser acceptance was run. See `FRONTEND-VERIFICATION.md`.
