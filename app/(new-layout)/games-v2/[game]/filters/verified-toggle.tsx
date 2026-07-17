'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import styles from '../game-page.module.scss';

interface Props {
    verified: boolean;
}

// Band-level control-pill toggle — lives outside the Filters popover so its
// state is always visible, not just reflected in a count badge.
export function VerifiedToggle({ verified }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        if (verified) sp.delete('verified');
        else sp.set('verified', 'true');
        sp.delete('page');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isPending}
            aria-pressed={verified}
            className={`${styles.pill} ${verified ? styles.pillActive : ''}`}
        >
            Verified runs only
        </button>
    );
}
