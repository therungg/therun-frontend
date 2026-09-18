'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';
import { buildSubmitHref, SUBMIT_PARAM } from '~src/lib/board-url';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import type { EmulatorPolicy } from '../rules/rules-panel';
import { parseSubmitParams } from './submit-params';
import { type SubmitDialogGame, SubmitRunDialog } from './submit-run-dialog';

export interface SubmitTarget {
    categorySlug?: string | null;
    subcategoryKey?: string | null;
}

interface SubmitDialogApi {
    /** Opens the dialog in place — no navigation, no server round-trip. */
    open: (target?: SubmitTarget) => void;
}

const SubmitDialogContext = createContext<SubmitDialogApi | null>(null);

/**
 * Available only inside `SubmitDialogProvider`. Null elsewhere, which is what
 * lets a submit link on another route fall back to real navigation.
 */
export function useSubmitDialog(): SubmitDialogApi | null {
    return useContext(SubmitDialogContext);
}

interface Props {
    game: SubmitDialogGame;
    /** Moderator-set cover, which wins over the IGDB one — as on the hero. */
    coverUrl?: string | null;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    canModerate: boolean;
    sessionUsername: string | null;
    /** Board to open on when nothing more specific is given (the page's own). */
    defaultCategorySlug?: string | null;
    defaultSubcategoryValues?: Record<string, string>;
    /** The URL as rendered on the server, so a deep link opens on first paint. */
    initialSearch: string;
    children: ReactNode;
}

/**
 * Owns the submit dialog for a page, and opens it without navigating.
 *
 * The dialog used to be driven purely by `?submit=1`, which meant every click
 * paid a full RSC round-trip (~0.7s warm, ~2.7s cold) before anything
 * appeared — for a dialog whose first screen needs no server data at all;
 * categories and groups are already props here. So open state lives in React
 * and the URL is updated with `history.replaceState`, which keeps the address
 * bar shareable without asking the server for a page it already rendered.
 *
 * The URL is still the source of truth on arrival: `initialSearch` seeds the
 * open state, so a pasted `?submit=1` link still opens the dialog.
 */
export function SubmitDialogProvider({
    game,
    coverUrl,
    categories,
    groups,
    gameRules,
    emulatorPolicy,
    canModerate,
    sessionUsername,
    defaultCategorySlug,
    defaultSubcategoryValues,
    initialSearch,
    children,
}: Props) {
    const fromUrl = useMemo(
        () => parseSubmitParams(new URLSearchParams(initialSearch)),
        [initialSearch],
    );

    const [isOpen, setIsOpen] = useState(fromUrl.open);
    const [target, setTarget] = useState<SubmitTarget>({
        categorySlug: fromUrl.categorySlug ?? defaultCategorySlug,
    });

    const open = useCallback(
        (next?: SubmitTarget) => {
            setTarget({
                categorySlug: next?.categorySlug,
                subcategoryKey: next?.subcategoryKey,
            });
            setIsOpen(true);
            // Address bar only — replaceState does not notify the router, so no
            // RSC fetch and no re-render of the page behind the dialog.
            window.history.replaceState(
                null,
                '',
                buildSubmitHref(game.name, {
                    categorySlug: next?.categorySlug,
                    subcategoryKey: next?.subcategoryKey,
                }),
            );
        },
        [game.name],
    );

    const close = useCallback(() => {
        setIsOpen(false);
        const sp = new URLSearchParams(window.location.search);
        sp.delete(SUBMIT_PARAM);
        const qs = sp.toString();
        window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${qs ? `?${qs}` : ''}`,
        );
    }, []);

    const api = useMemo(() => ({ open }), [open]);

    // Subcategory values only come from the URL. A target picked by a click
    // carries its own subcategoryKey, which the dialog resolves from the
    // category's variables instead.
    const initialSubcategoryValues = target.subcategoryKey
        ? undefined
        : (fromUrl.subcategoryValues ?? defaultSubcategoryValues);

    return (
        <SubmitDialogContext.Provider value={api}>
            {children}
            <SubmitRunDialog
                game={game}
                coverUrl={coverUrl}
                categories={categories}
                groups={groups}
                gameRules={gameRules}
                emulatorPolicy={emulatorPolicy}
                canModerate={canModerate}
                sessionUsername={sessionUsername}
                initialCategorySlug={
                    target.categorySlug ?? defaultCategorySlug ?? undefined
                }
                initialSubcategoryValues={initialSubcategoryValues}
                open={isOpen}
                onClose={close}
            />
        </SubmitDialogContext.Provider>
    );
}
