// scripts/check-scss.mjs — compile every public board SCSS module.
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'app/(new-layout)/games-v2/[game]';
const EXCLUDED_DIRS = new Set(['manage', 'setup']);

function findScssModules(dir, results = []) {
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry);
        const stats = statSync(full);
        if (stats.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry)) continue;
            findScssModules(full, results);
        } else if (entry.endsWith('.module.scss')) {
            results.push(full);
        }
    }
    return results;
}

const files = findScssModules(ROOT);
let failed = 0;
for (const f of files) {
    try {
        execFileSync(
            'npx',
            ['sass', '--no-source-map', '--style=compressed', f, '/dev/null'],
            { stdio: 'pipe' },
        );
    } catch (e) {
        failed++;
        console.error(`FAIL ${f}\n${e.stderr}`);
    }
}
console.log(`${files.length - failed}/${files.length} compiled`);
process.exit(failed ? 1 : 0);
