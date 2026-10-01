'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import { BaselineSection } from './baseline-section';
import { ImportSection, SRC_IMPORT_BLOCKED } from './import-section';
import { PurgeSection } from './purge-section';
import styles from './src-import.module.scss';
import {
    getSrcImportJobAction,
    refreshGameThemeAction,
} from './src-import-actions';
import { isSettled, useSrcImportJob } from './use-src-import-job';

interface Props {
    gameId: number;
    gameSlug: string;
    /** The board's display name — the purge section's confirm field needs the exact string. */
    gameDisplay: string;
    /** Global admins bypass the once-per-day cooldown (the backend enforces the same rule). */
    isAdmin: boolean;
    /** Board admin: may link, import and apply the baseline. Moderators see
     *  the job status and history only. */
    canEdit: boolean;
}

/**
 * Import pane: the console's chrome around the shared sections.
 */
export function SrcImportPane({
    gameId,
    gameSlug,
    gameDisplay,
    isAdmin,
    canEdit,
}: Props) {
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
            <ImportSections
                gameId={gameId}
                gameSlug={gameSlug}
                gameDisplay={gameDisplay}
                isAdmin={isAdmin}
                canEdit={canEdit}
            />
        </div>
    );
}

/**
 * Two independent sections. Settings pulls the board's configuration from
 * speedrun.com; Runs pulls the runs of runners who have a therun account. Both
 * run immediately and report what changed. An unlinked board gets the link card
 * instead — linking is the first import.
 *
 * Shared by the console pane and the setup wizard's first step, which wrap it
 * in their own headings; nothing here draws chrome of its own.
 */
export function ImportSections({
    gameId,
    gameSlug,
    gameDisplay,
    isAdmin,
    canEdit,
}: Props) {
    const fetchSettings = useCallback(
        () => getSrcImportJobAction({ gameId, gameSlug, kind: 'settings' }),
        [gameId, gameSlug],
    );
    const fetchRuns = useCallback(
        () => getSrcImportJobAction({ gameId, gameSlug, kind: 'resync' }),
        [gameId, gameSlug],
    );
    const settings = useSrcImportJob(fetchSettings);
    const runs = useSrcImportJob(fetchRuns);

    // Is this board linked at all? A legacy `manual` job counts, so one read
    // of "latest job of any kind" answers it. It never changes while the pane
    // is open — nothing polls it; refreshAll re-reads it after a link.
    const [anyOnce, setAnyOnce] = useState<SrcImportJob | null>(null);
    const [anyLoading, setAnyLoading] = useState(true);
    const readAnyOnce = useCallback(async () => {
        const res = await getSrcImportJobAction({ gameId, gameSlug });
        if (!('error' in res)) setAnyOnce(res.result);
        setAnyLoading(false);
    }, [gameId, gameSlug]);
    useEffect(() => {
        void readAnyOnce();
    }, [readAnyOnce]);

    const anyRunning =
        (settings.job !== null && !isSettled(settings.job)) ||
        (runs.job !== null && !isSettled(runs.job));

    const settingsRefresh = settings.refresh;
    const runsRefresh = runs.refresh;
    const refreshAll = useCallback(async () => {
        await Promise.all([settingsRefresh(), runsRefresh(), readAnyOnce()]);
    }, [settingsRefresh, runsRefresh, readAnyOnce]);

    // apply-config writes the theme before anything else and stamps the job,
    // so this flips minutes before the import finishes. Repaint the page the
    // moment it does: drop the cached game metadata, then re-render the server
    // tree, which is what puts the board's colors on the console chrome.
    //
    // Only a stamp that appears while the pane is open counts. The first
    // loaded job seeds the ref instead of firing — otherwise opening the pane
    // on a board imported last week would refresh for a theme already on
    // screen.
    const router = useRouter();
    const themeStamp = settings.job?.configThemeAppliedAt ?? null;
    const seenThemeStamp = useRef<string | null | undefined>(undefined);
    const settingsLoading = settings.loading;
    useEffect(() => {
        if (settingsLoading) return;
        if (seenThemeStamp.current === undefined) {
            seenThemeStamp.current = themeStamp;
            return;
        }
        if (themeStamp === null || themeStamp === seenThemeStamp.current) {
            return;
        }
        seenThemeStamp.current = themeStamp;
        void (async () => {
            await refreshGameThemeAction({ gameId, gameSlug });
            router.refresh();
        })();
    }, [themeStamp, settingsLoading, gameId, gameSlug, router]);

    const loaded = !settings.loading && !runs.loading && !anyLoading;
    const unlinked =
        loaded &&
        settings.job === null &&
        runs.job === null &&
        anyOnce === null;

    return (
        <div className={styles.stack}>
            {unlinked ? (
                canEdit ? (
                    // Linking a board is a settings import, so it is off too.
                    <section
                        className={styles.section}
                        aria-labelledby="import-link"
                    >
                        <h3 id="import-link" className={styles.title}>
                            Link this board
                        </h3>
                        <p className={styles.desc}>{SRC_IMPORT_BLOCKED}</p>
                    </section>
                ) : (
                    <p className={styles.meta}>
                        This board isn&rsquo;t linked to speedrun.com yet.
                    </p>
                )
            ) : (
                <>
                    <ImportSection
                        kind="settings"
                        title="Settings"
                        buttonLabel="Import settings"
                        gameId={gameId}
                        gameSlug={gameSlug}
                        job={settings.job}
                        loading={settings.loading}
                        loadError={settings.error}
                        anyRunning={anyRunning}
                        bypassCooldown={isAdmin}
                        onStarted={refreshAll}
                        canEdit={canEdit}
                        blocked={SRC_IMPORT_BLOCKED}
                    />
                    <ImportSection
                        kind="resync"
                        title="Runs"
                        buttonLabel="Import runs"
                        gameId={gameId}
                        gameSlug={gameSlug}
                        job={runs.job}
                        loading={runs.loading}
                        loadError={runs.error}
                        anyRunning={anyRunning}
                        bypassCooldown={isAdmin}
                        onStarted={refreshAll}
                        canEdit={canEdit}
                        blocked={SRC_IMPORT_BLOCKED}
                    />
                    <BaselineSection
                        gameId={gameId}
                        gameSlug={gameSlug}
                        gameDisplay={gameDisplay}
                        disabled={anyRunning}
                        canEdit={canEdit}
                    />
                </>
            )}
            {isAdmin && (
                <PurgeSection
                    gameId={gameId}
                    gameDisplay={gameDisplay}
                    disabled={anyRunning}
                />
            )}
        </div>
    );
}
