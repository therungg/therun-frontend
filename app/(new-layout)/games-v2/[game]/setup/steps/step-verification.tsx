'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { VerificationSettingsView } from '../../../../../../types/verification-settings.types';
import { loadVerificationSettingsAction } from '../../manage/moderation/verification/actions/verification-settings.action';
import { SettingsEditor } from '../../manage/moderation/verification/settings-editor';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

/**
 * Setup asks the video question with its consequences in front of the
 * moderator (design §4). The game default only; category overrides live in
 * the console. Non-skippable: a moderator can accept the defaults, but only
 * by saving them, so Continue stays off until `configured` is true.
 */
export function StepVerification({ data, onAdvance }: StepProps) {
    const gameSlug = data.game.name;
    const [view, setView] = useState<VerificationSettingsView | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [, startLoad] = useTransition();
    const requestId = useRef(0);

    useEffect(() => {
        const ticket = ++requestId.current;
        startLoad(async () => {
            const res = await loadVerificationSettingsAction(gameSlug);
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setView(res.view);
        });
    }, [gameSlug]);

    if (error) {
        return (
            <section>
                <StepHeader step="verification" title="Verification" />
                <p role="alert">{error}</p>
            </section>
        );
    }
    if (!view) return null;

    return (
        <section>
            <StepHeader
                step="verification"
                title="What does a run need before it counts?"
            />
            <SettingsEditor
                key={view.configured ? 'saved' : 'new'}
                gameSlug={gameSlug}
                categoryId={null}
                effective={view.game}
                enforced={view.enforced}
                onSaved={setView}
            />
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={!view.configured}
                onClick={onAdvance}
            >
                Continue
            </button>
        </section>
    );
}
