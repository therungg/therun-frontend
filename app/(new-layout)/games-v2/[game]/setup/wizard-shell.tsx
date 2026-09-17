'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from '~src/components/link';
import { consoleLocationForStep } from '~src/lib/console/vocabulary';
import { boardPulse } from '~src/lib/setup/board-pulse';
import type { SetupStepId } from '~src/lib/setup/completeness';
import {
    adjacentLocation,
    locationLabel,
    resolveSetupLocation,
    type SetupLocation,
    setupHref,
    setupStepMeta,
    withCategoryDeepLink,
} from '~src/lib/setup/steps';
import type { WorkspaceSubId } from '~src/lib/setup/workspace';
import { BackLink } from '../shared/back-link';
import styles from './setup.module.scss';
import { SetupRail } from './setup-rail';
import { StepBoards } from './steps/step-boards';
import { StepDetails } from './steps/step-details';
import { StepImport } from './steps/step-import';
import { StepMatchRunners } from './steps/step-match-runners';
import { StepTheme } from './steps/step-theme';
import { StepVerification } from './steps/step-verification';
import { StepWorkspace } from './steps/step-workspace';
import type { WizardData } from './types';

interface Props {
    data: WizardData;
    initialLocation: SetupLocation;
}

export function WizardShell({ data, initialLocation }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Retired step ids fold onto their successors and `?cat=` onto the
    // Settings screen of its kind. The URL is not rewritten: `cat` stays, and
    // the Settings screen reads it to open that category's rules.
    const location: SetupLocation =
        withCategoryDeepLink(
            resolveSetupLocation(
                searchParams.get('step'),
                searchParams.get('sub'),
            ),
            Number(searchParams.get('cat')) || null,
            data.categories,
            data.groups,
        ) ?? initialLocation;
    const { step, sub } = location;

    // A bare /setup lands on the first unfinished screen, but that answer
    // moves as the moderator works: every write re-renders the page with a
    // fresh `initialLocation`. Write the landing spot into the URL once, so a
    // later write can't move them to another screen mid-edit.
    const pinned = useRef(false);
    useEffect(() => {
        if (pinned.current) return;
        pinned.current = true;
        if (searchParams.get('step')) return;
        const cat = searchParams.get('cat');
        router.replace(
            setupHref(
                data.game.name,
                initialLocation,
                cat ? { cat } : undefined,
            ),
            { scroll: false },
        );
    }, [data.game.name, initialLocation, router, searchParams]);
    const meta = setupStepMeta(step);
    const next = adjacentLocation(location, 1);
    const prev = adjacentLocation(location, -1);
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

    const goTo = (target: SetupLocation) => {
        // Keep the URL shareable/resumable and re-read server state so a step
        // always sees writes committed by previous steps (or by co-mods).
        router.replace(setupHref(data.game.name, target), { scroll: true });
        router.refresh();
    };

    const onAdvance = () => {
        if (next) goTo(next);
    };
    const onBack = () => {
        if (prev) goTo(prev);
    };

    return (
        <div className={`${styles.page} ${meta.wide ? styles.pageWide : ''}`}>
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
                active={location}
                doneCount={data.completeness.doneCount}
                totalCount={data.completeness.totalCount}
                onSelect={goTo}
            />

            <main
                // 'details', 'theme' and 'verification' remount on every fresh
                // server read (key includes renderedAt): they seed local form
                // state from `data` and want a clean slate after a save.
                //
                // Everything else keys on where it is, with no renderedAt: the
                // workspace screens write as the moderator edits and keep
                // their own optimistic state (staged subcategory toggles, a
                // dragged card, a group created a moment ago); import polls a
                // job; boards holds curation state. Every write refreshes the
                // page, so keying these on renderedAt would remount — and
                // wipe — them on every edit.
                key={
                    step === 'details' ||
                    step === 'theme' ||
                    step === 'verification'
                        ? `${step}-${data.renderedAt}`
                        : `${step}:${sub ?? ''}`
                }
                className={styles.stepBody}
            >
                <CurrentStep
                    step={step}
                    sub={sub}
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                    onSelectSub={(s) => goTo({ step, sub: s })}
                />
                <ConsoleWayfinding
                    step={step}
                    sub={sub}
                    gameSlug={data.game.name}
                />
                <div className={styles.navBar}>
                    {prev && (
                        <button
                            type="button"
                            className={styles.backAction}
                            onClick={onBack}
                        >
                            ← Back
                        </button>
                    )}
                    <span className={styles.spacer} />
                    {next && meta.kind && (
                        <button
                            type="button"
                            className={styles.primaryAction}
                            onClick={onAdvance}
                        >
                            Next: {locationLabel(next, location)} →
                        </button>
                    )}
                    {next && !meta.kind && meta.skippable && (
                        <button
                            type="button"
                            className={styles.skipAction}
                            onClick={onAdvance}
                        >
                            Go to {locationLabel(next, location)} →
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}

function CurrentStep({
    step,
    sub,
    data,
    onAdvance,
    onBack,
    onSelectSub,
}: {
    step: SetupStepId;
    sub: WorkspaceSubId | null;
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
    onSelectSub: (sub: WorkspaceSubId) => void;
}) {
    switch (step) {
        case 'import':
            return (
                <StepImport data={data} onAdvance={onAdvance} onBack={onBack} />
            );
        case 'details':
            return (
                <StepDetails
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'theme':
            return (
                <StepTheme data={data} onAdvance={onAdvance} onBack={onBack} />
            );
        case 'categories':
        case 'levels':
            return (
                <StepWorkspace
                    data={data}
                    kind={step}
                    sub={sub ?? 'list'}
                    onSelectSub={onSelectSub}
                />
            );
        case 'verification':
            return (
                <StepVerification
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'match-runners':
            return (
                <StepMatchRunners
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
 * step says where its work lives once setup is done.
 */
function ConsoleWayfinding({
    step,
    sub,
    gameSlug,
}: {
    step: SetupStepId;
    sub: WorkspaceSubId | null;
    gameSlug: string;
}) {
    const location = consoleLocationForStep(step, sub);
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
