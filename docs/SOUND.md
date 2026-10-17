# Eigene Feenklänge (v0.5.2-Vorschau)

NAVI hat vier Klangfamilien mit je drei Varianten: Begrüßung, Neugier, Hinweis und Freude. Begrüßungen und Neugier verwenden kurze stilisierte, stimmähnliche Feenlaute; Hinweise und Freude ergänzen helle Tonfolgen. Die Laute sind nicht als verständliche Sprachausgabe gedacht. Sie entstehen durch eigene additive Synthese mit Tonhöhenverläufen, Vokalresonanzen und weichen Hüllkurven. Keine Nintendo-Aufnahmen, Stimmenklone, Cloud-Dienste oder Mikrofonzugriffe.

## Einschalten und ausprobieren

1. **NAVI: Open Companion / Ansicht öffnen** ausführen.
2. **Feenklänge** aufklappen und **Geräusche an** aktivieren.
3. Lautstärke einstellen, Klang wählen und **Anhören** drücken. Der Testton funktioniert auch bei ausgeschalteten automatischen Klängen; bei Lautstärke 0 bleibt er stumm.

Automatische Geräusche sind zunächst aus; die vorbereitete Lautstärke beträgt 30 %. `navi.sound.enabled` und `navi.sound.volume` speichern die Auswahl. Lautstärke 0 ist stumm. Der native Helfer spielt die eingebetteten Klänge auch ohne geöffnete Companion-Ansicht. Ohne laufenden nativen Helfer verwendet die sichtbare Webview die lokalen WAV-Dateien. Meldet die native Audio-API einen Fehler, versucht die sichtbare Companion-Ansicht die Wiedergabe; unter Ausgabe → NAVI Overlay erscheint eine Diagnose. Der Testton **Anhören** startet direkt im Benutzer-Klick über die Webview und benötigt keinen nativen Helfer. Beim Einschalten automatischer Klänge gibt es ebenfalls eine kurze Hörprobe.

Die WAV-Dateien werden auf einen gemeinsamen Spitzenpegel mit Abstand zur Übersteuerung normalisiert. Die Oberfläche zeigt an, ob die Wiedergabe gestartet wurde oder blockiert ist. Falls ein gestarteter Testton nicht hörbar ist: VS-Code-Lautstärke im Windows-Lautstärkemixer und die gewählte Audioausgabe prüfen. Die Browserprüfung bestätigt den Start einer echten WAV-Wiedergabe, kann aber keine physische Hörbarkeit am Zielgerät bestätigen.

Nur tatsächliche NAVI-Ereignisse lösen automatische Klänge aus: eine übermittelte Begrüßung, neugieriges Umsehen in der Ansicht sowie Hinweis-/Freude-Rückmeldungen. Die automatische Flugschleife spielt keine Dauergeräusche. Zwischen automatischen Klängen liegen mindestens 1,5 Sekunden; Varianten derselben Familie wiederholen sich nicht unmittelbar. Ein bewusst angeklickter Testton startet sofort und ersetzt einen vorherigen Testton. Ausblenden oder Fokusverlust stoppt die Wiedergabe des jeweiligen Ausgabekanals; Stummschalten stoppt beide. Klang und Animation haben getrennte Einstellungen.

## Erzeugung und Prüfung

`node scripts/generate-audio.cjs` erzeugt reproduzierbare Mono-WAVs mit 22.050 Hz und 16 Bit. Die Webview-Dateien liegen unter `media/sounds/`; identische native Ressourcen unter `native/overlay/assets/sounds/` werden in die EXE eingebettet. `--check` prüft beide Kopien und läuft automatisch bei Compile/Check/Test.

Tests prüfen Dateiformat, eindeutige Varianten, Lautstärkebegrenzung, weiche Ein-/Ausblendung, deterministische Erzeugung, zulässige Auslöser, Stummschaltung, Fokus/Sichtbarkeit, Abspielsperre und abgefangene Browser-Autoplayfehler. Native Tests ersetzen die Windows-Audioausgabe durch einen Testtreiber und erzeugen keine hörbaren Töne. Eine Hörprobe auf dem Zielrechner bleibt erforderlich.
