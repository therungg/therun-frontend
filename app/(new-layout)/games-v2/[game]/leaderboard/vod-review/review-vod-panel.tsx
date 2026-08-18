'use client';

import { useEffect, useState } from 'react';
import type {
    RunSplit,
    VodReview,
    VodReviewPatch,
} from '../../../../../../types/leaderboards.types';
import {
    loadVodReviewAction,
    type VodReviewTarget,
} from '../actions/vod-review.action';
import styles from './vod-review.module.scss';
import { VodReviewWorkbench } from './vod-review-workbench';

export function ReviewVodPanel({
    url,
    target,
    gameSlug,
    onSaved,
    onChange,
}: {
    url: string;
    target: VodReviewTarget;
    gameSlug: string;
    onSaved: () => void;
    /** Live marker/retime state, for a summary rendered elsewhere (the
     *  drawer's "reviewing" card while the workbench lives in the pane). */
    onChange?: (patch: VodReviewPatch | null) => void;
}) {
    const [state, setState] = useState<
        | { status: 'loading' }
        | { status: 'error'; error: string }
        | {
              status: 'ready';
              vodReview: VodReview | null;
              realTimeMs: number | null;
              timing: 'realtime' | 'gametime';
              splits: RunSplit[];
          }
    >({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;
        loadVodReviewAction(target).then((res) => {
            if (cancelled) return;
            setState(
                'error' in res
                    ? { status: 'error', error: res.error }
                    : {
                          status: 'ready',
                          vodReview: res.vodReview,
                          realTimeMs: res.realTimeMs,
                          timing: res.timing,
                          splits: res.splits,
                      },
            );
        });
        return () => {
            cancelled = true;
        };
        // target identity: kind + id
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        target.kind,
        target.kind === 'run' ? target.runId : target.manualTimeId,
    ]);

    if (state.status === 'loading')
        return <p className={styles.note}>Loading markers…</p>;
    if (state.status === 'error')
        return <p className="text-danger small">{state.error}</p>;
    return (
        <VodReviewWorkbench
            mode="mod"
            url={url}
            target={target}
            gameSlug={gameSlug}
            initial={{
                fps: state.vodReview?.fps ?? 60,
                markers: state.vodReview?.mod?.markers ?? [],
                runnerMarkers: state.vodReview?.runner?.markers,
                realTimeMs: state.realTimeMs,
                timing: state.timing,
                splits: state.splits,
            }}
            onSaved={onSaved}
            onChange={onChange}
        />
    );
}
