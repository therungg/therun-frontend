'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import styles from './leaderboard.module.scss';

interface Props {
    page: number;
    totalPages: number;
}

export function PaginationBar({ page, totalPages }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    if (totalPages <= 1) return null;

    const go = (p: number) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (p === 1) sp.delete('page');
        else sp.set('page', String(p));
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    const windowed = pageWindow(page, totalPages, 5);

    return (
        <nav aria-label="Leaderboard pages" className={styles.pager}>
            <button
                type="button"
                className={styles.pageBtn}
                disabled={page === 1 || isPending}
                onClick={() => go(page - 1)}
            >
                Prev
            </button>
            {windowed.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => go(p)}
                    disabled={isPending}
                    aria-current={p === page ? 'page' : undefined}
                    className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                >
                    {p}
                </button>
            ))}
            <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= totalPages || isPending}
                onClick={() => go(page + 1)}
            >
                Next
            </button>
        </nav>
    );
}

function pageWindow(current: number, total: number, size: number): number[] {
    const half = Math.floor(size / 2);
    let start = Math.max(1, current - half);
    const end = Math.min(total, start + size - 1);
    start = Math.max(1, end - size + 1);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
}
