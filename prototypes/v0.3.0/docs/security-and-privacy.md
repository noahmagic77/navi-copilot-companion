# NAVI — Sicherheits- und Datenschutzkonzept

## Threat Model (MVP)

| Risiko | Angriffspfad | Maßnahme | Restrisiko |
|---|---|---|---|
| Prompt-Leak | Hook erhält Originalprompt | lokal nur Flags, Kategorie, Wortzahl und Session-Hash persistieren | Hook-Prozess sieht Prompt kurzzeitig |
| Unbefugte Befehle | Webview sendet beliebige Kommandos | Allowliste, CSP, Sandbox des Webview | fehlerhafte VS-Code-API oder Erweiterung |
| XSS | KI-Text gelangt in UI | `textContent` statt `innerHTML`, Nonce-CSP | externe UI-Skripte vermeiden |
| Repository-Execution | `.github/hooks/*.cjs` ist ausführbarer Code | explizite Zustimmung, Trust-Check, Prüfsummen beim Uninstall | Script kann später bearbeitet werden |
| Ungewollter OTel-Upload | Env vars / Unternehmen exportieren zu Netzwerkendpoint | NAVI setzt `exporterType=file`, `captureContent=false`; dokumentiert Overrides | höhere Konfigurationsebene kann gewinnen |
| Overcollection | OTel-Exporter schreibt weitere Metadaten | keine Kopie der Raw-Traces in NAVI-DB; lokale Datenlöschung | Log enthält evtl. Repo-Attribute |
| Session-Reidentifikation | Kürzerer SHA-256-Hash | kein Klartext; nur lokal | Hash ist pseudonym, nicht anonym |
| Falsche Warnung | Heuristik versteht Kontext falsch | Hinweis als Vorschlag, kein Blockieren; Drosselung | Produktivitätseinbußen bei Überwarnung |
| Speicherfüllung | unbeschränkte JSONL-Datei | Snapshot begrenzt, Hook-Protokoll gedeckelt | OTel-Datei kann wachsen |
| Verlust anderer Hooks | Install-/Uninstall überschreibt Dateien | `wx`, SHA-256-Manifest, Entfernen nur bei unverändertem Inhalt | manuelle Bereinigung bei Konflikten |

## Vertrauensgrenzen

1. **Webview ↔ Extension Host:** UI-Nachrichten werden grundsätzlich als untrusted behandelt.
2. **Copilot Harness ↔ Hook-Prozess:** Eingaben können sehr groß sein und sensible Daten enthalten. Kein Logging der Payload.
3. **Observer ↔ JSONL-Datei:** Schreiben mit eingeschränkten Dateirechten (soweit OS erlaubt), keine Netzwerknutzung.
4. **Copilot OTel ↔ NAVI Reader:** Fremdproduzierte Telemetrie ist untrusted. Attribute werden validiert.
5. **Workspace ↔ ausführbarer Hook:** Workspace Trust und Code-Review erforderlich, auch wenn NAVI selbst installiert ist.
6. **Unternehmensrichtlinien:** Managed Settings gelten; NAVI versucht nicht, diese zu umgehen.

## Datenschutzvorgaben für weitere Features

- Kein „Prompt Recording“ ohne gesonderte, granulare, transparente Einwilligung.
- Keine Hintergrundübertragung an einen Analyse-Server.
- Keine unklaren „gesparten Tokens“ ohne sauberen, replizierbaren Vergleich.
- Keine aggressiven modalen Popup-Warnungen während des Programmierens.
- Kein ungefragtes Löschen oder Umschreiben fremder Copilot-Konfiguration.
- Nutzer muss lokale Daten jederzeit löschen können.

## Authentifizierung

NAVI benötigt für seine eigene Analyse keine Anmeldedaten. Copilot authentifiziert sich unabhängig davon über die offiziellen GitHub-/VS-Code-Flows. NAVI speichert keine Zugangstokens.

## Sicherheitslücken und Grenzen des MVP

- Hook-Dateien werden im Repository abgelegt und können versehentlich committed werden. Empfehlung: Bei lokalen Experimenten diese Dateien in `.git/info/exclude` ausschließen oder im Team bewusst versionieren.
- Remote-SSH, WSL, Dev Containers und Multi-Root werden derzeit für die automatische Hook-Installation nicht als vollständig unterstützt beworben.
- Manuell gebaute VSIX benötigt zusätzliche Zielsystem- und ggf. Signaturprüfung vor Unternehmensverteilung.
- Der Testkatalog ersetzt kein unabhängiges Security Review, keine SAST/DAST-Prüfung und keinen Penetrationstest.
