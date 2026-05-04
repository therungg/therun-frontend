'use client';

import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from './commentary-drawer.module.scss';

export const SplitSelector = ({
    liveRun,
    selectedIndex,
    currentSplitIndex,
    followLive,
    onChange,
    onJumpToLive,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
    currentSplitIndex: number;
    followLive: boolean;
    onChange: (index: number) => void;
    onJumpToLive: () => void;
}) => {
    const total = liveRun.splits?.length ?? 0;
    const lastIndex = Math.max(0, total - 1);
    const split = liveRun.splits?.[selectedIndex];
    const title =
        selectedIndex >= total
            ? 'Run finished'
            : split?.name
              ? `Split ${selectedIndex + 1} — ${split.name}`
              : `Split ${selectedIndex + 1}`;

    const canPrev = selectedIndex > 0;
    const canNext = selectedIndex < lastIndex;

    return (
        <div className={styles.selector}>
            <button
                type="button"
                className={styles.selectorButton}
                disabled={!canPrev}
                onClick={() => canPrev && onChange(selectedIndex - 1)}
                aria-label="Previous split"
            >
                <ChevronLeft />
            </button>
            <div className={styles.selectorTitle}>{title}</div>
            <button
                type="button"
                className={styles.selectorButton}
                disabled={!canNext}
                onClick={() => canNext && onChange(selectedIndex + 1)}
                aria-label="Next split"
            >
                <ChevronRight />
            </button>
            {!followLive && selectedIndex !== currentSplitIndex && (
                <button
                    type="button"
                    className={styles.livePip}
                    onClick={onJumpToLive}
                    aria-label="Jump to live split"
                >
                    <span className={styles.livePipDot} />
                    Live
                </button>
            )}
        </div>
    );
};
