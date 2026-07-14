'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SetupStepId } from '~src/lib/setup/completeness';
import styles from './setup.module.scss';
import { StepCategories } from './steps/step-categories';
import { StepDetails } from './steps/step-details';
import { StepFinish } from './steps/step-finish';
import { StepRules } from './steps/step-rules';
import { StepStandards } from './steps/step-standards';
import { StepTiming } from './steps/step-timing';
import { StepVariables } from './steps/step-variables';
import { StepWelcome } from './steps/step-welcome';
import type { WizardData } from './types';

const STEPS: { id: SetupStepId; label: string; skippable: boolean }[] = [
    { id: 'welcome', label: 'Welcome', skippable: false },
    { id: 'details', label: 'Details', skippable: true },
    { id: 'categories', label: 'Categories', skippable: true },
    { id: 'timing', label: 'Timing', skippable: true },
    { id: 'variables', label: 'Variables', skippable: true },
    { id: 'rules', label: 'Rules', skippable: true },
    { id: 'standards', label: 'Standards', skippable: true },
    { id: 'finish', label: 'Mods & finish', skippable: false },
];

interface Props {
    data: WizardData;
    initialStep: SetupStepId;
}

export function WizardShell({ data, initialStep }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<SetupStepId>(initialStep);
    const stepIndex = STEPS.findIndex((s) => s.id === step);

    const goTo = (id: SetupStepId) => {
        setStep(id);
        // Keep the URL shareable/resumable and re-read server state so a step
        // always sees writes committed by previous steps (or by co-mods).
        router.replace(`/games-v2/${data.game.name}/setup?step=${id}`, {
            scroll: true,
        });
        router.refresh();
    };

    const onAdvance = () => {
        const next = STEPS[stepIndex + 1];
        if (next) goTo(next.id);
    };
    const onBack = () => {
        const prev = STEPS[stepIndex - 1];
        if (prev) goTo(prev.id);
    };

    const statusFor = (id: SetupStepId) =>
        data.completeness.steps.find((s) => s.step === id);

    return (
        <div className={styles.page}>
            <header className="d-flex align-items-center gap-3">
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt={data.game.display}
                        width={36}
                        height={48}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                    />
                )}
                <div>
                    <h1 className="mb-0 h3">Set up {data.game.display}</h1>
                    <small className="text-muted">
                        Every step saves as you go — you can leave and come back
                        anytime.
                    </small>
                </div>
            </header>

            <nav className={styles.stepper} aria-label="Setup steps">
                {STEPS.map((s, i) => (
                    <button
                        type="button"
                        key={s.id}
                        className={`${styles.stepDot} ${
                            i === stepIndex
                                ? styles.stepCurrent
                                : statusFor(s.id)?.status === 'done'
                                  ? styles.stepDone
                                  : ''
                        }`}
                        onClick={() => goTo(s.id)}
                    >
                        <span className={styles.stepNum}>{i + 1}</span>
                        {s.label}
                    </button>
                ))}
            </nav>

            <div className={styles.layout}>
                <main>
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
                                className="btn btn-outline-secondary btn-sm"
                                onClick={onBack}
                            >
                                Back
                            </button>
                        )}
                        <span className={styles.spacer} />
                        {STEPS[stepIndex].skippable && (
                            <button
                                type="button"
                                className="btn btn-link btn-sm"
                                onClick={onAdvance}
                            >
                                Skip this step
                            </button>
                        )}
                    </div>
                </main>
                <aside className={styles.rail}>
                    <div className={styles.railCard}>
                        <strong>Your board so far</strong>
                        <ul className="list-unstyled mb-0 mt-2">
                            {data.completeness.steps.map((s) => (
                                <li key={s.step} className="mb-1">
                                    {s.status === 'done' ? '✓ ' : '· '}
                                    <span className="text-muted">
                                        {s.summary}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
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
        case 'welcome':
            return (
                <StepWelcome
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
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
        case 'timing':
            return (
                <StepTiming data={data} onAdvance={onAdvance} onBack={onBack} />
            );
        case 'variables':
            return (
                <StepVariables
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        case 'rules':
            return (
                <StepRules data={data} onAdvance={onAdvance} onBack={onBack} />
            );
        case 'standards':
            return (
                <StepStandards
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
