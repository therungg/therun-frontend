'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { gameBackLink } from '~src/lib/board-url';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { VerificationSettingsView } from '../../../../../../../types/verification-settings.types';
import { BackLink } from '../../../shared/back-link';
import { InlineError } from '../../shared/form-kit';
import { loadVerificationSettingsAction } from './actions/verification-settings.action';
import { BoardSettings } from './board-settings';
import { OverruleSummary } from './overrule-summary';
import { SettingsEditor } from './settings-editor';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    /** The console's category-grouping model, already loaded for this game.
     *  The settings view identifies a board by id and name only, so which of
     *  them are levels — and which group each belongs to — is read from here
     *  rather than asked of the API a second time. */
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    /** canSeeBoards: the back link goes to the game page when false. */
    boardsVisible?: boolean;
}

export function VerificationPane({
    gameSlug,
    gameDisplay,
    rows,
    groups,
    boardsVisible = false,
}: Props) {
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

    const backLink = gameBackLink(
        { name: gameSlug, display: gameDisplay },
        boardsVisible,
    );

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
                    <BackLink {...backLink} />
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
                    {view.categories.length > 0 && (
                        <BoardSettings
                            gameSlug={gameSlug}
                            view={view}
                            rows={rows}
                            groups={groups}
                            onSaved={saved}
                        />
                    )}
                </>
            )}
        </div>
    );
}
