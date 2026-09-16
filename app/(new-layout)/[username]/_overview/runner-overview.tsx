import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import type {
    ChapterId,
    RunnerProfileHead,
} from '../../../../types/runner-profile.types';
import { ProfileShell } from '../(sections)/profile-shell';
import { ChapterSkeleton, visibleChapters } from './chapter';
import styles from './overview.module.scss';

/** Skeleton heights match each chapter's glance at desktop width. */
const SKELETON_HEIGHT: Record<ChapterId, number> = {
    highlights: 280,
    leaderboards: 240,
    activity: 220,
    games: 190,
    races: 200,
    splits: 220,
};

function ChapterBody({
    id,
    head: _head,
}: {
    id: ChapterId;
    head: RunnerProfileHead;
}) {
    switch (id) {
        default:
            return null;
    }
}

export async function RunnerOverview({ name }: { name: string }) {
    const head = await getRunnerProfileHead(name);
    if (!head) notFound();
    const runner = head.runner.name;
    return (
        <ProfileShell head={head}>
            <div className={styles.chapters}>
                {visibleChapters(head).map((id) => (
                    <Suspense
                        key={id}
                        fallback={
                            <ChapterSkeleton
                                id={id}
                                name={runner}
                                height={SKELETON_HEIGHT[id]}
                            />
                        }
                    >
                        <ChapterBody id={id} head={head} />
                    </Suspense>
                ))}
            </div>
        </ProfileShell>
    );
}
