import { Badge } from 'react-bootstrap';
import type { LifecycleStatus } from '~src/lib/tournament-permissions';

const VARIANT: Record<LifecycleStatus, string> = {
    active: 'success',
    locked: 'warning',
    finalized: 'secondary',
    archived: 'dark',
};

export function LifecycleStatusBadge({ status }: { status: LifecycleStatus }) {
    return <Badge bg={VARIANT[status]}>{status}</Badge>;
}
