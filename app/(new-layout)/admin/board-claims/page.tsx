import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listPendingBoardClaims } from '~src/lib/board-claims';
import { groupClaimsByBoard } from '~src/lib/setup/group-claims';
import { BoardClaimsClient } from './board-claims-client';

export default async function BoardClaimsPage() {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        notFound();
    }

    const claims = await listPendingBoardClaims(session.id);
    const groups = groupClaimsByBoard(claims);

    return <BoardClaimsClient groups={groups} />;
}
