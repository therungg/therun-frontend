'use client';

import clsx from 'clsx';
import NextImage from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PinAngle, PinAngleFill, X as XIcon } from 'react-bootstrap-icons';
import { createPortal } from 'react-dom';
import { LiveDataMap, LiveRun } from '~app/(new-layout)/live/live.types';
import styles from './commentary-drawer.module.scss';
import { useCommentaryDrawerContext } from './commentary-drawer-context';
import { SplitSelector } from './split-selector';
import { CareerTab } from './tabs/career-tab';
import { PredictionsTab } from './tabs/predictions-tab';
import { RunTab } from './tabs/run-tab';
import { SplitTab } from './tabs/split-tab';
import { StoryTab } from './tabs/story-tab';
import {
    CommentaryTab,
    useCommentaryDrawerState,
} from './use-commentary-drawer-state';
import { useStoryCandidates } from './use-story-candidates';

const TABS: { key: CommentaryTab; label: string }[] = [
    { key: 'split', label: 'Split' },
    { key: 'run', label: 'Run' },
    { key: 'predictions', label: 'Predictions' },
    { key: 'story', label: 'Story' },
    { key: 'career', label: 'Career' },
];

export const CommentaryDrawer = ({
    liveDataMap,
    currentlyViewing,
    manualSelectionTick = 0,
}: {
    liveDataMap: LiveDataMap;
    currentlyViewing: string;
    manualSelectionTick?: number;
}) => {
    const ctx = useCommentaryDrawerContext();

    const followingUser = currentlyViewing;
    const followingRun: LiveRun | undefined = liveDataMap[followingUser];
    const followingCurrentSplitIndex = followingRun?.currentSplitIndex ?? 0;

    const state = useCommentaryDrawerState(followingCurrentSplitIndex);

    // Sync persistent open state ↔ context.
    useEffect(() => {
        if (state.open !== ctx.open) ctx.setOpen(state.open);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.open]);
    useEffect(() => {
        if (ctx.open !== state.open) state.setOpen(ctx.open);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx.open]);

    // While the drawer is open, lock to whoever we were following when it
    // opened — commentators don't want their panel to swap runners just
    // because the live page auto-swaps off a stale run. Manual clicks on a
    // different run still update the lock (tick bump from the parent), and an
    // explicit pin still wins (so cross-reload pinning works as before).
    const [lockedUser, setLockedUser] = useState<string | null>(null);
    useEffect(() => {
        if (state.open) {
            setLockedUser((prev) => prev ?? followingUser);
        } else {
            setLockedUser(null);
        }
    }, [state.open, followingUser]);

    const lastManualTickRef = useRef(manualSelectionTick);
    useEffect(() => {
        if (manualSelectionTick === lastManualTickRef.current) return;
        lastManualTickRef.current = manualSelectionTick;
        if (state.open) setLockedUser(followingUser);
    }, [manualSelectionTick, state.open, followingUser]);

    const displayedUser =
        state.pinned && state.pinnedUser
            ? state.pinnedUser
            : (lockedUser ?? followingUser);
    const rawRun: LiveRun | undefined = liveDataMap[displayedUser];

    // The drawer freezes the run snapshot when the runner starts a *new* run
    // (different `startedAt`). Commentators opt-in to load the new data via a
    // banner button. In-run updates (same startedAt) flow through unchanged.
    const [snapshotRun, setSnapshotRun] = useState<LiveRun | undefined>(rawRun);
    const [pendingNewRun, setPendingNewRun] = useState<LiveRun | null>(null);

    useEffect(() => {
        if (!rawRun) {
            setSnapshotRun(undefined);
            setPendingNewRun(null);
            return;
        }
        if (!snapshotRun) {
            setSnapshotRun(rawRun);
            setPendingNewRun(null);
            return;
        }
        if (snapshotRun.user !== rawRun.user) {
            setSnapshotRun(rawRun);
            setPendingNewRun(null);
            return;
        }
        if (snapshotRun.startedAt !== rawRun.startedAt) {
            setPendingNewRun(rawRun);
            return;
        }
        setSnapshotRun(rawRun);
    }, [rawRun, snapshotRun]);

    const liveRun: LiveRun | undefined = snapshotRun;

    // Stories fetch lives at the shell so the no-data banner can show
    // outside the Story tab. The Story tab consumes the same state via prop.
    const storyState = useStoryCandidates(displayedUser);
    const hasInsufficientData =
        !storyState.isLoading && !storyState.error && !storyState.story;

    // Reset selected split when displayed user changes (only when not pinned;
    // pinned drawer keeps its own navigation since the user isn't switching).
    const [lastDisplayedUser, setLastDisplayedUser] = useState(displayedUser);
    useEffect(() => {
        if (displayedUser !== lastDisplayedUser) {
            setLastDisplayedUser(displayedUser);
            state.resetForNewUser(liveRun?.currentSplitIndex ?? 0);
        }
    }, [displayedUser, lastDisplayedUser, liveRun?.currentSplitIndex, state]);

    const close = useCallback(() => ctx.setOpen(false), [ctx]);

    const acceptNewRun = useCallback(() => {
        if (!pendingNewRun) return;
        const idx = pendingNewRun.currentSplitIndex ?? 0;
        setSnapshotRun(pendingNewRun);
        setPendingNewRun(null);
        state.resetForNewUser(idx);
    }, [pendingNewRun, state]);

    // Esc and arrow-key handlers — only when drawer is open.
    useEffect(() => {
        if (!state.open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                close();
                return;
            }
            const target = e.target as HTMLElement | null;
            const inField =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);
            if (inField) return;
            if (!liveRun) return;
            const total = liveRun.splits?.length ?? 0;
            if (e.key === 'ArrowLeft' && state.selectedSplitIndex > 0) {
                state.setSelectedSplitIndex(state.selectedSplitIndex - 1);
            } else if (
                e.key === 'ArrowRight' &&
                state.selectedSplitIndex < Math.max(0, total - 1)
            ) {
                state.setSelectedSplitIndex(state.selectedSplitIndex + 1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [state.open, state.selectedSplitIndex, liveRun, close, state]);

    // Don't render before mount (portal target unavailable on SSR).
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const togglePin = () => {
        if (state.pinned) {
            state.unpin();
        } else {
            state.pinTo(displayedUser);
        }
    };

    const drawer = (
        <div className={styles.backdrop}>
            <aside
                className={clsx(styles.drawer, state.open && styles.drawerOpen)}
                role="dialog"
                aria-label="Commentary drawer"
            >
                <div className={styles.header}>
                    {liveRun?.picture && liveRun.picture !== 'noimage' && (
                        <div
                            style={{
                                position: 'relative',
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}
                        >
                            <NextImage
                                src={liveRun.picture}
                                alt=""
                                fill
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                    )}
                    <div className={styles.runnerMeta}>
                        <div className={styles.runnerName}>
                            {liveRun?.user ?? displayedUser}
                        </div>
                        <div className={styles.runnerGame}>
                            {liveRun
                                ? `${liveRun.game} · ${liveRun.category}`
                                : 'Run ended'}
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.headerButton}
                        onClick={togglePin}
                        aria-label={state.pinned ? 'Unpin' : 'Pin to this run'}
                        title={state.pinned ? 'Unpin' : 'Pin to this run'}
                    >
                        {state.pinned ? <PinAngleFill /> : <PinAngle />}
                    </button>
                    <button
                        type="button"
                        className={styles.headerButton}
                        onClick={close}
                        aria-label="Close commentary"
                    >
                        <XIcon />
                    </button>
                </div>

                {liveRun ? (
                    <>
                        {pendingNewRun && (
                            <div className={styles.newRunBanner}>
                                <div className={styles.newRunBannerText}>
                                    <span className={styles.newRunBannerTitle}>
                                        New run started
                                    </span>
                                    <span className={styles.newRunBannerSub}>
                                        Showing previous run — click to load
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className={styles.newRunBannerButton}
                                    onClick={acceptNewRun}
                                >
                                    Load new run
                                </button>
                            </div>
                        )}
                        <SplitSelector
                            liveRun={liveRun}
                            selectedIndex={state.selectedSplitIndex}
                            currentSplitIndex={liveRun.currentSplitIndex}
                            followLive={state.followLive}
                            onChange={state.setSelectedSplitIndex}
                            onJumpToLive={state.jumpToLive}
                        />
                        {hasInsufficientData && (
                            <div className={styles.runnerThinNotice}>
                                <span className={styles.runnerThinNoticeTitle}>
                                    Limited data
                                </span>
                                Not enough run history yet for full commentary.
                                This runner needs at least 20 started runs and 3
                                finished runs of this category before stories
                                and trend data appear.
                            </div>
                        )}
                        <div className={styles.tabs} role="tablist">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={state.activeTab === t.key}
                                    className={clsx(
                                        styles.tab,
                                        state.activeTab === t.key &&
                                            styles.tabActive,
                                    )}
                                    onClick={() => state.setActiveTab(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className={styles.tabContent}>
                            {state.activeTab === 'split' && (
                                <SplitTab
                                    liveRun={liveRun}
                                    selectedIndex={state.selectedSplitIndex}
                                />
                            )}
                            {state.activeTab === 'run' && (
                                <RunTab
                                    liveRun={liveRun}
                                    selectedIndex={state.selectedSplitIndex}
                                />
                            )}
                            {state.activeTab === 'predictions' && (
                                <PredictionsTab liveRun={liveRun} />
                            )}
                            {state.activeTab === 'story' && (
                                <StoryTab
                                    liveRun={liveRun}
                                    selectedIndex={state.selectedSplitIndex}
                                    storyState={storyState}
                                />
                            )}
                            {state.activeTab === 'career' && (
                                <CareerTab liveRun={liveRun} />
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.tabContent}>
                        <div className={styles.empty}>
                            Run ended.{' '}
                            {state.pinned && (
                                <button
                                    type="button"
                                    className={styles.headerButton}
                                    onClick={state.unpin}
                                >
                                    Unpin
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );

    return createPortal(drawer, document.body);
};
