# NAVI roadmap

This roadmap separates the current v0.5.1 experimental preview from proposed work. It does not promise release dates.

## Current — v0.5.1 preview
- Added ten greeting variants (110 motions total) for startup, returning window focus, text-editor tab changes and reopening the companion view, with cooldowns and greeting rotation. Automated coverage includes the full expanded motion catalogue; live validation of these new triggers remains pending.
- Expanded source catalogue: 100 selectable procedural animations (12 original states plus 88 variants in eight families), shared browser/native definitions, categorized preview and broader idle variety. Numerical, transition and perception tests cover the expanded catalogue; live visual validation of the new preview remains pending.
- Public repository, VS Code `@navi` participant, NAVI Webview and Windows x64 foreground overlay.
- Local deterministic prompt checker; optional full-text NAVI history; separately opt-in sanitized analytics.
- One-command build/test/package script and Windows helper integrity verification.
- No Marketplace release and no access to other Copilot participants' private chats.
- Live test reported successful by the project owner on 2026-10-17. This records the tested setup, not verification of every supported configuration.

## Next — environment-aware fairy foundation
- Implemented: native pointer/window geometry perception, DPI-aware coordinates, deterministic bounded steering and mouse avoidance. Includes geometry, corner, settling, moving-pointer, allocation and all-twelve-animation interaction tests. The project owner also reported the mouse-avoidance VSIX live test successful on 2026-10-17.
- Implemented in source: explicit window-relative target flight with five selectable positions and cancellation, smooth arrival, pointer priority, waiting for blocked targets, replanning after avoidance/resize and cancellation on hide/focus loss or animation pause. Automated navigation and protocol tests pass; this new target behavior still needs a live check.
- Next: connect user-selected VS Code diagnostics to file opening, range highlighting and an appropriate fairy target. Exact editor screen coordinates need a supported mapping; the initial window positions do not identify code lines.
- Build a deterministic perception model from explicitly available signals: pointer position, foreground window bounds, display scale, fairy position and user-selected targets. Keep geometry-based perception separate from understanding screen contents.
- Model distance, direction, velocity and avoidance zones; use bounded acceleration and smooth steering to approach targets, move aside for the pointer and settle near safe window edges. Handle multiple monitors and DPI changes.
- Start inside the active VS Code window. Desktop-wide movement and awareness of other applications are separate opt-in future scope.
- Add reproducible tests for pointer avoidance, target arrival, coordinate conversion, display boundaries and loss of target/window focus.

## Future — interaction, voice and expression
1. **Environment integration:** use explicit VS Code editor, selection and diagnostic events to choose meaningful targets. Point beside a problem without obscuring code; distinguish known editor locations from estimated screen coordinates. Screenshot/vision-based awareness would require a separate opt-in design and is not part of the initial geometry model.
2. **Voice mode:** add an explicit microphone control, visible listening state and stop/mute controls. Start with commands such as “move aside” and “open file”; resolve ambiguous file names before opening. Choose and disclose local/provider speech processing before implementation.
3. **Chat navigation:** let NAVI move toward a selected diagnostic or referenced location, open the relevant file and reveal the range. Keep navigation tied to user requests and identifiable editor targets.
4. **Sound mode:** optional short cues for attention, hints, success and rest, with volume and mute controls. Treat microphone input, spoken replies and sound effects as separate settings.
5. **Click reaction and colors:** clicking the fairy releases extra sparkles; add selectable night, sun/moon and warm lantern palettes. Preserve reduced-motion behavior. The current overlay passes clicks through, so introduce hit testing limited to the fairy before adding this interaction.
6. **AI output adapters:** show or speak responses from NAVI's own selected-model requests and explicitly shared Codex/GitHub chat output. Investigate supported integration paths separately; do not assume access to private chats or internal APIs. Keep model output separate from executable navigation commands and validate targets.
7. **Original fairy audio:** create short magical chimes inspired by an adventurous fairy atmosphere, using original or appropriately licensed assets rather than copied Zelda recordings.

Suggested sequence: perception and steering → editor targets and chat navigation → click effects and palettes → sound cues → voice → additional AI output adapters. Guided learning remains a planned feature alongside this sequence.

## Planned — guided learning
- Add an explicit learner-controlled mode that starts with questions and hints rather than a full solution.
- Offer graduated help: clarify the goal, ask what the learner tried, give one actionable hint, then explain or reveal a solution only when requested.
- Let users choose the response style and depth. Do not infer or store age; design separately for children and adults without collecting personal profiles.
- Keep Copilot chat boundaries explicit: NAVI only receives `@navi` requests or text the user deliberately submits.
- Use the fairy's listen/think/hint states to reflect real interaction events; do not treat animation as evidence that the model is processing.

## Hardening before wider release
- Preserve the successful live-test result and record the tested VS Code/Windows versions; repeat Extension Development Host and native overlay checks for changed behavior and additional supported configurations.
- Verify settings, reduced-motion opt-in, pause/visibility behavior and VSIX installation from a clean profile.
- Audit dependency vulnerabilities and native helper packaging; review privacy and security claims.
- Measure resource use on target hardware; document remote-host and non-Windows limitations.
- Define data retention, export/deletion behavior and guardian/provider considerations before promoting child-facing use.

These are proposed milestones, not committed dates.
