'use client';

import clsx from 'clsx';
import { Twitch as TwitchIcon } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { StoryElementWithSelected } from '~app/(new-layout)/live/story.types';
import styles from '../commentary-drawer.module.scss';
import type { StoryCandidatesState } from '../use-story-candidates';

const TOP_PER_CATEGORY = 3;

const scoreOf = (el: StoryElementWithSelected): number =>
    el.finalScore ?? el.engagementScore ?? el.runRelevancyScore ?? 0;

const byScoreDesc = (
    a: StoryElementWithSelected,
    b: StoryElementWithSelected,
) => scoreOf(b) - scoreOf(a);

const ContextHeader = ({
    label,
    splitName,
    tone,
}: {
    label: string;
    splitName: string;
    tone: 'after' | 'next';
}) => (
    <div className={styles.storyContext}>
        <span
            className={clsx(
                styles.storyContextLabel,
                tone === 'after' && styles.storyContextLabelAfter,
                tone === 'next' && styles.storyContextLabelNext,
            )}
        >
            {label}
        </span>
        <span className={styles.storyContextSplit}>{splitName}</span>
    </div>
);

const StoryLine = ({ el }: { el: StoryElementWithSelected }) => (
    <div className={styles.storyLine}>
        <span className={styles.storyLineText}>{el.text}</span>
        {el.wasSentToTwitch && (
            <span className={styles.storyLineChat}>
                <TwitchIcon height={11} color="#6441a5" /> chat
            </span>
        )}
    </div>
);

export const StoryTab = ({
    liveRun,
    selectedIndex,
    storyState,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
    storyState: StoryCandidatesState;
}) => {
    const { story, isLoading, error } = storyState;

    if (isLoading) return <div className={styles.empty}>Loading story…</div>;
    if (error) return <div className={styles.empty}>Could not load story.</div>;

    if (!story) {
        return (
            <div className={styles.empty}>
                No story currently available. Stories only get generated when
                you have finished at least 3 runs, and started at least 20.
            </div>
        );
    }

    const total = liveRun.splits?.length ?? 0;
    const current = liveRun.currentSplitIndex;

    // Aggregate generics across all entries; dedupe by id keeping the
    // highest-scoring instance.
    const stories = story.stories ?? [];
    const genericById = new Map<string, StoryElementWithSelected>();
    for (const entry of stories) {
        for (const el of entry.storyElements ?? []) {
            if (el.category !== 'generic') continue;
            const existing = genericById.get(el.id);
            if (!existing || scoreOf(el) > scoreOf(existing)) {
                genericById.set(el.id, el);
            }
        }
    }
    const generics = Array.from(genericById.values()).sort(byScoreDesc);

    const splitName =
        liveRun.splits?.[selectedIndex]?.name ?? `Split ${selectedIndex + 1}`;
    const nextSplitName =
        liveRun.splits?.[selectedIndex + 1]?.name ??
        `Split ${selectedIndex + 2}`;

    const beyondLive = selectedIndex >= current;
    const finished = selectedIndex >= total;

    const entryForSplit =
        !beyondLive && !finished
            ? (stories.find((s) => s.splitIndex === selectedIndex + 1) ??
              stories.find((s) => s.splitIndex === selectedIndex))
            : null;

    const previousTop = entryForSplit
        ? (entryForSplit.storyElements ?? [])
              .filter((e) => e.category === 'previous')
              .sort(byScoreDesc)
              .slice(0, TOP_PER_CATEGORY)
        : [];
    const nextTop = entryForSplit
        ? (entryForSplit.storyElements ?? [])
              .filter((e) => e.category === 'next')
              .sort(byScoreDesc)
              .slice(0, TOP_PER_CATEGORY)
        : [];

    const splitHasContent = previousTop.length > 0 || nextTop.length > 0;

    return (
        <>
            {finished && (
                <div className={styles.empty}>
                    Run finished — scrub to a previous split to read its story.
                </div>
            )}

            {beyondLive && !finished && (
                <div className={styles.empty}>
                    {selectedIndex === current
                        ? 'Story will appear once this split completes.'
                        : "Hasn't happened yet — no story to read."}
                </div>
            )}

            {!beyondLive && !finished && previousTop.length > 0 && (
                <div className={styles.storyLines}>
                    <ContextHeader
                        label="After"
                        splitName={splitName}
                        tone="after"
                    />
                    {previousTop.map((el) => (
                        <StoryLine key={el.id} el={el} />
                    ))}
                </div>
            )}

            {!beyondLive && !finished && nextTop.length > 0 && (
                <div className={styles.storyLines}>
                    <ContextHeader
                        label="Next"
                        splitName={nextSplitName}
                        tone="next"
                    />
                    {nextTop.map((el) => (
                        <StoryLine key={el.id} el={el} />
                    ))}
                </div>
            )}

            {!beyondLive && !finished && !splitHasContent && (
                <div className={styles.empty}>
                    No split-specific story for this split.
                </div>
            )}

            {generics.length > 0 && (
                <div className={styles.runWideSection}>
                    <div className={styles.runWideTitle}>Run-wide notes</div>
                    <ul className={styles.runWideList}>
                        {generics.map((el) => (
                            <li key={el.id} className={styles.runWideItem}>
                                <span className={styles.runWideBullet}>·</span>
                                <span className={styles.runWideItemText}>
                                    {el.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
};
