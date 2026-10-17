# Changelog

## 0.5.1 — 2026-10-17

- Expand the shared Webview/Windows fairy catalogue to 110 procedural animations, including ten additional greetings and a categorized preview.
- Randomly shuffle greetings with no repeats until the ten-item bag is exhausted, and no immediate repeat between bags. Startup, window return and editor-tab changes share a 15-second cooldown; reopening the companion view also has a cooldown.
- Add DPI-aware native mouse perception, bounded avoidance and smooth settling without screenshots or pointer history storage.
- Add explicit flight to five window positions, cancellation, mouse priority and replanning after avoidance or resize. Editor-line targeting is still future work.
- Preserve animation pause, reduced-motion preferences, foreground visibility and click-through behavior.
- Extend motion parity, transition, navigation, greeting and perception tests. The earlier mouse-avoidance build was live-tested by the project owner; the expanded animation catalogue and greeting triggers still require live visual validation.

Experimental Windows x64 overlay and cross-platform embedded companion. Distributed as a GitHub VSIX download; no VS Code Marketplace publication.
