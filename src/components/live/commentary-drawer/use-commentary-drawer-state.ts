'use client';

import { useCallback, useEffect, useState } from 'react';

export type CommentaryTab = 'split' | 'run' | 'story' | 'career';

const TAB_KEY = 'commentary-drawer:tab';
const OPEN_KEY = 'commentary-drawer:open';
const PINNED_KEY = 'commentary-drawer:pinned';

const isTab = (v: unknown): v is CommentaryTab =>
    v === 'split' || v === 'run' || v === 'story' || v === 'career';

const readBool = (key: string, fallback: boolean): boolean => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
};

const writeBool = (key: string, value: boolean) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value ? '1' : '0');
};

export interface CommentaryDrawerState {
    open: boolean;
    pinned: boolean;
    pinnedUser: string | null;
    activeTab: CommentaryTab;
    selectedSplitIndex: number;
    followLive: boolean;
    setOpen: (open: boolean) => void;
    toggleOpen: () => void;
    setActiveTab: (tab: CommentaryTab) => void;
    setSelectedSplitIndex: (index: number) => void;
    jumpToLive: () => void;
    pinTo: (user: string) => void;
    unpin: () => void;
    resetForNewUser: (currentSplitIndex: number) => void;
}

export const useCommentaryDrawerState = (
    currentSplitIndex: number,
): CommentaryDrawerState => {
    const [open, setOpenState] = useState<boolean>(false);
    const [pinned, setPinned] = useState<boolean>(false);
    const [pinnedUser, setPinnedUser] = useState<string | null>(null);
    const [activeTab, setActiveTabState] = useState<CommentaryTab>('split');
    const [selectedSplitIndex, setSelectedSplitIndexState] =
        useState<number>(currentSplitIndex);
    const [followLive, setFollowLive] = useState<boolean>(true);

    // Hydrate from localStorage once on mount.
    useEffect(() => {
        setOpenState(readBool(OPEN_KEY, false));
        setPinned(readBool(PINNED_KEY, false));
        const rawTab = window.localStorage.getItem(TAB_KEY);
        if (isTab(rawTab)) setActiveTabState(rawTab);
    }, []);

    const setOpen = useCallback((next: boolean) => {
        setOpenState(next);
        writeBool(OPEN_KEY, next);
    }, []);

    const toggleOpen = useCallback(() => {
        setOpenState((prev) => {
            writeBool(OPEN_KEY, !prev);
            return !prev;
        });
    }, []);

    const setActiveTab = useCallback((tab: CommentaryTab) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(TAB_KEY, tab);
        }
    }, []);

    const setSelectedSplitIndex = useCallback((index: number) => {
        setSelectedSplitIndexState(index);
        setFollowLive(false);
    }, []);

    const jumpToLive = useCallback(() => {
        setSelectedSplitIndexState(currentSplitIndex);
        setFollowLive(true);
    }, [currentSplitIndex]);

    const pinTo = useCallback((user: string) => {
        setPinned(true);
        setPinnedUser(user);
        writeBool(PINNED_KEY, true);
    }, []);

    const unpin = useCallback(() => {
        setPinned(false);
        setPinnedUser(null);
        writeBool(PINNED_KEY, false);
    }, []);

    const resetForNewUser = useCallback((nextCurrentSplitIndex: number) => {
        setSelectedSplitIndexState(nextCurrentSplitIndex);
        setFollowLive(true);
    }, []);

    // Auto-follow live split unless user navigated away.
    useEffect(() => {
        if (followLive) {
            setSelectedSplitIndexState(currentSplitIndex);
        }
    }, [currentSplitIndex, followLive]);

    return {
        open,
        pinned,
        pinnedUser,
        activeTab,
        selectedSplitIndex,
        followLive,
        setOpen,
        toggleOpen,
        setActiveTab,
        setSelectedSplitIndex,
        jumpToLive,
        pinTo,
        unpin,
        resetForNewUser,
    };
};
