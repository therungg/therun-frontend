'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { IgdbPicker } from '~src/components/igdb-picker/igdb-picker';
import type { IgdbSearchResult } from '~src/lib/game-mgmt';
import {
    igdbApplyMatchAction,
    igdbSearchAction,
} from '../manage/identifiers/actions/igdb-match.action';
import { ConfirmDialog } from '../shared/confirm-dialog';
import styles from './setup.module.scss';

/** One field row in the reset-preview dialog: current value vs IGDB value. */
export interface IgdbResetRow {
    field: string;
    current: ReactNode;
    igdb: ReactNode;
}

interface Props {
    gameId: number;
    gameName: string;
    igdbUrl: string | null;
    /** edit-game on THIS game — the backend gates igdb-search/sync on it. */
    canRematch: boolean;
    /** IGDB-fed fields whose form value currently differs from IGDB's. */
    resetRows: IgdbResetRow[];
    /** Overwrites the form's IGDB-fed fields with the IGDB values. */
    onReset: () => void;
    disabled: boolean;
}

/**
 * Names IGDB as the source of record for board identity data and holds both
 * source-level actions: re-matching to a different IGDB entry (persists
 * immediately — the backend re-syncs) and resetting the form's IGDB-fed
 * fields back to the IGDB values (local until saved, previewed first).
 */
export function IgdbSourceCard({
    gameId,
    gameName,
    igdbUrl,
    canRematch,
    resetRows,
    onReset,
    disabled,
}: Props) {
    const router = useRouter();
    const [searchOpen, setSearchOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingApply, setPendingApply] = useState<IgdbSearchResult | null>(
        null,
    );
    const [resetOpen, setResetOpen] = useState(false);
    const [isBusy, startBusy] = useTransition();

    const entrySlug = igdbUrl?.split('/').filter(Boolean).pop() ?? null;

    const apply = (match: IgdbSearchResult) => {
        startBusy(async () => {
            setError(null);
            const res = await igdbApplyMatchAction({
                gameId,
                gameName,
                igdbId: match.id,
            });
            if ('error' in res) {
                setError(res.error);
                setPendingApply(null);
                return;
            }
            toast.success(`Matched to ${res.result.igdbName}`);
            setPendingApply(null);
            setSearchOpen(false);
            router.refresh();
        });
    };

    return (
        <div className={styles.igdbCard}>
            <p className={styles.igdbHeader}>
                <span className={styles.igdbBadge}>IGDB</span>
                <span className="text-muted small">
                    {igdbUrl ? (
                        <>
                            Cover art, description, release year, and platforms
                            come from the IGDB entry{' '}
                            <a href={igdbUrl} target="_blank" rel="noreferrer">
                                {entrySlug}
                            </a>
                            .
                        </>
                    ) : (
                        <>
                            This board isn&apos;t linked to an IGDB entry yet,
                            so nothing is prefilled.
                        </>
                    )}
                </span>
            </p>
            <div className={styles.igdbActions}>
                {canRematch ? (
                    <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={disabled || isBusy}
                        onClick={() => setSearchOpen((o) => !o)}
                    >
                        {searchOpen
                            ? 'Close search'
                            : igdbUrl
                              ? 'Change IGDB match'
                              : 'Link IGDB entry'}
                    </button>
                ) : (
                    <span className="text-muted small">
                        Only this game’s admins can change the IGDB match.
                    </span>
                )}
                {igdbUrl &&
                    (resetRows.length > 0 ? (
                        <button
                            type="button"
                            className={styles.secondaryAction}
                            disabled={disabled || isBusy}
                            onClick={() => setResetOpen(true)}
                        >
                            Reset fields to IGDB…
                        </button>
                    ) : (
                        <span className="text-muted small">
                            All fields match IGDB.
                        </span>
                    ))}
            </div>
            {searchOpen && canRematch && (
                <IgdbPicker<IgdbSearchResult & { coverUrl?: string | null }>
                    disabled={disabled || isBusy}
                    search={async (q) => {
                        const res = await igdbSearchAction({
                            gameId,
                            gameName,
                            query: q,
                        });
                        if ('error' in res) return res;
                        return {
                            result: res.result.map((r) => ({
                                ...r,
                                coverUrl: r.cover?.url ?? null,
                            })),
                        };
                    }}
                    renderAction={(row, busy) => (
                        <button
                            type="button"
                            className={styles.secondaryAction}
                            disabled={busy}
                            onClick={() => setPendingApply(row)}
                        >
                            Use this
                        </button>
                    )}
                />
            )}
            {error && (
                <div role="alert" className={`${styles.errorNote} mt-2 mb-0`}>
                    {error}
                </div>
            )}
            <ConfirmDialog
                open={pendingApply != null}
                onClose={() => setPendingApply(null)}
                onConfirm={() => {
                    if (pendingApply) apply(pendingApply);
                }}
                labelledBy={`igdb-rematch-title-${gameId}`}
                title={igdbUrl ? 'Re-match this board?' : 'Link this board?'}
                message={`Match this board to "${pendingApply?.name}" and sync? All IGDB-derived data (description, dates, platforms, genres) is replaced with that game's, and this form reloads with it, so unsaved edits here are lost. Mod-set overrides are kept.`}
                confirmLabel={igdbUrl ? 'Re-match' : 'Link'}
                pending={isBusy}
                error={null}
            />
            <ConfirmDialog
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                onConfirm={() => {
                    onReset();
                    setResetOpen(false);
                }}
                labelledBy={`igdb-reset-title-${gameId}`}
                title="Reset these fields to IGDB?"
                variant="warning"
                confirmLabel="Reset fields"
                pending={false}
                error={null}
                message={
                    <>
                        These fields go back to the IGDB values. Nothing is
                        stored until you save the form.
                        <span className={styles.igdbDiff}>
                            {resetRows.map((row) => (
                                <span
                                    key={row.field}
                                    className={styles.igdbDiffRow}
                                >
                                    <span className={styles.igdbDiffField}>
                                        {row.field}
                                    </span>
                                    <span className={styles.igdbDiffCurrent}>
                                        {row.current}
                                    </span>
                                    <span aria-hidden>→</span>
                                    <span>{row.igdb}</span>
                                </span>
                            ))}
                        </span>
                    </>
                }
            />
        </div>
    );
}
