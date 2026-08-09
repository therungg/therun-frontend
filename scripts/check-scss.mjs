#!/usr/bin/env node
/**
 * Compile SCSS and report syntax errors — the gap in this repo's checks.
 *
 * `typecheck`, `lint` and `test` all ignore .scss entirely, so a malformed
 * stylesheet (an unmatched brace, a bad @use path) passes every gate and
 * surfaces only when `next dev` / `next build` tries to compile it. This
 * closes that: lint-staged runs it on staged .scss files, and
 * `npm run stylecheck` runs the whole tree in ~2s.
 *
 * Output is discarded — this is a parse/resolve check, not a build step.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as sass from 'sass';

const ROOTS = ['app', 'src'];

/**
 * Fragments that genuinely cannot compile alone — they extend Bootstrap's
 * `$utilities` map and reference `$prefix`, both of which only exist once
 * bootstrap's own variables have been loaded by the importing sheet. Their
 * syntax is still covered: the sheets that import them are checked.
 */
const SKIP = new Set(['app/(new-layout)/styles/bootstrap/_utilities.scss']);

// Mirrors tsconfig's path aliases, which Next's sass loader honours and the
// bare `sass` API does not.
const ALIASES = { '~app/': 'app/', '~src/': 'src/' };

const aliasImporter = {
    findFileUrl(url) {
        for (const [prefix, target] of Object.entries(ALIASES)) {
            if (url.startsWith(prefix)) {
                return pathToFileURL(resolve(target + url.slice(prefix.length)));
            }
        }
        return null;
    },
};

function walk(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (entry.endsWith('.scss')) out.push(full);
    }
    return out;
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args : ROOTS.flatMap((r) => walk(r));

let failed = 0;
for (const file of files) {
    if (SKIP.has(file.replace(/\\/g, '/'))) continue;
    try {
        sass.compile(file, {
            quietDeps: true,
            // '.' resolves the `node_modules/bootstrap/...` imports the
            // bootstrap overrides write out in full.
            loadPaths: ['.'],
            importers: [aliasImporter],
        });
    } catch (err) {
        failed++;
        console.error(`\n✖ ${file}\n${err.message}`);
    }
}

if (failed > 0) {
    console.error(
        `\n${failed} of ${files.length} stylesheet(s) failed to compile.`,
    );
    process.exit(1);
}
console.log(`${files.length} stylesheet(s) compile.`);
