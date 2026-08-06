'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { consoleLocationForStep } from '~src/lib/console/vocabulary';
import { boardPulse } from '~src/lib/setup/board-pulse';
import type { SetupStepId } from '~src/lib/setup/completeness';
import {
    resolveSetupStep,
    SETUP_STEPS,
    setupStepIndex,
    setupStepMeta,
} from '~src/lib/setup/steps';
import { BackLink } from '../shared/back-link';
import styles from './setup.module.scss';
import { SetupRail } from './setup-rail';
import { StepBoards } from './steps/step-boards';
import { StepCategories } from './steps/step-categories';
import { StepCategorySetup } from './steps/step-category-setup';
import { StepDetails } from './steps/step-details';
import { StepGroups } from './steps/step-groups';
import type { WizardData } from './types';

interface Props {
    data: WizardData;
    initialStep: SetupStepId;
}

export function WizardShell({ data, initialStep }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    // `resolveSetupStep` folds the retired seven-step ids onto their
    // successors, so an old bookmark still lands somewhere real. It does not
    // rewrite the URL: `?step=exceptions&cat=12` keeps its `cat`, which the
    // per-category step reads to open that category straight away.
    const step: SetupStepId =
        resolveSetupStep(searchParams.get('step')) ?? initialStep;
    const stepIndex = setupStepIndex(step);
    // What the board already has on it, so setup doesn't read like work on a
    // dead page. Empty on a board with nothing yet — see board-pulse.ts.
    const pulse = boardPulse(data.stats);
    // The URL identifier under the title — the explicit slug, or the derived
    // name it falls back to. Hidden when it only restates the display name.
    const slug = data.identifiers.slug ?? data.game.name;
    const slugLine =
        slug && slug.toLowerCase() !== data.game.display.toLowerCase()
            ? slug
            : null;

    const goTo = (id: SetupStepId) => {
        // Keep the URL shareable/resumable and re-read server state so a step
        // always sees writes committed by previous steps (or by co-mods).
        router.replace(
            `/games-v2/${encodeURIComponent(data.game.name)}/setup?step=${id}`,
            {
                scroll: true,
            },
        );
        router.refresh();
    };

    const onAdvance = () => {
        const next = SETUP_STEPS[stepIndex + 1];
        if (next) goTo(next.id);
    };
    const onBack = () => {
        const prev = SETUP_STEPS[stepIndex - 1];
        if (prev) goTo(prev.id);
    };

    return (
        <div
            className={`${styles.page} ${
                setupStepMeta(step).wide ? styles.pageWide : ''
            }`}
        >
            <header className={styles.identityStrip}>
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt=""
                        width={48}
                        height={64}
                        className={styles.identityCover}
                    />
                )}
                <div className={styles.identityHead}>
                    <span className={styles.eyebrow}>Board setup</span>
                    <span className={styles.identityTitle}>
                        {data.game.display}
                    </span>
                    {slugLine && (
                        <span className={styles.identitySlug}>{slugLine}</span>
                    )}
                </div>
                {pulse.length > 0 && (
                    <div className={styles.identityStats}>
                        {pulse.map((stat) => (
                            <span
                                key={stat.label}
                                className={styles.identityStat}
                            >
                                <span className={styles.identityStatValue}>
                                    {stat.value}
                                </span>
                                <span className={styles.identityStatLabel}>
                                    {stat.label}
                                </span>
                            </span>
                        ))}
                    </div>
                )}
                <BackLink
                    href={`/games-v2/${encodeURIComponent(data.game.name)}/manage`}
                    label="Back to console"
                    className={styles.identityBack}
                />
            </header>

            <SetupRail
                steps={data.completeness.steps}
                active={step}
                doneCount={data.completeness.doneCount}
                totalCount={data.completeness.totalCount}
                onSelect={goTo}
            />

            <main
                // 'details' | 'categories' | 'groups' remount on every fresh
                // server read (key includes renderedAt): those steps seed
                // their local state straight from `data` props each time and
                // WANT a clean slate whenever an updateTag/router.refresh()
                // lands (e.g. after a save), so stale local state can't hide
                // behind fresher server data.
                //
                // 'category-setup' and 'boards' key on `step` alone, with no
                // renderedAt: they own long-lived interactive state (an open
                // variable form, BoardCuration's
                // pendingRemovals/selectedRunIds/reorder mode, the
                // per-category hub editor's open panel) that flows in via
                // props or self-refreshes through actions, not by re-seeding
                // from scratch. Every updateTag call made in service of
                // read-your-writes (item 1/2 above) also bumps
                // `data.renderedAt` on the next router.refresh(), so keying
                // these on renderedAt too would remount — and silently wipe —
                // that state on every single mutation inside them, which is
                // most of what they do.
                key={
                    step === 'category-setup' || step === 'boards'
                        ? step
                        : `${step}-${data.renderedAt}`
                }
                className={styles.stepBody}
            >
                <CurrentStep
                    step={step}
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
                <ConsoleWayfinding step={step} gameSlug={data.game.name} />
                <div className={styles.navBar}>
                    {stepIndex > 0 && (
                        <button
                            type="button"
                            className={styles.backAction}
                            onClick={onBack}
                        >
                            Back
                        </button>
                    )}
                    <span className={styles.spacer} />
                    {SETUP_STEPS[stepIndex].skippable &&
                        SETUP_STEPS[stepIndex + 1] && (
                            <button
                                type="button"
                                className={styles.skipAction}
                                onClick={onAdvance}
                            >
                                Go to {SETUP_STEPS[stepIndex + 1].label} →
                            </button>
                        )}
                </div>
            </main>
        </div>
    );
}

function CurrentStep({
    step,
    data,
    onAdvance,
    onBack,
}: {
    step: SetupStepId;
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
}) {
    switch (step) {
        case 'details':
            return (
                <StepDetails
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'categories':
            return (
                <StepCategories
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'groups':
            return (
                <StepGroups data={data} onAdvance={onAdvance} onBack={onBack} />
            );
        case 'category-setup':
            return (
                <StepCategorySetup
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'boards':
            return (
                <StepBoards data={data} onAdvance={onAdvance} onBack={onBack} />
            );
    }
}

/**
 * Teaches the console while the mod is still in the relevant context: every
 * step says where its work lives once setup is done. Answers the audit's §D2
 * ("nothing maps wizard -> console") without a separate tour.
 */
function ConsoleWayfinding({
    step,
    gameSlug,
}: {
    step: SetupStepId;
    gameSlug: string;
}) {
    const location = consoleLocationForStep(step);
    if (!location) return null;
    return (
        <p className={styles.wayfinding}>
            After setup this lives in the console under{' '}
            <Link
                href={`/games-v2/${encodeURIComponent(gameSlug)}/manage?pane=${location.pane}`}
            >
                {location.crumb}
            </Link>
            .
        </p>
    );
}
