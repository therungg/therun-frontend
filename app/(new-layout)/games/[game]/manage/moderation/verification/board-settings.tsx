'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    VerificationSettingsView,
    VideoRule,
} from '../../../../../../../types/verification-settings.types';
import { InlineError } from '../../shared/form-kit';
import { saveVerificationSettingsAction } from './actions/verification-settings.action';
import styles from './board-settings.module.scss';
import { SettingsEditor } from './settings-editor';
import { formatDuration } from './settings-model';

interface Props {
    gameSlug: string;
    view: VerificationSettingsView;
    onSaved: (view: VerificationSettingsView) => void;
}

/**
 * The same three settings, per board.
 *
 * A game's boards are not one thing: a full-game category and a level are held
 * to different times, and the VOD a 1:39:00 run owes is not the one a 9-minute
 * level owes. The game settings above are the default; a row here is a board
 * that answers differently, and a board with no answer of its own keeps
 * following the game.
 */
export function BoardSettings({ gameSlug, view, onSaved }: Props) {
    const [openId, setOpenId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clearing, startClear] = useTransition();

    const open = view.categories.find((c) => c.categoryId === openId) ?? null;

    const clearOverrides = (categoryId: number, display: string) => {
        setError(null);
        startClear(async () => {
            const res = await saveVerificationSettingsAction(gameSlug, {
                categoryId,
                intake: null,
                videoRule: null,
                autoVerify: null,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(`${display} follows the game settings again.`);
            onSaved(res.view);
        });
    };

    if (open) {
        return (
            <section className={styles.panel}>
                <div className={styles.head}>
                    <div>
                        <div className={styles.eyebrow}>Board</div>
                        <h3 className={styles.title}>{open.display}</h3>
                    </div>
                    <div className={styles.headActions}>
                        {open.overridden.length > 0 && (
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={clearing}
                                onClick={() =>
                                    clearOverrides(
                                        open.categoryId,
                                        open.display,
                                    )
                                }
                            >
                                {clearing
                                    ? 'Clearing…'
                                    : 'Use the game settings'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setOpenId(null)}
                        >
                            All boards
                        </button>
                    </div>
                </div>
                <p className={styles.note}>
                    Only what you change here stops following the game.
                </p>
                <InlineError>{error}</InlineError>
                <SettingsEditor
                    key={`cat:${open.categoryId}`}
                    gameSlug={gameSlug}
                    categoryId={open.categoryId}
                    effective={open.effective}
                    enforced={view.enforced}
                    configured
                    onSaved={onSaved}
                />
            </section>
        );
    }

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <div>
                    <h3 className={styles.title}>Per board</h3>
                    <span className={styles.hint}>
                        {view.categories.length.toLocaleString()}{' '}
                        {view.categories.length === 1 ? 'board' : 'boards'} · a
                        board with nothing of its own follows the game
                    </span>
                </div>
            </div>
            <InlineError>{error}</InlineError>
            <div className={styles.scroller}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Board</th>
                            <th>VOD required</th>
                            <th>Auto-submission</th>
                            <th>Auto-verification</th>
                            <th
                                className={styles.colActions}
                                aria-label="Actions"
                            />
                        </tr>
                    </thead>
                    <tbody>
                        {view.categories.map((c) => (
                            <tr key={c.categoryId}>
                                <td className={styles.name}>{c.display}</td>
                                <td>
                                    <Cell
                                        text={videoRuleLabel(
                                            c.effective.videoRule.value,
                                        )}
                                        own={c.overridden.includes('videoRule')}
                                    />
                                </td>
                                <td>
                                    <Cell
                                        text={
                                            c.effective.intake.value
                                                .timerRuns === 'direct'
                                                ? 'Allowed'
                                                : 'Runner submits'
                                        }
                                        own={c.overridden.includes('intake')}
                                    />
                                </td>
                                <td>
                                    <Cell
                                        text={
                                            c.effective.autoVerify.value.enabled
                                                ? 'On'
                                                : 'Off'
                                        }
                                        own={c.overridden.includes(
                                            'autoVerify',
                                        )}
                                    />
                                </td>
                                <td className={styles.colActions}>
                                    <button
                                        type="button"
                                        className={styles.editAction}
                                        onClick={() => setOpenId(c.categoryId)}
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/** A value, marked when the board sets it itself rather than inheriting it. */
function Cell({ text, own }: { text: string; own: boolean }) {
    return (
        <span className={own ? styles.ownValue : styles.inheritedValue}>
            {text}
        </span>
    );
}

/** The rule in the words the segmented control uses, with its number. */
export function videoRuleLabel(rule: VideoRule): string {
    switch (rule.require) {
        case 'nothing':
            return 'No';
        case 'everything':
            return 'Every run';
        case 'top_n':
            return `Top ${rule.topN ?? 0}`;
        case 'under_time':
            return `Under ${rule.timeMs ? formatDuration(rule.timeMs) : '—'}`;
    }
}
