/**
 * Turns the backend dry-run into sentences a mod can act on.
 *
 * The shapes here mirror the `?dryRun=1` response exactly. Ceremony scales to
 * consequence: when nothing moves the dialog collapses to a single confirm,
 * and it says so rather than showing an empty table.
 */

export interface BoardMovement {
    key: string;
    label: string;
    before: number;
    after: number;
}

export interface CategoryPreview {
    categoryId: number;
    display: string;
    moved: number;
    boards: BoardMovement[];
}

export interface VariablePreview {
    moved: number;
    unresolved: number;
    categories: CategoryPreview[];
}

export interface ConsequenceCopy {
    nothingMoves: boolean;
    headline: string;
    detail: string | null;
    /** Board table for the single-category case; empty when several. */
    boards: BoardMovement[];
}

const runs = (n: number) => (n === 1 ? '1 run' : `${n} runs`);
const move = (n: number) => (n === 1 ? 'moves' : 'move');

export function describeConsequences(
    preview: VariablePreview,
    opts: { variableName: string; action: 'save' | 'delete' },
): ConsequenceCopy {
    if (preview.moved === 0) {
        return {
            nothingMoves: true,
            headline: 'Nothing moves.',
            detail:
                preview.unresolved > 0
                    ? unresolvedSentence(preview.unresolved, opts.variableName)
                    : null,
            boards: [],
        };
    }

    const headline =
        opts.action === 'delete'
            ? `${runs(preview.moved)} ${move(preview.moved)} to a different board when ${opts.variableName} is deleted.`
            : `${runs(preview.moved)} ${move(preview.moved)} to a different board.`;

    const parts: string[] = [];
    if (preview.categories.length > 1) {
        parts.push(`This changes ${preview.categories.length} categories.`);
    }
    if (preview.unresolved > 0) {
        parts.push(unresolvedSentence(preview.unresolved, opts.variableName));
    }

    return {
        nothingMoves: false,
        headline,
        detail: parts.length > 0 ? parts.join(' ') : null,
        // One category: show its board table. Several: the dialog lists per
        // category instead, so a flattened table here would mislead.
        boards:
            preview.categories.length === 1 ? preview.categories[0].boards : [],
    };
}

function unresolvedSentence(count: number, variableName: string): string {
    return `${runs(count)} have a ${variableName} that matches none of your values, so they use the default.`;
}
