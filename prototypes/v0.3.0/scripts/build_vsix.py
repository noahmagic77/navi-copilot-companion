#!/usr/bin/env python3
"""Dependency-free VSIX build for the NAVI proof of concept.

Mimics the OPC zip format and VSIX manifest emitted by vsce.
"""
from pathlib import Path
import os
import json
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
INFO = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
OUTPUT_DIR = Path(os.environ.get("NAVI_VSIX_OUTPUT_DIR", str(ROOT.parent))).resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DEST = OUTPUT_DIR / f"navi-{INFO['version']}.vsix"
FILES = [
    'package.json', 'README.md', 'LICENSE',
    'src/extension.js', 'src/analyze.cjs', 'src/observer.cjs',
    *[str(p.relative_to(ROOT)) for folder in ('src/core','src/storage','src/integrations','src/ui') for p in sorted((ROOT / folder).glob('*.cjs'))],
    'media/index.html', 'media/style.css', 'media/ui.js', 'media/icon.svg',
    *[str(p.relative_to(ROOT)) for p in sorted((ROOT / 'docs').rglob('*')) if p.is_file() and p.suffix in ('.md','.mmd','.sql','.json','.html','.svg')],
    'src/types/contracts.d.ts',
]

manifest = f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Id="{INFO['name']}" Version="{INFO['version']}" Language="en-US" Publisher="{INFO['publisher']}" />
    <DisplayName>NAVI - Copilot Efficiency Companion</DisplayName>
    <Description xml:space="preserve">Local VS Code Companion for GitHub Copilot with optional hook signals and OpenTelemetry, demo and prompt checks.</Description>
    <Categories>Other</Categories>
    <Tags>copilot,efficiency,tokens,offline</Tags>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" Version="[1.100.0,)" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" />
  </Assets>
</PackageManifest>
'''
contents = '''<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="cjs" ContentType="application/javascript" />
  <Default Extension="html" ContentType="text/html" />
  <Default Extension="css" ContentType="text/css" />
  <Default Extension="svg" ContentType="image/svg+xml" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="mmd" ContentType="text/plain" />
  <Default Extension="sql" ContentType="text/plain" />
  <Default Extension="ts" ContentType="text/plain" />
  <Default Extension="txt" ContentType="text/plain" />
  <Override PartName="/extension/README.md" ContentType="text/markdown" />
</Types>
'''
ET.fromstring(manifest)
ET.fromstring(contents)
with zipfile.ZipFile(DEST, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.writestr('extension.vsixmanifest', manifest)
    z.writestr('[Content_Types].xml', contents)
    for filename in FILES:
        path = ROOT / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        z.write(path, f'extension/{filename}')
with zipfile.ZipFile(DEST) as z:
    assert z.testzip() is None
    assert 'extension/package.json' in z.namelist()
    assert 'extension.vsixmanifest' in z.namelist()
print(f'Created {DEST} ({DEST.stat().st_size:,} bytes)')
