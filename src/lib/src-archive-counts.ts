import type { SrcArchiveCounts } from '../../types/src-import.types';

export function plural(n: number, one: string, many: string): string {
    return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

export function structureParts(counts: SrcArchiveCounts): string[] {
    return [
        counts.categories > 0 &&
            plural(counts.categories, 'category', 'categories'),
        counts.variables > 0 &&
            plural(counts.variables, 'variable', 'variables'),
        counts.levels > 0 && plural(counts.levels, 'level', 'levels'),
    ].filter((p): p is string => !!p);
}
