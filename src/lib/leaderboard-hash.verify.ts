// Run with: npx tsx src/lib/leaderboard-hash.verify.ts

import type { VariableDef } from '../../types/leaderboards.types';
import {
    computeSubcategoryHash,
    MissingRequiredVariableError,
} from './leaderboard-hash';

function assert(cond: unknown, msg: string): asserts cond {
    if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const noVars: VariableDef[] = [];

const oneSubcat: VariableDef[] = [
    {
        name: 'difficulty',
        display: 'Difficulty',
        type: 'select',
        kind: 'subcategory',
        values: ['hard', 'easy'],
        required: true,
        sortOrder: 0,
        scope: 'game',
    },
];

const twoSubcat: VariableDef[] = [
    {
        name: 'platform',
        display: 'Platform',
        type: 'select',
        kind: 'subcategory',
        values: ['n64', 'pc'],
        required: true,
        sortOrder: 1,
        scope: 'game',
    },
    {
        name: 'difficulty',
        display: 'Difficulty',
        type: 'select',
        kind: 'subcategory',
        values: ['hard', 'easy'],
        defaultValue: 'easy',
        required: false,
        sortOrder: 0,
        scope: 'game',
    },
];

const filterOnly: VariableDef[] = [
    {
        name: 'platform',
        display: 'Platform',
        type: 'select',
        kind: 'filter',
        values: ['n64', 'pc'],
        required: false,
        sortOrder: 0,
        scope: 'game',
    },
];

assert(computeSubcategoryHash(noVars, {}) === '', 'noVars yields empty string');
assert(
    computeSubcategoryHash(filterOnly, { platform: 'n64' }) === '',
    'filter-only vars ignored',
);

let threw = false;
try {
    computeSubcategoryHash(oneSubcat, {});
} catch (e) {
    threw = e instanceof MissingRequiredVariableError;
}
assert(threw, 'required missing throws MissingRequiredVariableError');

const a = computeSubcategoryHash(oneSubcat, { difficulty: 'hard' });
const b = computeSubcategoryHash(oneSubcat, { difficulty: 'hard' });
assert(a === b, 'hash is deterministic');
assert(/^[0-9a-f]{16}$/.test(a), 'hash is 16 hex chars');

const c = computeSubcategoryHash(twoSubcat, {
    platform: 'n64',
    difficulty: 'hard',
});
const reversedDefs = [...twoSubcat].reverse();
const d = computeSubcategoryHash(reversedDefs, {
    platform: 'n64',
    difficulty: 'hard',
});
assert(c === d, 'def order does not change hash (sort by name)');

const withDefault = computeSubcategoryHash(twoSubcat, { platform: 'n64' });
const explicitDefault = computeSubcategoryHash(twoSubcat, {
    platform: 'n64',
    difficulty: 'easy',
});
assert(withDefault === explicitDefault, 'defaultValue applied when unset');

console.log('All assertions passed.');
console.log('Cross-check hashes against backend:');
console.log(`  difficulty=hard            -> ${a}`);
console.log(`  difficulty=hard|platform=n64 -> ${c}`);
