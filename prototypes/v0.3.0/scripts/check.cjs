'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
function crawl(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const p = path.join(folder, entry.name);
    if (entry.isDirectory()) crawl(p);
    else if (/[.](?:js|cjs)$/.test(entry.name)) {
      execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
      process.stdout.write(`OK ${path.relative(process.cwd(), p)}\n`);
    }
  }
}
crawl(path.resolve(__dirname,'../src'));
crawl(path.resolve(__dirname,'../media'));
