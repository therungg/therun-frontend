'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayersRange } from '../../../../../../types/leaderboards.types';
import { previewPolicyAction } from '../moderation/policies/actions/policies-actions.action';

/** What a pending players-policy write would do to the category's boards —
 *  fetched as a dry run and shown above the Save button before anyone
 *  commits to the change.
 *
 * `pendingValue`:
 * - `undefined` — nothing to preview (the draft isn't dirty, or it's
 *   invalid). Renders nothing.
 * - `null` — previews DELETING the policy at this scope.
 * - `{ min, max }` — previews writing that value.
 *
 * Debounced and self-cancelling: a further edit before the debounce fires,
 * or before a stale response lands, is discarded rather than shown. The
 * PREVIOUS result stays on screen while a new one is in flight — cleared
 * only when the draft becomes invalid or clean (`pendingValue === undefined`)
 * — so typing doesn't make the line blink out on every keystroke. Never
 * blocks Save — a failed preview leaves whatever was already shown alone
 * rather than clearing it.
 */
export function PolicyPreview({
    gameSlug,
    categoryId,
    subcategoryKey,
    pendingValue,
}: {
    gameSlug: string;
    categoryId: number;
    /** null/undefined for the category-wide scope. */
    subcategoryKey?: string | null;
    pendingValue: PlayersRange | null | undefined;
}) {
    const [result, setResult] = useState<{
        leaving: { total: number; incomplete: number; tooMany: number };
        returning: number;
    } | null>(null);
    const seq = useRef(0);

    const pendingKey =
        pendingValue === undefined
            ? undefined
            : pendingValue === null
              ? 'delete'
              : `${pendingValue.min}-${pendingValue.max ?? ''}`;

    useEffect(() => {
        if (pendingValue === undefined) {
            setResult(null);
            return;
        }
        const mine = ++seq.current;
        // Leave the previous result on screen until the new one lands (or
        // fails) — cleared only in the `undefined` branch above.
        const t = setTimeout(() => {
            void (async () => {
                const res = await previewPolicyAction(gameSlug, {
                    categoryId,
                    subcategoryKey: subcategoryKey ?? null,
                    value: pendingValue,
                });
                // A later edit (or unmount) moved past this request —
                // discard rather than show a stale answer.
                if (seq.current !== mine) return;
                if ('error' in res) return;
                setResult(res);
            })();
        }, 400);
        return () => clearTimeout(t);
        // pendingKey stands in for pendingValue's fields; the object itself
        // is a fresh reference every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSlug, categoryId, subcategoryKey, pendingKey]);

    if (!result) return null;

    const { leaving, returning } = result;
    if (leaving.total === 0 && returning === 0) {
        return <p className="text-muted small mb-0">No entries change.</p>;
    }

    const sentences: string[] = [];
    if (leaving.total > 0) {
        const noun = leaving.total === 1 ? 'entry' : 'entries';
        if (leaving.incomplete > 0 && leaving.tooMany > 0) {
            sentences.push(
                `${leaving.total} ${noun} would leave the board: ${leaving.incomplete} with too few players, ${leaving.tooMany} with too many.`,
            );
        } else {
            sentences.push(`${leaving.total} ${noun} would leave the board.`);
        }
    }
    if (returning > 0) {
        // "Entries", like the sentence above it — one paragraph, one word for
        // the same objects. And "no longer held for their players" rather
        // than "would come back onto the board": this count is entries that
        // stop being held FOR THEIR ROSTER, and another rule (a minimum, a
        // missing video, a moderator) can still be holding them.
        sentences.push(
            returning === 1
                ? '1 entry would no longer be held for its players.'
                : `${returning} entries would no longer be held for their players.`,
        );
    }

    return <p className="text-muted small mb-0">{sentences.join(' ')}</p>;
}
