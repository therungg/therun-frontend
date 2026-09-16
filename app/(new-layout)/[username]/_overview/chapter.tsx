import type { ReactNode } from 'react';
import Link from '~src/components/link';
import type {
    ChapterId,
    RunnerProfileHead,
} from '../../../../types/runner-profile.types';
import styles from './overview.module.scss';

export const CHAPTER_TITLE: Record<ChapterId, string> = {
    highlights: 'Highlights',
    leaderboards: 'Leaderboards',
    activity: 'Activity',
    games: 'Games',
    races: 'Races',
    splits: 'Splits and sessions',
};

export const CHAPTER_SEE_ALL: Record<
    ChapterId,
    'leaderboards' | 'stats' | 'activity' | 'races' | 'splits'
> = {
    highlights: 'leaderboards',
    leaderboards: 'leaderboards',
    activity: 'activity',
    games: 'stats',
    races: 'races',
    splits: 'splits',
};

const SEE_ALL_LABEL: Record<ChapterId, string> = {
    highlights: 'See all leaderboards',
    leaderboards: 'See all leaderboards',
    activity: 'See all activity',
    games: 'See all stats',
    races: 'See all races',
    splits: 'See all splits',
};

/** Fixed for everyone: runners customise what's inside a chapter, not the order. */
const CHAPTER_ORDER: ChapterId[] = [
    'highlights',
    'leaderboards',
    'activity',
    'games',
    'races',
    'splits',
];

// Guests have no stats part, so no Games chapter until it can come from boards.
const GUEST_CHAPTERS: ChapterId[] = ['highlights', 'leaderboards'];

/** The chapters this page shows. */
export function visibleChapters(head: RunnerProfileHead): ChapterId[] {
    return CHAPTER_ORDER.filter(
        (id) =>
            head.chapters[id] &&
            (!head.runner.guest || GUEST_CHAPTERS.includes(id)),
    );
}

export function Chapter({
    id,
    name,
    children,
}: {
    id: ChapterId;
    name: string;
    children: ReactNode;
}) {
    return (
        <section className={styles.chapter} aria-label={CHAPTER_TITLE[id]}>
            <div className={styles.chapterHead}>
                <h2 className={styles.chapterTitle}>{CHAPTER_TITLE[id]}</h2>
                <Link
                    href={`/${encodeURIComponent(name)}/${CHAPTER_SEE_ALL[id]}`}
                    className={styles.seeAll}
                >
                    {SEE_ALL_LABEL[id]}
                </Link>
            </div>
            {children}
        </section>
    );
}

/** Reserves the chapter's real height while its data streams in. */
export function ChapterSkeleton({
    id,
    name,
    height,
}: {
    id: ChapterId;
    name: string;
    height: number;
}) {
    return (
        <Chapter id={id} name={name}>
            <div className={styles.skeleton} style={{ height }} aria-hidden />
        </Chapter>
    );
}

export function ChapterError({ id, name }: { id: ChapterId; name: string }) {
    return (
        <Chapter id={id} name={name}>
            <p className={styles.muted}>
                Couldn't load {CHAPTER_TITLE[id].toLowerCase()}.
            </p>
        </Chapter>
    );
}
