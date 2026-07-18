'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import styles from './clear-filters-button.module.scss';

interface Props {
    variableKeys: string[];
}

export function ClearFiltersButton({ variableKeys }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete('verified');
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        const qs = sp.toString();
        startTransition(() => {
            router.push(qs ? `${pathname}?${qs}` : pathname);
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isPending}
            className={styles.clearBtn}
        >
            Clear filters
        </button>
    );
}
