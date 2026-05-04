'use client';

import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { Twitch as TwitchIcon } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { useStory } from '~app/(new-layout)/live/stories/use-story';
import { SplitStory } from '~app/(new-layout)/live/story.types';
import styles from '../commentary-drawer.module.scss';

const rarityClass: Record<string, string> = {
    common: styles.rarityCommon,
    rare: styles.rarityRare,
    super: styles.raritySuper,
    ultra: styles.rarityUltra,
    ultimate: styles.rarityUltimate,
    secret: styles.raritySecret,
};

export const StoryTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const { story } = useStory(liveRun.user);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [selectedIndex, story?.stories?.length]);

    if (!story)
        return (
            <div className={styles.empty}>
                No story currently available. Stories only get generated when
                you have finished at least 3 runs, and started at least 20.
            </div>
        );

    const stories = story.stories ?? [];
    if (stories.length === 0) {
        return (
            <div className={styles.empty}>
                Story is loaded — waiting for the next split to add an entry.
            </div>
        );
    }

    return (
        <div ref={containerRef}>
            {stories.map((entry: SplitStory) => {
                const isActive = entry.splitIndex === selectedIndex;
                const selected = entry.storyElements.filter((e) => e.selected);
                if (selected.length === 0) return null;
                return (
                    <div
                        key={entry['startedAt#index']}
                        ref={isActive ? activeRef : undefined}
                        className={clsx(
                            styles.storyEntry,
                            isActive && styles.storyEntryActive,
                        )}
                    >
                        <div className={styles.storyHeader}>
                            <span>{entry.splitName}</span>
                            <span>#{entry.splitIndex + 1}</span>
                        </div>
                        {selected.map((el) => (
                            <div key={el.id}>
                                <span
                                    className={clsx(
                                        styles.rarityBadge,
                                        rarityClass[el.rarity] ??
                                            styles.rarityCommon,
                                    )}
                                >
                                    {el.rarity}
                                </span>{' '}
                                {el.text}{' '}
                                {el.wasSentToTwitch && (
                                    <TwitchIcon height={14} color="#6441a5" />
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};
