'use client';

import clsx from 'clsx';
import { Twitch as TwitchIcon } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { StoryElementWithSelected } from '~app/(new-layout)/live/story.types';
import styles from '../commentary-drawer.module.scss';
import { useStoryCandidates } from '../use-story-candidates';

const TOP_PER_CATEGORY = 3;

const scoreOf = (el: StoryElementWithSelected): number =>
    el.finalScore ?? el.engagementScore ?? el.runRelevancyScore ?? 0;

const byScoreDesc = (
    a: StoryElementWithSelected,
    b: StoryElementWithSelected,
) => scoreOf(b) - scoreOf(a);

const StoryItem = ({
    el,
    featured,
}: {
    el: StoryElementWithSelected;
    featured: boolean;
}) => (
    <div
        className={clsx(
            styles.storyItem,
            featured && styles.storyItemFeatured,
            !featured && styles.storyItemMuted,
        )}
    >
        {(el.wasSentToTwitch || (!featured && el.declinedReason)) && (
            <div className={styles.storyItemHeader}>
                {el.wasSentToTwitch && (
                    <span className={styles.storyTwitchTag}>
                        <TwitchIcon height={12} color="#6441a5" /> Sent to chat
                    </span>
                )}
                {!featured && el.declinedReason && (
                    <span className={styles.storyDeclinedTag}>
                        {el.declinedReason}
                    </span>
                )}
            </div>
        )}
        <div
            className={clsx(
                styles.storyItemText,
                !featured && styles.storyItemTextMuted,
            )}
        >
            {el.text}
        </div>
    </div>
);

export const StoryTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const { story, isLoading, error } = useStoryCandidates(liveRun.user);

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

    // Aggregate generics across the entire story; dedupe by id keeping the
    // highest-scoring instance. These describe the run/runner overall and
    // don't depend on which split is selected, so we compute them upfront.
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

    // Selected-split-specific entries.
    const splitName =
        liveRun.splits?.[selectedIndex]?.name ?? `Split ${selectedIndex + 1}`;
    const nextSplitName = liveRun.splits?.[selectedIndex + 1]?.name;

    const beyondLive = selectedIndex >= current;
    const finished = selectedIndex >= total;

    // The entry stamped with splitIndex = N+1 describes what happened on N
    // (its "previous" elements) and what's coming on N+1 (its "next"
    // elements). We look one ahead, falling back to the entry for N itself.
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

    const splitHasContent =
        entryForSplit != null && (previousTop.length > 0 || nextTop.length > 0);

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

            {!beyondLive && !finished && splitHasContent && (
                <>
                    {previousTop.length > 0 && (
                        <>
                            <div className={styles.sectionTitle}>
                                After split {selectedIndex + 1} — {splitName}
                            </div>
                            <div className={styles.storyFeaturedWrap}>
                                {previousTop.map((el) => (
                                    <StoryItem
                                        key={el.id}
                                        el={el}
                                        featured={el.selected}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {nextTop.length > 0 && (
                        <>
                            <div className={styles.sectionTitle}>
                                Heading into split {selectedIndex + 2}
                                {nextSplitName ? ` — ${nextSplitName}` : ''}
                            </div>
                            <div className={styles.storyFeaturedWrap}>
                                {nextTop.map((el) => (
                                    <StoryItem
                                        key={el.id}
                                        el={el}
                                        featured={el.selected}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            {!beyondLive && !finished && !splitHasContent && (
                <div className={styles.empty}>
                    No split-specific story for this split.
                </div>
            )}

            {generics.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>Run-wide notes</div>
                    <div className={styles.storyFeaturedWrap}>
                        {generics.map((el) => (
                            <StoryItem
                                key={el.id}
                                el={el}
                                featured={el.selected}
                            />
                        ))}
                    </div>
                </>
            )}
        </>
    );
};
