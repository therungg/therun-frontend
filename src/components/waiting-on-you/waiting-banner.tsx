'use client';

import { ExclamationCircleFill } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { WaitingRun } from '../../../types/pb-submission.types';
import { submissionsHref, summaryText } from './waiting-copy';
import styles from './waiting-on-you.module.scss';
import { useWaitingOnYou } from './waiting-on-you-provider';

/** "2 runs need a video · 1 run needs submitting — Fix them". Nothing when nothing waits. */
export function WaitingBanner({
    only,
}: {
    /** Narrow to some runs, e.g. one game's. */
    only?: (run: WaitingRun) => boolean;
}) {
    const { username, runs, fixed } = useWaitingOnYou();
    const open = runs.filter(
        (r) => !fixed.has(r.runId) && (only ? only(r) : true),
    );
    if (!username || open.length === 0) return null;
    return (
        <Link href={submissionsHref(username)} className={styles.banner}>
            <ExclamationCircleFill size={16} aria-hidden />
            <span className={styles.bannerText}>{summaryText(open)}</span>
            <span className={styles.bannerAction}>
                {open.length === 1 ? 'Fix it' : 'Fix them'}
            </span>
        </Link>
    );
}
