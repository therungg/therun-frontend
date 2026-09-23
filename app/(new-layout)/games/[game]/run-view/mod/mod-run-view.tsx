'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { HistoryEvent } from '../../../../../../types/moderation.types';
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
    onOpenRun?: (runId: number) => void;
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
    onOpenRun,
}: ModRunViewProps & {
    model: RunViewModel;
    history: HistoryEvent[];
    sessionUsername: string | null;
}) {
    const router = useRouter();
    const refresh = () => router.refresh();
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
        onChanged: refresh,
    });

    return (
        <RunView
            model={model}
            history={history}
            sessionUsername={sessionUsername}
            isMod
            top={
                <>
                    <DecisionBar
                        model={model}
                        mod={mod}
                        verbs={verbs}
                        position={position}
                        onPrev={onPrev}
                        onNext={onNext}
                        onClose={onClose}
                    />
                    <WhyHere model={model} review={mod.review} />
                </>
            }
            asideTop={<RunFacts model={model} mod={mod} onChanged={refresh} />}
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
