'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import styles from '../game-page.module.scss';
import { useBoardNav } from './use-board-nav';

interface Props {
    verified: boolean;
}

const PENDING_ON = 'verified:on';
const PENDING_OFF = 'verified:off';

// Band-level control-pill toggle — lives outside the Filters popover so its
// state is always visible, not just reflected in a count badge.
export function VerifiedToggle({ verified }: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        const nextVerified = !verified;
        if (nextVerified) sp.set('verified', 'true');
        else sp.delete('verified');
        sp.delete('page');
        navigate(
            `${pathname}?${sp.toString()}`,
            nextVerified ? PENDING_ON : PENDING_OFF,
        );
    };

    // Optimistic selection: flips immediately while the nav is in flight
    // instead of waiting for the URL/RSC payload to land (req 2).
    const optimisticVerified =
        isPending && pendingKey === PENDING_ON
            ? true
            : isPending && pendingKey === PENDING_OFF
              ? false
              : verified;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={optimisticVerified}
            aria-busy={isPending || undefined}
            className={`${styles.pill} ${optimisticVerified ? styles.pillActive : ''}`}
        >
            Verified runs only
        </button>
    );
}
