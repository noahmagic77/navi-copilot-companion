#!/usr/bin/env python3
"""Build a standalone offline HTML viewer from verified local SVG diagrams."""
from pathlib import Path
import base64
import html
root=Path(__file__).resolve().parent.parent
diag=root/'docs'/'diagrams'
chapters=[
  ('architecture','01 · Komponentenarchitektur','Die Schnittstellen und Schichten des installierten NAVI MVP.'),
  ('flow','02 · Programmablauf','Vom VS-Code-Start bis zum neuen Hinweis, einschließlich OTel-Verarbeitung.'),
  ('classes','03 · Klassenübersicht','Implementierte Klassen und ihre Abhängigkeiten.'),
  ('data-model','04 · Datenbankmodell','Geplantes relationales Schema für SQLite ab v0.3, aktuell JSON.'),
  ('storage','05 · VSIX und Persistenz','Abgrenzung von Installationspaket, VS Code Storage und Workspace-Hooks.'),
]
nav=''.join(f'<a href="#{slug}">{html.escape(title)}</a>' for slug,title,_ in chapters)
sections=[]
for slug,title,descr in chapters:
    source=(diag/f'{slug}.svg').read_bytes()
    uri='data:image/svg+xml;base64,'+base64.b64encode(source).decode('ascii')
    sections.append(f'<section class="diagram" id="{slug}"><div class="heading"><h2>{html.escape(title)}</h2><p>{html.escape(descr)}</p></div><img alt="{html.escape(title)}" src="{uri}"><p class="foot">Editierbare Mermaid-Quelle und Graphviz-SVG im NAVI-Quellpaket unter <code>docs/diagrams/</code></p></section>')
page=f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NAVI · Architekturübersicht</title><style>
:root{{--bg:#07101e;--surface:#0e1d31;--border:#294764;--text:#e9f5ff;--muted:#a1bad0;--accent:#67d9ee}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}}
header{{padding:48px 5vw 28px;border-bottom:1px solid var(--border);background:radial-gradient(ellipse at right top,#153b59,transparent 60%)}}
header .eyebrow{{color:var(--accent);font-size:11px;letter-spacing:.25em;font-weight:700}}h1{{font-size:clamp(34px,5vw,70px);line-height:1.05;letter-spacing:-.06em;margin:10px 0}}header p{{color:var(--muted);max-width:760px}}.layout{{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px;max-width:1650px;padding:30px 4vw;margin:auto}}
nav{{position:sticky;top:20px;height:max-content;border:1px solid var(--border);border-radius:14px;padding:14px;background:var(--surface)}}nav b{{font-size:12px;color:var(--accent);letter-spacing:.08em;padding:10px;display:block}}nav a{{display:block;padding:11px 10px;color:var(--muted);text-decoration:none;border-radius:9px}}nav a:hover{{background:#183b57;color:#fff}}
main{{min-width:0}}section.diagram{{border:1px solid var(--border);background:#0b1728;border-radius:18px;overflow:hidden;margin-bottom:22px;scroll-margin-top:20px}}
.heading{{padding:25px 28px 8px}}.heading h2{{font-size:22px;letter-spacing:-.02em;margin:0}}.heading p{{color:var(--muted);margin:6px 0}}section img{{max-width:100%;display:block;margin:4px auto;background:#091120;width:auto;max-height:1050px}}
.foot{{padding:10px 28px 25px;color:var(--muted);font-size:12px}}footer{{padding:18px 5vw 55px;color:var(--muted);font-size:12px}}code{{color:#bbe7ff}}
@media(max-width:850px){{.layout{{grid-template-columns:1fr}}nav{{position:static}}nav a{{display:inline-block}}.heading{{padding:18px}}}}
</style></head><body><header><div class="eyebrow">NAVI / ARCHITECTURE PACKAGE</div><h1>Inside NAVI.</h1><p>Technische Gesamtübersicht v0.2.0: UI, Core, Datenbank, Programmablauf und VSIX-Speicherung. Stand: 16. Oktober 2026. Eigenständige Offline-Ansicht, keine externen Ressourcen.</p></header><div class="layout"><nav><b>DIAGRAMME</b>{nav}</nav><main>{''.join(sections)}</main></div><footer>NAVI Companion · Zielschema SQLite ist noch nicht Teil der Runtime · Automatisierte Tests ersetzen keinen echten Copilot-End-to-End-Test.</footer></body></html>'''
out=root/'docs'/'architecture-overview.html'
out.write_text(page,encoding='utf8')
(root.parent/'NAVI-Architecture-Overview.html').write_text(page,encoding='utf8')
print('Wrote',out,round(out.stat().st_size/1024),'KiB')
