'use client';

import { useCallback, useState } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { SrcImportCommitFlags } from '../../../../../../types/src-import.types';
import { ImportOptions, resolveCommitFlags } from './import-options';
import { ImportSection } from './import-section';
import { LinkCard } from './link-card';
import styles from './src-import.module.scss';
import { getSrcImportJobAction } from './src-import-actions';
import { isSettled, useSrcImportJob } from './use-src-import-job';

interface Props {
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
    /** Global admins bypass the once-per-day cooldown (the backend enforces the same rule). */
    isAdmin: boolean;
}

/**
 * Import pane: two independent sections. Settings pulls the board's
 * configuration from the source; Runs pulls the runs of runners who have a
 * therun account. Both run immediately and report what changed.
 */
export function SrcImportPane({
    gameId,
    gameSlug,
    gameDisplay,
    isAdmin,
}: Props) {
    const fetchSettings = useCallback(
        () => getSrcImportJobAction({ gameId, gameSlug, kind: 'settings' }),
        [gameId, gameSlug],
    );
    const fetchRuns = useCallback(
        () => getSrcImportJobAction({ gameId, gameSlug, kind: 'resync' }),
        [gameId, gameSlug],
    );
    const fetchAny = useCallback(
        () => getSrcImportJobAction({ gameId, gameSlug }),
        [gameId, gameSlug],
    );
    const settings = useSrcImportJob(fetchSettings);
    const runs = useSrcImportJob(fetchRuns);
    // The latest job of ANY kind: decides whether the board is linked at all
    // (a legacy manual import counts) and whether something is running.
    const any = useSrcImportJob(fetchAny);

    // Options are per job; the pane keeps a local patch that is sent with the
    // next settings import, seeded from the last settings job's flags.
    const [flagPatch, setFlagPatch] = useState<SrcImportCommitFlags>({});
    const flags = resolveCommitFlags({
        ...(settings.job?.commitFlags ?? {}),
        ...flagPatch,
    });

    const anyRunning =
        (settings.job !== null && !isSettled(settings.job)) ||
        (runs.job !== null && !isSettled(runs.job)) ||
        (any.job !== null && !isSettled(any.job));

    const settingsRefresh = settings.refresh;
    const runsRefresh = runs.refresh;
    const anyRefresh = any.refresh;
    const refreshAll = useCallback(async () => {
        await Promise.all([settingsRefresh(), runsRefresh(), anyRefresh()]);
    }, [settingsRefresh, runsRefresh, anyRefresh]);

    const loaded = !settings.loading && !runs.loading && !any.loading;
    const unlinked = loaded && any.job === null && !any.error;

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Game</div>
                    <h2 className={consoleStyles.paneTitle}>
                        {CONCEPT_LABEL.import}
                    </h2>
                </div>
            </div>
            <p className={consoleStyles.paneLede}>
                Keep the {gameDisplay} board in step with its source. Each
                import runs on its own and shows what it changed.
            </p>

            <div className={styles.stack}>
                {unlinked ? (
                    <LinkCard
                        gameId={gameId}
                        gameSlug={gameSlug}
                        onLinked={refreshAll}
                    />
                ) : (
                    <>
                        <ImportSection
                            kind="settings"
                            title="Settings"
                            description="Categories, levels, subcategories and filters, rules, timing and theme."
                            buttonLabel="Import settings"
                            gameId={gameId}
                            gameSlug={gameSlug}
                            job={settings.job}
                            loading={settings.loading}
                            loadError={settings.error}
                            anyRunning={anyRunning}
                            bypassCooldown={isAdmin}
                            onStarted={refreshAll}
                            commitFlags={flagPatch}
                        >
                            <ImportOptions
                                flags={flags}
                                disabled={anyRunning}
                                onChange={(patch) =>
                                    setFlagPatch((prev) => ({
                                        ...prev,
                                        ...patch,
                                    }))
                                }
                            />
                        </ImportSection>
                        <ImportSection
                            kind="resync"
                            title="Runs"
                            description="Runs of runners who have a therun account. Verified on import; runs that left the source are removed."
                            buttonLabel="Import runs"
                            gameId={gameId}
                            gameSlug={gameSlug}
                            job={runs.job}
                            loading={runs.loading}
                            loadError={runs.error}
                            anyRunning={anyRunning}
                            bypassCooldown={isAdmin}
                            onStarted={refreshAll}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
