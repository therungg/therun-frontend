'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from '~src/components/link';
import { getFormattedString } from '~src/components/util/datetime';
import { AddVideoField } from '~src/components/waiting-on-you/add-video-field';
import {
    boardName,
    videoRuleText,
} from '~src/components/waiting-on-you/waiting-copy';
import { useWaitingOnYou } from '~src/components/waiting-on-you/waiting-on-you-provider';
import type { WaitingRun } from '../../../../../types/pb-submission.types';
import styles from './submissions.module.scss';

const waitingFor = (since: string): string => {
    const days = Math.floor(
        (Date.now() - new Date(since).getTime()) / 86_400_000,
    );
    if (days < 1) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
};

export function WaitingList() {
    const { runs } = useWaitingOnYou();
    const target = Number(useSearchParams().get('run')) || null;
    const video = runs.filter((r) => r.kind === 'video');
    const submit = runs.filter((r) => r.kind === 'submit');

    useEffect(() => {
        if (target === null) return;
        document
            .getElementById(`run-${target}`)
            ?.scrollIntoView({ block: 'center' });
    }, [target]);

    if (runs.length === 0) {
        return (
            <section className={styles.group}>
                <p className={styles.empty}>Nothing is waiting on you.</p>
            </section>
        );
    }

    return (
        <div className={styles.page}>
            {video.length > 0 ? (
                <section className={styles.group}>
                    <header className={styles.groupHead}>
                        <h2 className={styles.groupTitle}>
                            Needs a video
                            <span className={styles.count}>{video.length}</span>
                        </h2>
                        <p className={styles.groupLede}>
                            These are off their boards until you add a video.
                            Paste a link and the run goes straight back on,
                            waiting for a moderator.
                        </p>
                    </header>
                    <ul className={styles.rows}>
                        {video.map((r) => (
                            <Row key={r.runId} run={r} target={target}>
                                <AddVideoField
                                    runId={r.runId}
                                    autoFocus={r.runId === target}
                                />
                            </Row>
                        ))}
                    </ul>
                </section>
            ) : null}
            {submit.length > 0 ? (
                <section className={styles.group}>
                    <header className={styles.groupHead}>
                        <h2 className={styles.groupTitle}>
                            Needs submitting
                            <span className={styles.count}>
                                {submit.length}
                            </span>
                        </h2>
                        <p className={styles.groupLede}>
                            These boards ask runners to confirm their own
                            personal bests. Nothing here expires.
                        </p>
                    </header>
                    <ul className={styles.rows}>
                        {submit.map((r) => (
                            <Row key={r.runId} run={r} target={target}>
                                <Link
                                    href={`/submissions/${r.runId}`}
                                    className="btn btn-primary btn-sm"
                                >
                                    Submit this run
                                </Link>
                            </Row>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}

function Row({
    run,
    target,
    children,
}: {
    run: WaitingRun;
    target: number | null;
    children: React.ReactNode;
}) {
    return (
        <li
            id={`run-${run.runId}`}
            className={styles.row}
            data-target={run.runId === target || undefined}
        >
            {run.gameImage ? (
                <img
                    src={run.gameImage}
                    alt=""
                    width={36}
                    height={48}
                    className={styles.art}
                />
            ) : (
                <span className={styles.art} />
            )}
            <div className={styles.what}>
                <span className={styles.game}>
                    {run.gameDisplay ?? 'Unknown game'}
                </span>
                <span className={styles.board}>{boardName(run)}</span>
                <span className={styles.meta}>
                    <span className={styles.time}>
                        {getFormattedString(String(run.timeMs))}
                    </span>
                    {' · '}would be #{run.wouldBeRank}
                    {' · '}
                    {waitingFor(run.since)}
                </span>
                {run.kind === 'video' ? (
                    <span className={styles.rule}>
                        {videoRuleText(run.videoRule)}
                    </span>
                ) : null}
            </div>
            <div className={styles.fix}>{children}</div>
        </li>
    );
}
