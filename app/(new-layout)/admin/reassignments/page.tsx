'use server';

import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listReassignments } from '~src/lib/reassignments';
import { AuditLogClient } from './audit-log-client';

export default async function ReassignmentsAuditPage() {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        notFound();
    }

    const { games, categories } = await listReassignments(200, session.id);

    return <AuditLogClient games={games} categories={categories} />;
}
