'use client';

import type { ReactNode } from 'react';
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import { shouldInterceptSubmitClick } from './intercept-click';
import { useSubmitDialog } from './submit-dialog-context';

interface Props {
    gameSlug: string;
    categorySlug?: string | null;
    subcategoryKey?: string | null;
    className?: string;
    children: ReactNode;
}

/**
 * A "Submit a run" trigger.
 *
 * Renders a real link to `?submit=1`, so the URL stays shareable and
 * middle-click still opens a tab — but a plain left click inside a
 * `SubmitDialogProvider` opens the dialog in place instead of navigating.
 * Outside a provider (a run page, the setup wizard) there is no dialog to
 * open, so the click falls through and navigates to a page that has one.
 */
export function SubmitLink({
    gameSlug,
    categorySlug,
    subcategoryKey,
    className,
    children,
}: Props) {
    const dialog = useSubmitDialog();

    const href = buildSubmitHref(gameSlug, {
        categorySlug: categorySlug ?? undefined,
        subcategoryKey: subcategoryKey ?? undefined,
    });

    return (
        <Link
            href={href}
            className={className}
            onClick={(e) => {
                if (!dialog) return;
                if (!shouldInterceptSubmitClick(e)) return;
                e.preventDefault();
                dialog.open({ categorySlug, subcategoryKey });
            }}
        >
            {children}
        </Link>
    );
}
