'use client';

import type { BackupVersionsResponse } from 'types/backups.types';
import Link from '~src/components/link';
import { DailyList } from './daily-list';
import { RecentList } from './recent-list';

type BackupsState =
    | { status: 'loading' }
    | { status: 'loaded'; data: BackupVersionsResponse }
    | { status: 'empty' } // 404 — no metadata for this key
    | { status: 'error' };

interface BackupsProps {
    state: BackupsState;
    filenameBase: string;
    onRetry: () => void;
}

function PaywallCard() {
    return (
        <div className="border rounded p-3 mb-3 bg-body-tertiary">
            <h4 className="fs-6 mb-2">Downloads are a supporter feature</h4>
            <p className="mb-2 small">
                Cloud backups cost therun.gg money to keep around. Becoming a
                supporter on Patreon unlocks downloads — yours and everyone
                else's.
            </p>
            <Link href="/support" className="btn btn-sm btn-primary">
                Support therun.gg
            </Link>
        </div>
    );
}

export function Backups({ state, filenameBase, onRetry }: BackupsProps) {
    return (
        <div className="mt-4">
            <h3 className="fs-5 mb-2">Backups</h3>

            {state.status === 'loading' && (
                <p className="text-muted mb-0">Loading backups…</p>
            )}

            {state.status === 'error' && (
                <div>
                    <p className="text-danger mb-2">Couldn't load backups.</p>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onRetry}
                    >
                        Retry
                    </button>
                </div>
            )}

            {state.status === 'empty' && (
                <div className="border rounded p-3 bg-body-tertiary">
                    <p className="mb-2">
                        No backups for this run yet. Supporters get automatic
                        cloud backups on every upload.
                    </p>
                    <Link href="/support" className="btn btn-sm btn-primary">
                        Support therun.gg
                    </Link>
                </div>
            )}

            {state.status === 'loaded' && (
                <>
                    {!state.data.canDownload && <PaywallCard />}
                    <RecentList
                        entries={state.data.recent}
                        filenameBase={filenameBase}
                    />
                    <DailyList
                        entries={state.data.daily}
                        filenameBase={filenameBase}
                    />
                </>
            )}
        </div>
    );
}
