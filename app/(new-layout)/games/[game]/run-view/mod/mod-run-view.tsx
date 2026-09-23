'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';
import { toast } from 'react-toastify';
import type { HistoryEvent } from '../../../../../../types/moderation.types';
import { isTriageInert } from '../../manage/moderation/shared/triage-keyboard';
import { fireUndoToast } from '../../manage/moderation/shared/undo-toast';
import type { ModContext } from '../load-run-view';
import { RunView, type RunViewModel } from '../run-view';
import { DecisionBar } from './decision-bar';
import { RulesReview } from './rules-review';
import { RunFacts } from './run-facts';
import { RunnerReview } from './runner-review';
import { SplitsReview } from './splits-review';
import { useRunVerbs, type VerdictOutcome } from './use-run-verbs';
import { WhyHere } from './why-here';

export type ModRunViewProps = {
    mod: ModContext;
    position?: { index: number; total: number };
    onPrev?: () => void;
    onNext?: () => void;
    onClose?: () => void;
    /** Where a verdict goes. Without it the page toasts and refreshes. */
    onDecided?: (o: VerdictOutcome) => void;
    /** Where any other change goes. Without it the page refreshes. */
    onChanged?: () => void;
    onOpenRun?: (runId: number) => void;
    /**
     * Turns on the review keys (j/k next/previous, v Verify, r Reject) for
     * as long as it returns true — the host knows whether something sits on
     * top of the view. Keys never fire while typing or while a verb dialog
     * is open.
     */
    keysLive?: () => boolean;
};

/** The run page as a moderator sees it: the run view with the review layer. */
export function ModRunView({
    model,
    history,
    sessionUsername,
    mod,
    position,
    onPrev,
    onNext,
    onClose,
    onDecided,
    onChanged,
    onOpenRun,
    keysLive,
}: ModRunViewProps & {
    model: RunViewModel;
    history: HistoryEvent[];
    sessionUsername: string | null;
}) {
    const router = useRouter();
    const refresh = () => router.refresh();
    const changed = onChanged ?? refresh;
    const verbs = useRunVerbs({
        model,
        mod,
        onDone: (o) => {
            if (onDecided) {
                onDecided(o);
                return;
            }
            if (o.undo) fireUndoToast(o.message, o.undo, refresh);
            else toast.success(o.message);
            refresh();
        },
        onChanged: changed,
    });

    const onKey = useEffectEvent((e: KeyboardEvent) => {
        if (!keysLive || e.ctrlKey || e.metaKey || e.altKey || e.repeat) {
            return;
        }
        const active = document.activeElement as HTMLElement | null;
        const inert = isTriageInert({
            activeTag: active?.tagName ?? null,
            isContentEditable: active?.isContentEditable ?? false,
            dialogOpen: verbs.dialogOpen || verbs.busy || !keysLive(),
        });
        if (inert) return;
        const pending =
            verbs.state.status === 'pending' && !verbs.state.excluded;
        if (e.key === 'j' && onNext) onNext();
        else if (e.key === 'k' && onPrev) onPrev();
        else if (e.key === 'v' && pending) void verbs.verify();
        else if (e.key === 'r') void verbs.openReject();
        else return;
        e.preventDefault();
    });
    useEffect(() => {
        if (!keysLive) return;
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [keysLive]);

    return (
        <RunView
            model={model}
            history={history}
            sessionUsername={sessionUsername}
            isMod
            bar={
                <DecisionBar
                    model={model}
                    mod={mod}
                    verbs={verbs}
                    position={position}
                    onPrev={onPrev}
                    onNext={onNext}
                    onClose={onClose}
                />
            }
            top={<WhyHere model={model} review={mod.review} />}
            aside={<RunFacts model={model} mod={mod} onChanged={changed} />}
            belowMain={
                <>
                    <RunnerReview
                        model={model}
                        review={mod.review}
                        gameSlug={mod.sheet.gameSlug}
                        onOpenRun={onOpenRun}
                    />
                    <RulesReview model={model} mod={mod} />
                </>
            }
            splits={<SplitsReview model={model} />}
        />
    );
}
