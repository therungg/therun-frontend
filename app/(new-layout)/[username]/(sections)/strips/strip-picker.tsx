'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, PencilSquare } from 'react-bootstrap-icons';
import { saveProfileStrip } from '~src/actions/profile-strip.action';
import { useShowcaseOptional } from '../../../leaderboards/[name]/showcase-provider';
import styles from '../profile-ui.module.scss';
import { type ResolvedStrip, STRIP_MAX, type StripOption } from './resolve';
import { setStripDraft } from './strip-draft-store';

/**
 * The runner's own control for which stats their strip shows. On the
 * Leaderboards tab in Customize mode it is always open and saves with the
 * showcase; everywhere else it opens from the pencil and saves itself.
 */
export function StripPicker({ strip }: { strip: ResolvedStrip }) {
    const router = useRouter();
    const showcase = useShowcaseOptional();
    const inCustomize = strip.tab === 'leaderboards' && !!showcase?.editing;
    const [open, setOpen] = useState(false);
    const [ids, setIds] = useState<string[]>(strip.picked);
    const [error, setError] = useState<string | null>(null);
    const [saving, startSaving] = useTransition();

    // Customize mode can be entered more than once per mount (it toggles on
    // the showcase, not this component); each time it opens, the picks
    // should start from what is actually saved, not whatever was left over
    // from a previous session. Adjust state during render rather than an
    // effect, per React's "storing information from previous renders".
    const [prevInCustomize, setPrevInCustomize] = useState(inCustomize);
    if (inCustomize !== prevInCustomize) {
        setPrevInCustomize(inCustomize);
        if (inCustomize) {
            setIds(strip.picked);
            setOpen(false);
            setError(null);
        }
    }

    // The strip previews unsaved picks while the picker is open. The draft
    // is dropped on cancel and on unmount, and once saved picks arrive from
    // the server (so the strip doesn't flash back to the old tiles first).
    const pickedKey = strip.picked.join(',');
    useEffect(() => {
        setStripDraft(strip.tab, null);
    }, [pickedKey, strip.tab]);
    // Leaving Customize drops the draft too (a cancelled session must not keep
    // previewing; after a save the refreshed picks replace it a moment later).
    useEffect(() => {
        if (!inCustomize) setStripDraft(strip.tab, null);
    }, [inCustomize, strip.tab]);
    useEffect(() => () => setStripDraft(strip.tab, null), [strip.tab]);

    const change = (next: string[]) => {
        setIds(next);
        setStripDraft(strip.tab, next);
        if (inCustomize) showcase?.setStripDraft(next);
    };
    const toggle = (id: string) =>
        change(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    const shift = (from: number, to: number) => {
        const next = [...ids];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        change(next);
    };

    if (!inCustomize && !open) {
        return (
            <button
                type="button"
                className={styles.stripEdit}
                aria-label="Choose stats"
                onClick={() => {
                    setIds(strip.picked);
                    setError(null);
                    setOpen(true);
                }}
            >
                <PencilSquare size={14} aria-hidden />
            </button>
        );
    }

    const byId = new Map(strip.options.map((o) => [o.id, o]));
    const ordered = [
        ...ids
            .map((id) => byId.get(id))
            .filter((o): o is StripOption => o !== undefined),
        ...strip.options.filter((o) => !ids.includes(o.id)),
    ];

    const save = () =>
        startSaving(async () => {
            const result = await saveProfileStrip(strip.tab, ids);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setOpen(false);
            router.refresh();
        });

    return (
        <div
            className={styles.stripPanel}
            role="group"
            aria-label="Stats on this strip"
        >
            <ul className={styles.stripOptions}>
                {ordered.map((o) => {
                    const at = ids.indexOf(o.id);
                    const on = at !== -1;
                    return (
                        <li
                            key={o.id}
                            data-empty={o.preview === null || undefined}
                        >
                            <label>
                                <input
                                    type="checkbox"
                                    checked={on}
                                    disabled={!on && ids.length >= STRIP_MAX}
                                    onChange={() => toggle(o.id)}
                                />
                                <span>{o.name}</span>
                                <b>{o.preview ?? 'No data yet'}</b>
                            </label>
                            {on ? (
                                <span className={styles.stripMove}>
                                    <button
                                        type="button"
                                        aria-label={`Move ${o.name} left`}
                                        disabled={at === 0}
                                        onClick={() => shift(at, at - 1)}
                                    >
                                        <ArrowLeft size={12} aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Move ${o.name} right`}
                                        disabled={at === ids.length - 1}
                                        onClick={() => shift(at, at + 1)}
                                    >
                                        <ArrowRight size={12} aria-hidden />
                                    </button>
                                </span>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
            {inCustomize ? null : (
                <span className={styles.stripActions}>
                    {error ? (
                        <span className={styles.stripError}>{error}</span>
                    ) : null}
                    <button
                        type="button"
                        className={styles.stripButton}
                        onClick={() => {
                            setStripDraft(strip.tab, null);
                            setOpen(false);
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.stripButton}
                        data-primary
                        disabled={saving}
                        onClick={save}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </span>
            )}
        </div>
    );
}
