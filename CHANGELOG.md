# Changelog

## 0.5.3 — 2026-10-17

- Release project code, documentation and project-authored assets under MIT; add contribution guidance and bundled Go third-party notices.
- Add the first local brain state reducer and bounded self-model, observing selected activity and focus without storing message contents or calling another model. Add a state-explanation command and deterministic replay/capability tests.
- Connect NAVI's existing selected-model requests to busy/completed/cancelled/error activity, preserving streamed chat and opt-in history.
- Bundle a dependency-free Codex MCP handoff with authenticated per-window local IPC, configuration command, manual text sharing and bounded status arbitration. No additional model or model API call.
- Add streamed-turn, concurrent-activity and real MCP-to-pipe tests; document client setup and pending live integration validation.
- Replace native system tooltips with a rounded, per-pixel translucent speech bubble and opaque text. Draw the tail toward the moving fairy core, including flipped edge placements.
- Make the companion bubble translucent and continuously aim its tail at the fairy; hide the tail together with the message.
- Refine idle scheduling to wait for quiet periods and avoid interrupting active prompts or important speech bubbles.
- Increase flight and gesture amplitude in normal animations, emphasize preview trajectories further, and strengthen visible light pulses.
- Add native raster checks for transparency, readable text and tail placement, plus browser checks for visible motion distances and core alignment.
- Project owner confirmed that fairy sounds are audible. Full visual validation of these revisions in VS Code remains pending.

## 0.5.2 — 2026-10-17

- Add white and pale-blue speech bubbles matching the fairy, with native click-through placement, timed dismissal and bounded excerpts of NAVI's own chat responses.
- Add twelve original synthesized fairy cues, persistent opt-in and volume controls, and direct sound auditions even while automatic sounds are disabled.
- Normalize cue levels and report native playback failures to the visible Webview fallback. Preserve mute, focus and visibility policies.
- Make individual animation previews loop, emphasize flight, wing and light changes, and show clip progress in the shared 110-animation catalogue.
- Extend browser/native motion parity, speech and sound tests; verify real browser animation and WAV playback. Physical listening and full VS Code foreground/chat validation remain pending.

## 0.5.1 — 2026-10-17

- Expand the shared Webview/Windows fairy catalogue to 110 procedural animations, including ten additional greetings and a categorized preview.
- Randomly shuffle greetings with no repeats until the ten-item bag is exhausted, and no immediate repeat between bags. Startup, window return and editor-tab changes share a 15-second cooldown; reopening the companion view also has a cooldown.
- Add DPI-aware native mouse perception, bounded avoidance and smooth settling without screenshots or pointer history storage.
- Add explicit flight to five window positions, cancellation, mouse priority and replanning after avoidance or resize. Editor-line targeting is still future work.
- Preserve animation pause, reduced-motion preferences, foreground visibility and click-through behavior.
- Extend motion parity, transition, navigation, greeting and perception tests. The earlier mouse-avoidance build was live-tested by the project owner; the expanded animation catalogue and greeting triggers still require live visual validation.

Experimental Windows x64 overlay and cross-platform embedded companion. Distributed as a GitHub VSIX download; no VS Code Marketplace publication.
