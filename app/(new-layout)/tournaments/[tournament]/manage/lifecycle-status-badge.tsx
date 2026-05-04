import type { LifecycleStatus } from '~src/lib/tournament-permissions';
import { formStyles as styles } from '../../components/form-primitives';

const VARIANT: Record<LifecycleStatus, string> = {
    active: styles.statusActive,
    locked: styles.statusLocked,
    finalized: styles.statusFinalized,
    archived: styles.statusArchived,
};

const LABEL: Record<LifecycleStatus, string> = {
    active: 'Active',
    locked: 'Locked',
    finalized: 'Finalized',
    archived: 'Archived',
};

export function LifecycleStatusBadge({ status }: { status: LifecycleStatus }) {
    return (
        <span className={`${styles.statusPill} ${VARIANT[status]}`}>
            {LABEL[status]}
        </span>
    );
}
