'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
    SETUP_STEP_ORDER,
    type SetupStepId,
} from '~src/lib/setup/completeness';
import { SETUP_STEPS, setupStepIndex } from '~src/lib/setup/steps';
import { BackLink } from '../shared/back-link';
import styles from './setup.module.scss';
import { SetupRail } from './setup-rail';
import { StepCategories } from './steps/step-categories';
import { StepDefaults } from './steps/step-defaults';
import { StepDetails } from './steps/step-details';
import { StepExceptions } from './steps/step-exceptions';
import { StepFinish } from './steps/step-finish';
import type { WizardData } from './types';

interface Props {
    data: WizardData;
    initialStep: SetupStepId;
}

export function WizardShell({ data, initialStep }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const stepParam = searchParams.get('step');
    const step: SetupStepId =
        stepParam && SETUP_STEP_ORDER.includes(stepParam as SetupStepId)
            ? (stepParam as SetupStepId)
            : initialStep;
    const stepIndex = setupStepIndex(step);

    const goTo = (id: SetupStepId) => {
        // Keep the URL shareable/resumable and re-read server state so a step
        // always sees writes committed by previous steps (or by co-mods).
        router.replace(`/games-v2/${data.game.name}/setup?step=${id}`, {
            scroll: true,
        });
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
        <div className={styles.page}>
            <header className={styles.identityStrip}>
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt=""
                        width={36}
                        height={48}
                        className={styles.identityCover}
                    />
                )}
                <div>
                    <span className={styles.eyebrow}>Board setup</span>
                    <span className={styles.identityTitle}>
                        {data.game.display}
                    </span>
                </div>
                <BackLink
                    href={`/games-v2/${data.game.name}/manage`}
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
                key={`${step}-${data.renderedAt}`}
                className={styles.stepBody}
            >
                <CurrentStep
                    step={step}
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
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
                    {SETUP_STEPS[stepIndex].skippable && (
                        <button
                            type="button"
                            className={styles.skipAction}
                            onClick={onAdvance}
                        >
                            Skip this step
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
        case 'defaults':
            return (
                <StepDefaults
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'exceptions':
            return (
                <StepExceptions
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'finish':
            return (
                <StepFinish data={data} onAdvance={onAdvance} onBack={onBack} />
            );
    }
}
