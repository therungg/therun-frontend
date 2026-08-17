'use client';

import { useEffect, useState } from 'react';
import type { VodReview } from '../../../../../../types/leaderboards.types';
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
}: {
    url: string;
    target: VodReviewTarget;
    gameSlug: string;
    onSaved: () => void;
}) {
    const [state, setState] = useState<
        | { status: 'loading' }
        | { status: 'error'; error: string }
        | {
              status: 'ready';
              vodReview: VodReview | null;
              realTimeMs: number | null;
              timing: 'realtime' | 'gametime';
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
            }}
            onSaved={onSaved}
        />
    );
}
