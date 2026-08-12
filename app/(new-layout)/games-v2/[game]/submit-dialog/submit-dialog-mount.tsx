'use client';

import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import type { EmulatorPolicy } from '../rules/rules-panel';
import { type SubmitDialogGame, SubmitRunDialog } from './submit-run-dialog';
import { useSubmitDialogState } from './use-submit-dialog';

interface Props {
    game: SubmitDialogGame;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    canModerate: boolean;
    sessionUsername: string | null;
    /**
     * Board the dialog should open on, when the page knows better than the
     * URL does — a single-featured-category game renders its board with no
     * `category` param at all. Omitted, the URL's own params stand in.
     */
    initialCategorySlug?: string | null;
    initialSubcategoryValues?: Record<string, string>;
}

/**
 * Mounts the submit dialog and wires it to the URL.
 *
 * One component rather than a hook plus a render, so the two halves can't be
 * separated: the dialog is opened by `?submit=1`, and a page that carries a
 * "Submit a run" link without this mounted just changes the URL and appears
 * to do nothing. That is exactly how the category overview shipped broken.
 *
 * It is a client component so server-rendered pages (the overview) can mount
 * it as-is.
 */
export function SubmitDialogMount({
    game,
    categories,
    groups,
    gameRules,
    emulatorPolicy,
    canModerate,
    sessionUsername,
    initialCategorySlug,
    initialSubcategoryValues,
}: Props) {
    const submit = useSubmitDialogState();

    return (
        <SubmitRunDialog
            game={game}
            categories={categories}
            groups={groups}
            gameRules={gameRules}
            emulatorPolicy={emulatorPolicy}
            canModerate={canModerate}
            sessionUsername={sessionUsername}
            initialCategorySlug={
                initialCategorySlug ?? submit.categorySlug ?? undefined
            }
            initialSubcategoryValues={
                initialSubcategoryValues ?? submit.subcategoryValues
            }
            open={submit.open}
            onClose={submit.close}
        />
    );
}
