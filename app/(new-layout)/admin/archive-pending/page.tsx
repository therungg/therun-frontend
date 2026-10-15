import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type {
    SrcArchivePending,
    SrcArchivePendingStatus,
} from '../../../../types/src-import.types';
import {
    type ArchivePendingFilter,
    listArchivePending,
} from './actions/archive-pending.action';
import { ArchivePendingDashboard } from './dashboard';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const STATUSES: SrcArchivePendingStatus[] = [
    'behind',
    'contacted',
    'applying',
    'applied',
    'failed',
];
const STALE_MS = 90 * 24 * 60 * 60 * 1000;

function first(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v;
}

export default async function ArchivePendingPage(props: {
    searchParams: SearchParams;
}) {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');

    const searchParams = await props.searchParams;
    const status = first(searchParams.status);
    const sort = first(searchParams.sort);
    const filter: ArchivePendingFilter = {
        status: STATUSES.find((s) => s === status),
        activeMods: first(searchParams.activeMods) === '1',
        sort: sort === 'runs' || sort === 'staged' ? sort : undefined,
        q: first(searchParams.q)?.trim() || undefined,
    };

    let data: SrcArchivePending | null = null;
    try {
        data = await listArchivePending(filter);
    } catch {
        data = null;
    }

    const staleBefore = Date.now() - STALE_MS;

    const rows = (data?.rows ?? []).map((r) => ({
        ...r,
        moderators: r.moderators.map((m) => ({
            ...m,
            stale:
                m.lastSeenAt === null ||
                new Date(m.lastSeenAt).getTime() < staleBefore,
        })),
    }));

    return (
        <Suspense>
            <ArchivePendingDashboard
                summary={data?.summary ?? null}
                rows={rows}
                filter={filter}
            />
        </Suspense>
    );
}
