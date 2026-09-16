'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type { VerificationSettingsView } from '../../../../../../../types/verification-settings.types';
import { BackLink } from '../../../shared/back-link';
import { InlineError } from '../../shared/form-kit';
import { loadVerificationSettingsAction } from './actions/verification-settings.action';
import { OverruleSummary } from './overrule-summary';
import { SettingsEditor } from './settings-editor';

interface Props {
    gameSlug: string;
    gameDisplay: string;
}

export function VerificationPane({ gameSlug, gameDisplay }: Props) {
    const [view, setView] = useState<VerificationSettingsView | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const [, startLoad] = useTransition();
    const requestId = useRef(0);

    const load = () => {
        const ticket = ++requestId.current;
        startLoad(async () => {
            const res = await loadVerificationSettingsAction(gameSlug);
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setView(res.view);
        });
    };

    // load reads only gameSlug
    useEffect(load, [gameSlug]);

    const saved = (next: VerificationSettingsView) => {
        setView(next);
        setVersion((v) => v + 1);
    };

    const boardHref = `/games-v2/${encodeURIComponent(gameSlug)}`;

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>
                        {gameDisplay}
                    </div>
                    <h2 className={consoleStyles.paneTitle}>Verification</h2>
                </div>
                <div className={consoleStyles.paneActions}>
                    <BackLink href={boardHref} label="Back to leaderboard" />
                </div>
            </div>
            <InlineError>{error}</InlineError>

            {view && (
                <>
                    <OverruleSummary overrules={view.overrules} />
                    <SettingsEditor
                        key={`game:${version}`}
                        gameSlug={gameSlug}
                        effective={view.game}
                        enforced={view.enforced}
                        configured={view.configured}
                        onSaved={saved}
                    />
                </>
            )}
        </div>
    );
}
