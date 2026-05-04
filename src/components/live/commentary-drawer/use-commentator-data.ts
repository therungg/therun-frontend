'use client';

import { useEffect, useState } from 'react';
import { Run } from '~src/common/types';
import { getAdvancedUserStats } from '~src/lib/get-advanced-user-stats';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getRun } from '~src/lib/get-run';

export interface CommentatorData {
    advanced: unknown | null;
    run: Run | null;
    profile: unknown | null;
}

export interface CommentatorDataState {
    data: CommentatorData;
    isLoading: boolean;
    error: string | null;
}

const EMPTY: CommentatorData = { advanced: null, run: null, profile: null };

export const useCommentatorData = (
    user: string | null,
    game: string | null,
    category: string | null,
): CommentatorDataState => {
    const [state, setState] = useState<CommentatorDataState>({
        data: EMPTY,
        isLoading: false,
        error: null,
    });

    useEffect(() => {
        if (!user || !game || !category) {
            setState({ data: EMPTY, isLoading: false, error: null });
            return;
        }
        let cancelled = false;
        setState((s) => ({ ...s, isLoading: true, error: null }));

        Promise.allSettled([
            getAdvancedUserStats(user, '0'),
            getRun(user, game, category),
            getGlobalUser(user),
        ])
            .then(([advancedResult, runResult, profileResult]) => {
                if (cancelled) return;
                const advanced =
                    advancedResult.status === 'fulfilled'
                        ? advancedResult.value
                        : null;
                const run =
                    runResult.status === 'fulfilled' ? runResult.value : null;
                const profile =
                    profileResult.status === 'fulfilled'
                        ? profileResult.value
                        : null;
                const allFailed =
                    advancedResult.status === 'rejected' &&
                    runResult.status === 'rejected' &&
                    profileResult.status === 'rejected';
                setState({
                    data: { advanced, run, profile },
                    isLoading: false,
                    error: allFailed ? 'Career data unavailable.' : null,
                });
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setState({
                    data: EMPTY,
                    isLoading: false,
                    error:
                        e instanceof Error
                            ? e.message
                            : 'Career data unavailable.',
                });
            });

        return () => {
            cancelled = true;
        };
    }, [user, game, category]);

    return state;
};
