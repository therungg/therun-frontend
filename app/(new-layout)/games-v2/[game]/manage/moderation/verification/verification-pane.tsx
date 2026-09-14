'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import type { VerificationSettingsView } from '../../../../../../../types/verification-settings.types';
import { BackLink } from '../../../shared/back-link';
import { InlineError } from '../../shared/form-kit';
import {
    loadVerificationSettingsAction,
    saveVerificationSettingsAction,
} from './actions/verification-settings.action';
import { SettingsEditor } from './settings-editor';
import { summarize } from './settings-model';
import { TrustedRunners } from './trusted-runners';
import styles from './verification-pane.module.scss';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    categories: Array<{ id: number; display: string }>;
}

export function VerificationPane({ gameSlug, gameDisplay, categories }: Props) {
    const [view, setView] = useState<VerificationSettingsView | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<number | null>(null);
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

    const removeOverride = async (categoryId: number) => {
        const res = await saveVerificationSettingsAction(gameSlug, {
            categoryId,
            intake: null,
            videoRule: null,
            autoTrust: null,
            autoVerify: null,
            verifyWindow: null,
        });
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setError(null);
        saved(res.view);
        setOpen(null);
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
                    <section className={styles.block}>
                        <h3 className={styles.blockTitle}>Every category</h3>
                        <SettingsEditor
                            key={`game:${version}`}
                            gameSlug={gameSlug}
                            categoryId={null}
                            effective={view.game}
                            enforced={view.enforced}
                            configured={view.configured}
                            onSaved={saved}
                        />
                    </section>

                    <section className={styles.block}>
                        <h3 className={styles.blockTitle}>
                            Categories that are different
                        </h3>
                        <ul className={styles.categories}>
                            {view.categories.map((c) => {
                                const isOpen = open === c.categoryId;
                                return (
                                    <li
                                        key={c.categoryId}
                                        className={styles.category}
                                    >
                                        <button
                                            type="button"
                                            className={styles.categoryHead}
                                            aria-expanded={isOpen}
                                            onClick={() =>
                                                setOpen(
                                                    isOpen
                                                        ? null
                                                        : c.categoryId,
                                                )
                                            }
                                        >
                                            <span
                                                className={styles.categoryName}
                                            >
                                                {c.display}
                                            </span>
                                            <span
                                                className={
                                                    styles.categorySummary
                                                }
                                            >
                                                {c.overridden.length === 0
                                                    ? 'Same as the game'
                                                    : summarize(c.effective)}
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <SettingsEditor
                                                key={`cat:${c.categoryId}:${version}`}
                                                gameSlug={gameSlug}
                                                categoryId={c.categoryId}
                                                effective={c.effective}
                                                enforced={view.enforced}
                                                onSaved={saved}
                                                onRemoveOverride={
                                                    c.overridden.length > 0
                                                        ? () =>
                                                              removeOverride(
                                                                  c.categoryId,
                                                              )
                                                        : undefined
                                                }
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <TrustedRunners
                        gameSlug={gameSlug}
                        categories={categories}
                    />
                </>
            )}
        </div>
    );
}
