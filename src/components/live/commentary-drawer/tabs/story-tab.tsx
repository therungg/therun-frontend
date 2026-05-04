'use client';

import clsx from 'clsx';
import { Twitch as TwitchIcon } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { useStory } from '~app/(new-layout)/live/stories/use-story';
import { StoryElementWithSelected } from '~app/(new-layout)/live/story.types';
import styles from '../commentary-drawer.module.scss';

const rarityClass: Record<string, string> = {
    common: styles.rarityCommon,
    rare: styles.rarityRare,
    super: styles.raritySuper,
    ultra: styles.rarityUltra,
    ultimate: styles.rarityUltimate,
    secret: styles.raritySecret,
};

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
        <div className={styles.storyItemHeader}>
            <span
                className={clsx(
                    styles.rarityBadge,
                    rarityClass[el.rarity] ?? styles.rarityCommon,
                )}
            >
                {el.rarity}
            </span>
            {el.category && (
                <span className={styles.storyTypeBadge}>{el.category}</span>
            )}
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
            <span className={styles.storyItemHeaderSpacer} />
            {(el.finalScore != null || el.engagementScore != null) && (
                <span className={styles.storyScore} title="Story rank score">
                    {el.finalScore != null
                        ? Math.round(el.finalScore)
                        : el.engagementScore}
                </span>
            )}
        </div>
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
    const { story } = useStory(liveRun.user);

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

    if (selectedIndex >= total) {
        return (
            <div className={styles.empty}>
                Run finished — scrub to a previous split to read its story.
            </div>
        );
    }

    if (selectedIndex >= current) {
        return (
            <div className={styles.empty}>
                {selectedIndex === current
                    ? 'Story will appear once this split completes.'
                    : "Hasn't happened yet — no story to read."}
            </div>
        );
    }

    const stories = story.stories ?? [];
    // The story that fired when the runner crossed INTO `selectedIndex + 1`
    // describes what just happened on `selectedIndex`. The backend stamps it
    // with that newly-entered split's index, so look one ahead.
    const entry =
        stories.find((s) => s.splitIndex === selectedIndex + 1) ??
        stories.find((s) => s.splitIndex === selectedIndex);

    if (!entry) {
        return (
            <div className={styles.empty}>
                No story entry generated for this split.
            </div>
        );
    }

    const elements = entry.storyElements ?? [];
    const featured = elements.filter((e) => e.selected);
    const candidates = elements.filter((e) => !e.selected);

    const splitName =
        liveRun.splits?.[selectedIndex]?.name ?? `Split ${selectedIndex + 1}`;

    return (
        <>
            <div className={styles.sectionTitle}>
                After split {selectedIndex + 1} — {splitName}
            </div>

            {featured.length > 0 ? (
                <div className={styles.storyFeaturedWrap}>
                    {featured.map((el) => (
                        <StoryItem key={el.id} el={el} featured />
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    No element was picked for this split.
                </div>
            )}

            {candidates.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>
                        Other candidates ({candidates.length})
                    </div>
                    <div className={styles.storyFeaturedWrap}>
                        {candidates.map((el) => (
                            <StoryItem key={el.id} el={el} featured={false} />
                        ))}
                    </div>
                </>
            )}
        </>
    );
};
