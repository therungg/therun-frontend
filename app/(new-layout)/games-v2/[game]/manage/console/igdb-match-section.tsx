'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { IgdbSearchResult } from '~src/lib/game-mgmt';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import {
    igdbApplyMatchAction,
    igdbSearchAction,
} from '../identifiers/actions/igdb-match.action';

interface Props {
    gameId: number;
    igdbUrl: string | null;
    canRematch: boolean;
}

// Fixing a wrong IGDB match: search IGDB, apply — the sync overwrites all
// IGDB-derived fields (summary, dates, platforms, genres) with the new
// game's data. Mod overrides (custom cover, About, year) survive.
export function IgdbMatchSection({ gameId, igdbUrl, canRematch }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IgdbSearchResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingApply, setPendingApply] = useState<IgdbSearchResult | null>(
        null,
    );
    const [isBusy, startBusy] = useTransition();

    const search = () => {
        startBusy(async () => {
            setError(null);
            const res = await igdbSearchAction({ gameId, query });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setResults(res.result);
        });
    };

    const apply = (match: IgdbSearchResult) => {
        startBusy(async () => {
            setError(null);
            const res = await igdbApplyMatchAction({
                gameId,
                igdbId: match.id,
            });
            if ('error' in res) {
                setError(res.error);
                setPendingApply(null);
                return;
            }
            toast.success(`Re-matched to ${res.result.igdbName}`);
            setPendingApply(null);
            setResults(null);
            setQuery('');
            router.refresh();
        });
    };

    return (
        <section className="mt-4">
            <h3 className="h6">IGDB match</h3>
            <p className="text-muted small mb-2">
                {igdbUrl ? (
                    <>
                        This board is matched to{' '}
                        <a href={igdbUrl} target="_blank" rel="noreferrer">
                            this IGDB entry
                        </a>
                        , which feeds the cover, description, release date, and
                        platforms.
                    </>
                ) : (
                    <>This board has no IGDB match yet.</>
                )}{' '}
                {!canRematch && 'Ask a site admin if it needs changing.'}
            </p>
            {canRematch && (
                <>
                    <div className="d-flex gap-2 mb-2">
                        <input
                            className="form-control form-control-sm w-auto"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    search();
                                }
                            }}
                            placeholder="Search IGDB by name"
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={isBusy || !query.trim()}
                            onClick={search}
                        >
                            {isBusy ? 'Searching…' : 'Search'}
                        </button>
                    </div>
                    {results && results.length === 0 && (
                        <p className="text-muted small">No IGDB games found.</p>
                    )}
                    {results && results.length > 0 && (
                        <ul className="list-unstyled mb-0">
                            {results.map((r) => (
                                <li
                                    key={r.id}
                                    className="d-flex align-items-center gap-2 py-1"
                                >
                                    {r.cover?.url && (
                                        <img
                                            src={r.cover.url.replace(
                                                't_thumb',
                                                't_cover_small',
                                            )}
                                            alt=""
                                            width={24}
                                            height={32}
                                            className="rounded"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    )}
                                    <span className="small">
                                        {r.name}{' '}
                                        <span className="text-muted">
                                            #{r.id}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary ms-auto"
                                        disabled={isBusy}
                                        onClick={() => setPendingApply(r)}
                                    >
                                        Use this
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
            {error && (
                <div className="alert alert-danger mt-2 mb-0 py-2">{error}</div>
            )}
            <ConfirmDialog
                open={pendingApply != null}
                onClose={() => setPendingApply(null)}
                onConfirm={() => {
                    if (pendingApply) apply(pendingApply);
                }}
                labelledBy={`igdb-rematch-title-${gameId}`}
                title="Re-match this board?"
                message={`Match this board to "${pendingApply?.name}" and re-sync? All IGDB-derived data (description, dates, platforms, genres) is replaced with that game’s. Mod-set overrides are kept.`}
                confirmLabel="Re-match"
                pending={isBusy}
                error={null}
            />
        </section>
    );
}
