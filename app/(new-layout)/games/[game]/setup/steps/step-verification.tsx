'use client';

import { useRouter } from 'next/navigation';
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
 * the console. A moderator can accept the defaults, but only by saving them,
 * so Continue stays off until `configured` is true. A viewer who can't
 * moderate the game can't save, so they're told who does and can move on.
 */
export function StepVerification({ data, onAdvance }: StepProps) {
    const gameSlug = data.game.name;
    const router = useRouter();
    const [view, setView] = useState<VerificationSettingsView | null>(null);
    const [failure, setFailure] = useState<{
        error: string;
        forbidden: boolean;
    } | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [isLoading, startLoad] = useTransition();
    const requestId = useRef(0);

    // attempt re-runs the load on retry
    useEffect(() => {
        const ticket = ++requestId.current;
        startLoad(async () => {
            const res = await loadVerificationSettingsAction(gameSlug);
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setFailure({
                    error: res.error,
                    forbidden: res.forbidden === true,
                });
                return;
            }
            setFailure(null);
            setView(res.view);
        });
    }, [gameSlug, attempt]);

    const saved = (next: VerificationSettingsView) => {
        setView(next);
        // The setup rail reads `configured` from the server.
        router.refresh();
    };

    if (failure) {
        return (
            <section>
                <StepHeader step="verification" title="Verification" />
                {failure.forbidden ? (
                    <p>A moderator of this game sets verification.</p>
                ) : (
                    <>
                        <p role="alert">{failure.error}</p>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setAttempt((n) => n + 1)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Trying again…' : 'Try again'}
                        </button>
                    </>
                )}
                <button
                    type="button"
                    className={`${styles.primaryAction} mt-2`}
                    onClick={onAdvance}
                >
                    Continue
                </button>
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
                effective={view.game}
                enforced={view.enforced}
                configured={view.configured}
                onSaved={saved}
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
