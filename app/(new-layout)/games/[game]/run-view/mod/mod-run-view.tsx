'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { formatDuration } from '~src/lib/duration';
import type { HistoryEvent } from '../../../../../../types/moderation.types';
import type { WorklistEntry } from '../../../../../../types/worklist.types';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import { verbFromKey } from '../../manage/moderation/moderate/verbs';
import { isTriageInert } from '../../manage/moderation/shared/triage-keyboard';
import { fireUndoToast } from '../../manage/moderation/shared/undo-toast';
import type { ModContext } from '../load-run-view';
import { RunView, type RunViewModel } from '../run-view';
import { DecisionBar } from './decision-bar';
import barStyles from './decision-bar.module.scss';
import { HistoryReview } from './history-review';
import { MediaFoot, NoVideo } from './media-review';
import { RulesReview } from './rules-review';
import { RunFacts } from './run-facts';
import { headlineTimeOf, RunHeadline } from './run-headline';
import { RunTimeline } from './run-timeline';
import { isOwnRun } from './run-verb-model';
import { RunnerReview } from './runner-review';
import { SplitsReview } from './splits-review';
import { useRunVerbs, type VerdictOutcome } from './use-run-verbs';
import { WhyHere } from './why-here';

export type ModRunViewProps = {
    mod: ModContext;
    position?: { index: number; total: number };
    /** Names the list the position counts through, e.g. 'Queue'. */
    positionLabel?: string;
    onPrev?: () => void;
    onNext?: () => void;
    onClose?: () => void;
    /** Where a verdict goes. Without it the page toasts and refreshes. */
    onDecided?: (o: VerdictOutcome) => void;
    /** Where any other change goes. Without it the page refreshes. */
    onChanged?: () => void;
    onOpenRun?: (runId: number) => void;
    /**
     * Turns on the review keys (j/k next/previous and the shared verb keys:
     * v Verify, r Reject, w Ask for video, e Remove, b Ban, m Mark) for
     * as long as it returns true — the host knows whether something sits on
     * top of the view. Keys never fire while typing or while a verb dialog
     * is open.
     */
    keysLive?: () => boolean;
    /** Opens this step once, when the view first shows. */
    initialVerb?: 'reject';
    /** The queue's entry for this run, when opened from the queue: why it
     * is there, and whether it is the viewer's own. */
    queueEntry?: WorklistEntry | null;
};

/** The run page as a moderator sees it: the run view with the review layer. */
export function ModRunView({
    model,
    history,
    sessionUsername,
    mod,
    position,
    positionLabel,
    onPrev,
    onNext,
    onClose,
    onDecided,
    onChanged,
    onOpenRun,
    keysLive,
    initialVerb,
    queueEntry = null,
}: ModRunViewProps & {
    model: RunViewModel;
    history: HistoryEvent[];
    sessionUsername: string | null;
}) {
    const router = useRouter();
    const [rosterOpen, setRosterOpen] = useState(false);
    const refresh = () => router.refresh();
    const changed = onChanged ?? refresh;
    const isOwn = queueEntry?.isOwn ?? isOwnRun(model, sessionUsername);
    const verbs = useRunVerbs({
        model,
        mod,
        isOwn,
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
        onOpenRun,
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
        const verb = verbFromKey(e.key);
        if (e.key === 'j' && onNext) onNext();
        else if (e.key === 'k' && onPrev) onPrev();
        else if (verb === 'approve' && pending && isOwn)
            toast.info("You can't verify your own run.");
        else if (verb === 'approve' && pending) void verbs.verify();
        else if (verb === 'decline') void verbs.openReject();
        else if (verb === 'ask_video') void verbs.askVideo();
        else if (verb === 'remove') void verbs.openVerb('remove');
        else if (verb === 'ban') verbs.openRunner('ban');
        else if (verb === 'mark' && verbs.canMark && !verbs.state.marked)
            void verbs.toggleMark();
        else return;
        e.preventDefault();
    });
    // Keyed on whether keys are on at all, not the callback, so a new
    // `keysLive` each render never re-registers the listener.
    const keysOn = keysLive != null;
    useEffect(() => {
        if (!keysOn) return;
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [keysOn]);

    const openInitial = useEffectEvent(() => {
        if (initialVerb === 'reject') void verbs.openReject();
    });
    // Once per mount: the host keys this view by run, so a new run is a
    // new mount and a verb spent here is not replayed on reloads.
    useEffect(() => {
        openInitial();
    }, []);

    // Once the headline has scrolled up under the bar, the bar carries the
    // time and the runner, so the mod reading the rules or the timeline
    // further down still has the run they're judging in view.
    const [headline, setHeadline] = useState<HTMLElement | null>(null);
    const [headlineGone, setHeadlineGone] = useState(false);
    useEffect(() => {
        if (!headline) return;
        const io = new IntersectionObserver(
            ([e]) =>
                setHeadlineGone(
                    !e.isIntersecting &&
                        e.boundingClientRect.bottom <= (e.rootBounds?.top ?? 0),
                ),
            // The sticky bar covers the top of the view.
            { rootMargin: '-80px 0px 0px 0px' },
        );
        io.observe(headline);
        return () => io.disconnect();
    }, [headline]);
    const shown = headlineTimeOf(model, mod);
    const compact = headlineGone ? (
        <>
            <span className={barStyles.compactTime}>
                {shown.time != null ? formatDuration(shown.time) : '—'}
            </span>
            <RunnerAvatar
                name={model.runnerName}
                picture={model.picture}
                size="xs"
            />
            <span className={barStyles.compactName}>{model.runnerName}</span>
        </>
    ) : null;

    const timeline = mod.review?.timeline ?? [];

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
                    positionLabel={positionLabel}
                    onPrev={onPrev}
                    onNext={onNext}
                    onClose={onClose}
                    keys={keysLive != null}
                    compact={compact}
                />
            }
            top={<WhyHere model={model} entry={queueEntry} />}
            headline={
                <RunHeadline
                    ref={setHeadline}
                    model={model}
                    mod={mod}
                    newRunner={queueEntry?.newRunner === true}
                />
            }
            mediaFoot={<MediaFoot model={model} verbs={verbs} />}
            noMedia={<NoVideo model={model} mod={mod} onChanged={changed} />}
            footer={
                // An older review read has no timeline; the history list
                // stands in, as it does for manual times (no review at all).
                timeline.length > 0 ? (
                    <RunTimeline
                        timeline={timeline}
                        runnerName={model.runnerName}
                        variables={mod.sheet.variables}
                    />
                ) : (
                    <HistoryReview history={history} />
                )
            }
            aside={
                <RunFacts
                    model={model}
                    mod={mod}
                    onChanged={changed}
                    onRunners={() => setRosterOpen(true)}
                />
            }
            rosterOpen={rosterOpen}
            underMedia={
                <RunnerReview
                    model={model}
                    review={mod.review}
                    gameSlug={mod.sheet.gameSlug}
                    onOpenRun={onOpenRun}
                />
            }
            underAside={<RulesReview model={model} mod={mod} />}
            splits={<SplitsReview model={model} />}
        />
    );
}
