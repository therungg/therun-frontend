'use client';

import { useState } from 'react';
import type { GameTheme } from '~src/lib/game-theme';
import { getBackgroundUploadUrlAction } from '../../manage/console/actions/get-background-upload-url.action';
import paneStyles from '../../manage/console/theme-pane.module.scss';
import { ThemeEditor } from '../../theme/theme-editor';
import { updateGameMetadataAction } from '../actions/update-game-metadata.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

/**
 * The board's look, set before its categories so everything after is built
 * on the board as runners will see it. The same editor as the console's Theme
 * pane; optional, so Continue without a theme is a plain advance.
 */
export function StepTheme({ data, onAdvance }: StepProps) {
    const saved = data.metadata.theme;
    const [draft, setDraft] = useState<GameTheme | null>(saved);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

    const save = async (theme: GameTheme | null) => {
        setBusy(true);
        setError(null);
        const res = await updateGameMetadataAction({
            gameSlug: data.game.name,
            gameId: data.game.id,
            theme,
        });
        setBusy(false);
        if ('error' in res) {
            setError(res.error);
            return false;
        }
        return true;
    };

    return (
        <section>
            <StepHeader step="theme" title="How should the board look?" />

            <ThemeEditor
                value={draft}
                onChange={setDraft}
                busy={busy}
                requestUploadUrl={(file) =>
                    getBackgroundUploadUrlAction({
                        gameSlug: data.game.name,
                        gameId: data.game.id,
                        contentType: file.type,
                        contentLength: file.size,
                    })
                }
            />

            <div className={styles.detailsFooter}>
                {error ? (
                    <p className={`${styles.footerHint} ${styles.textDanger}`}>
                        {error}
                    </p>
                ) : (
                    saved != null && (
                        <button
                            type="button"
                            className={paneStyles.removeTheme}
                            disabled={busy}
                            onClick={async () => {
                                if (await save(null)) setDraft(null);
                            }}
                        >
                            Remove theme
                        </button>
                    )
                )}
                <button
                    type="button"
                    className={`${styles.primaryAction} ms-auto`}
                    disabled={busy}
                    onClick={async () => {
                        if (!dirty || (await save(draft))) onAdvance();
                    }}
                >
                    {busy ? 'Saving…' : dirty ? 'Save & continue' : 'Continue'}
                </button>
            </div>
        </section>
    );
}
