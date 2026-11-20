'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Can } from '~src/rbac/Can.component';
import type {
    SrcRunSyncStatus,
    SrcSettingsStatus,
} from '../../../../../../types/src-board-sync.types';
import { FormSection } from '../shared/form-kit';
import { ArchivePart } from './archive-part';
import { RestorePart } from './restore-part';
import { RunsPart } from './runs-part';
import { SettingsPart } from './settings-part';
import { SrcModePicker } from './src-mode-picker';
import styles from './src-sync.module.scss';
import { getSrcSync, linkSrcGame } from './src-sync-actions';

function LinkForm({
    gameId,
    onLinked,
}: {
    gameId: number;
    onLinked: () => void;
}) {
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await linkSrcGame(gameId, url.trim());
        setBusy(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        onLinked();
    };

    return (
        <>
            <p className={styles.counts}>Paste the game's speedrun.com link.</p>
            <form className={styles.linkForm} onSubmit={submit}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="speedrun.com/sm64"
                    aria-label="speedrun.com link"
                    value={url}
                    disabled={busy}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <button
                    type="submit"
                    className={styles.apply}
                    disabled={busy || !url.trim()}
                >
                    Link
                </button>
            </form>
            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}
        </>
    );
}

export function SrcSyncSection({
    gameId,
    gameSlug,
    canAdmin,
    canEdit,
}: {
    gameId: number;
    gameSlug: string;
    canAdmin: boolean;
    canEdit: boolean;
}) {
    const [data, setData] = useState<{
        settings: SrcSettingsStatus;
        runs: SrcRunSyncStatus;
    } | null>(null);
    const [archivePending, setArchivePending] = useState(false);

    const refresh = useCallback(async () => {
        const res = await getSrcSync(gameId);
        if ('result' in res) setData(res.result);
    }, [gameId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const state = data?.settings.job?.state;
    const working =
        state === 'applying' || state === 'undoing' || !!data?.runs.running;

    useEffect(() => {
        if (!working) return;
        const poll = setInterval(refresh, 5000);
        return () => clearInterval(poll);
    }, [working, refresh]);

    if (!data || (!data.settings.link && !canEdit)) return null;

    const { settings, runs } = data;
    const link = settings.link;
    const disabled = settings.disabled;

    return (
        <div>
            <FormSection title="speedrun.com">
                {disabled && (
                    <p className={styles.counts}>
                        Syncing with speedrun.com is off right now.
                    </p>
                )}
                {link
                    ? link.weblink && (
                          <p className={styles.counts}>
                              Linked to{' '}
                              <a
                                  href={link.weblink}
                                  target="_blank"
                                  rel="noreferrer"
                              >
                                  {link.name}
                              </a>{' '}
                              on speedrun.com.
                          </p>
                      )
                    : !disabled && (
                          <LinkForm gameId={gameId} onLinked={refresh} />
                      )}
                {link && (
                    <SrcModePicker
                        gameId={gameId}
                        gameSlug={gameSlug}
                        status={runs}
                        canEdit={canEdit}
                        disabled={disabled}
                        onStatus={(next) => setData({ settings, runs: next })}
                    />
                )}
                <ArchivePart
                    gameId={gameId}
                    canAdmin={canAdmin}
                    onPending={setArchivePending}
                />
                {link && !archivePending && (
                    <>
                        {runs.srcMode !== 'copy' && (
                            <SettingsPart
                                gameId={gameId}
                                status={settings}
                                canEdit={canEdit}
                                disabled={disabled}
                                onChange={refresh}
                            />
                        )}
                        {!disabled && runs.srcMode !== 'none' && (
                            <RunsPart
                                gameId={gameId}
                                status={runs}
                                canEdit={canEdit}
                                onStatus={(next) =>
                                    setData({ settings, runs: next })
                                }
                                onRefresh={refresh}
                            />
                        )}
                    </>
                )}
                {link && !disabled && (
                    <Can I="moderate" a="admins">
                        <RestorePart
                            gameId={gameId}
                            gameSlug={gameSlug}
                            onRestored={refresh}
                        />
                    </Can>
                )}
                {!canEdit && (
                    <p className={styles.muted}>
                        Only a board admin or moderator can change this.
                    </p>
                )}
            </FormSection>
        </div>
    );
}
