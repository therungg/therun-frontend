'use server';

import { getSession } from '~src/actions/session.action';
import {
    type AdminModActionsFilter,
    getAdminModActions,
} from '~src/lib/admin-mod-actions';
import { confirmPermission } from '~src/rbac/confirm-permission';
import {
    type AdminModActionsPage,
    MOD_ACTION_FAMILIES,
    type ModActionFamily,
} from '../../../../types/admin-mod-actions.types';
import { ModActionsPanel } from './mod-actions-panel';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v;
}

function positiveInt(v: string | undefined): number | undefined {
    if (!v || !/^\d+$/.test(v)) return undefined;
    const n = Number(v);
    return n > 0 ? n : undefined;
}

export default async function ModActionsPage(props: {
    searchParams: SearchParams;
}) {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');

    const searchParams = await props.searchParams;
    const types = (first(searchParams.types) ?? '')
        .split(',')
        .filter((t): t is ModActionFamily =>
            (MOD_ACTION_FAMILIES as string[]).includes(t),
        );

    const filter: AdminModActionsFilter = {
        types,
        gameId: positiveInt(first(searchParams.game)),
        actorId: positiveInt(first(searchParams.mod)),
    };

    let initial: AdminModActionsPage = { items: [], nextCursor: null };
    let initialError: string | null = null;
    try {
        initial = await getAdminModActions(user.id, filter);
    } catch (e) {
        initialError = e instanceof Error ? e.message : 'Request failed';
    }

    return (
        <ModActionsPanel
            initial={initial}
            initialError={initialError}
            filter={filter}
        />
    );
}
