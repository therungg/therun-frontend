'use client';

import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import type {
    SrcUserImportJob,
    SrcUserSyncStatus,
} from 'types/src-import.types';
import { SwitchField } from '~app/(new-layout)/games/[game]/manage/shared/form-kit';
import { denySrcIdentityLink } from '~src/actions/src-identity-claim.action';
import {
    confirmMySrcAccount,
    getMySyncStatus,
    lookUpMySrcAccount,
    requestMySrcAccount,
    type SyncResult,
    setMyDailySync,
    syncMyRunsNow,
    unlinkMySrcAccount,
} from '~src/actions/src-sync.action';
import styles from './import.module.scss';
import { Progress } from './import-panel';

const CONSENT = 'Import my runs and their comments from speedrun.com';

const POLL_MS = 5000;
const WAITING_POLL_MS = 30000;

function isActive(job: SrcUserImportJob | null): boolean {
    return !!job && (job.status === 'queued' || job.status === 'running');
}

function SrcName({ name }: { name: string }) {
    return (
        <a
            href={`https://www.speedrun.com/users/${encodeURIComponent(name)}`}
            target="_blank"
            rel="noreferrer"
        >
            {name}
        </a>
    );
}

function Working({ children }: { children: string }) {
    return (
        <p className={styles.working}>
            <span className={styles.spinner} aria-hidden />
            {children}
        </p>
    );
}

export function SyncPanel({ initial }: { initial: SrcUserSyncStatus }) {
    const [status, setStatus] = useState(initial);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [looked, setLooked] = useState(false);
    const [notMe, setNotMe] = useState<string | null>(null);
    const [consent, setConsent] = useState(false);
    const [confirmUnlink, setConfirmUnlink] = useState(false);
    const [unlinked, setUnlinked] = useState(false);
    const [username, setUsername] = useState('');
    const [now, setNow] = useState(() => Date.now());

    const refresh = useCallback(async () => {
        const res = await getMySyncStatus();
        if ('status' in res) setStatus(res.status);
        setNow(Date.now());
    }, []);

    const active = isActive(status.job);
    const waiting = status.request?.status === 'pending' && !status.linked;

    useEffect(() => {
        const ms = active
            ? POLL_MS
            : waiting || status.syncNowAt
              ? WAITING_POLL_MS
              : null;
        if (ms === null) return;
        const id = setInterval(() => {
            void refresh();
        }, ms);
        return () => clearInterval(id);
    }, [active, waiting, status.syncNowAt, refresh]);

    const run = async (
        name: string,
        action: () => Promise<SyncResult>,
    ): Promise<SyncResult> => {
        setBusy(name);
        setError(null);
        const res = await action();
        setBusy(null);
        if ('status' in res) {
            setStatus(res.status);
            setNow(Date.now());
        }
        return res;
    };

    const lookUp = async () => {
        setNotMe(null);
        setUnlinked(false);
        const res = await run('lookup', lookUpMySrcAccount);
        if ('error' in res) setError(res.error);
        setLooked(true);
    };

    const sendUsername = async () => {
        const name = username.trim();
        if (!name) return;
        const res = await run('request', () =>
            requestMySrcAccount(name, CONSENT),
        );
        if (!('error' in res)) return;
        if (res.code === 404) {
            setError(`There's no speedrun.com account called ${name}.`);
        } else if (res.code === 409 && res.error.includes('someone else')) {
            setError(
                `${name} is linked to someone else here. Contact us if it's yours.`,
            );
        } else {
            setError(res.error);
        }
    };

    const confirm = async () => {
        const res = await run('confirm', () => confirmMySrcAccount(CONSENT));
        if ('error' in res) setError(res.error);
    };

    const deny = async (name: string) => {
        setBusy('deny');
        setError(null);
        const res = await denySrcIdentityLink();
        setBusy(null);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setNotMe(name);
        await refresh();
    };

    const setDaily = async (daily: boolean) => {
        setStatus({ ...status, daily });
        const res = await run('daily', () => setMyDailySync(daily));
        if ('error' in res) {
            setStatus({ ...status, daily: !daily });
            setError(res.error);
        }
    };

    const syncNow = async () => {
        const res = await run('now', syncMyRunsNow);
        if ('error' in res) setError(res.error);
    };

    const unlink = async () => {
        const res = await run('unlink', unlinkMySrcAccount);
        setConfirmUnlink(false);
        if ('error' in res) setError(res.error);
        else {
            setUnlinked(true);
            setLooked(false);
            setConsent(false);
        }
    };

    if (status.disabled) {
        return (
            <p className={styles.panel}>
                Syncing with speedrun.com is off right now.
            </p>
        );
    }

    const errorBox = error && (
        <div className={styles.error} role="alert">
            {error}
        </div>
    );

    if (status.linked && status.consentAt) {
        const name = status.linked.name;
        const job = status.job;
        const minutes = status.syncNowAt
            ? Math.max(
                  1,
                  Math.ceil(
                      (new Date(status.syncNowAt).getTime() - now) / 60000,
                  ),
              )
            : 0;
        return (
            <>
                <div className={styles.panel}>
                    {active ? (
                        <Working>
                            {status.lastSyncAt
                                ? 'Syncing'
                                : 'Importing your runs'}
                        </Working>
                    ) : (
                        <p className={styles.claimText}>
                            Linked to <SrcName name={name} /> on speedrun.com.
                            {status.lastSyncAt &&
                                ` Last sync ${moment(status.lastSyncAt).fromNow()}.`}
                        </p>
                    )}
                    {!active && job?.status === 'failed' && (
                        <p className={styles.claimText}>
                            The last sync failed. We try again tomorrow.
                        </p>
                    )}
                    {errorBox}
                    <SwitchField
                        id="src-daily-sync"
                        label="Daily sync"
                        checked={status.daily}
                        disabled={busy !== null}
                        onChange={setDaily}
                    />
                    {!active && status.syncNowAt && status.lastSyncAt && (
                        <p className={styles.claimText}>
                            Synced {moment(status.lastSyncAt).fromNow()}. You
                            can sync again in {minutes}{' '}
                            {minutes === 1 ? 'minute' : 'minutes'}.
                        </p>
                    )}
                    <div className={styles.actions}>
                        {!active && !status.syncNowAt && (
                            <button
                                type="button"
                                className={styles.primary}
                                disabled={busy !== null}
                                onClick={syncNow}
                            >
                                Sync now
                            </button>
                        )}
                        {!confirmUnlink && (
                            <button
                                type="button"
                                className={styles.pill}
                                disabled={busy !== null}
                                onClick={() => setConfirmUnlink(true)}
                            >
                                Unlink
                            </button>
                        )}
                    </div>
                    {confirmUnlink && (
                        <>
                            <p className={styles.claimText}>
                                Unlink {name}? Runs already synced stay here.
                            </p>
                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.danger}
                                    disabled={busy !== null}
                                    onClick={unlink}
                                >
                                    Unlink
                                </button>
                                <button
                                    type="button"
                                    className={styles.pill}
                                    disabled={busy !== null}
                                    onClick={() => setConfirmUnlink(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {job && job.gameResults.length > 0 && (
                    <Progress job={job} active={false} />
                )}
            </>
        );
    }

    const found = status.suggestion ?? status.linked;
    if (found) {
        return (
            <div className={styles.panel}>
                <p className={styles.claimText}>
                    Is this you? <SrcName name={found.name} /> on speedrun.com
                </p>
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="src-sync-consent"
                        checked={consent}
                        disabled={busy !== null}
                        onChange={(e) => setConsent(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="src-sync-consent"
                    >
                        {CONSENT}
                    </label>
                </div>
                {errorBox}
                <div className={styles.actions}>
                    {consent && (
                        <button
                            type="button"
                            className={styles.primary}
                            disabled={busy !== null}
                            onClick={confirm}
                        >
                            Confirm
                        </button>
                    )}
                    {status.suggestion && (
                        <button
                            type="button"
                            className={styles.pill}
                            disabled={busy !== null}
                            onClick={() => deny(found.name)}
                        >
                            Not me
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (waiting && status.request) {
        return (
            <p className={styles.panel}>
                Sent. An admin checks that {status.request.srcUsername} is
                yours. This page updates on its own.
            </p>
        );
    }

    const declined =
        !looked && !notMe && status.request?.status === 'rejected'
            ? status.request.srcUsername
            : null;
    const askName = !!notMe || (looked && !declined);

    return (
        <div className={styles.panel}>
            {unlinked && (
                <p className={styles.claimText}>
                    Unlinked. Your runs stay here.
                </p>
            )}
            {notMe ? (
                <p className={styles.claimText}>
                    We won't suggest {notMe} again. Enter your speedrun.com
                    username below and an admin checks it.
                </p>
            ) : declined ? (
                <p className={styles.claimText}>
                    An admin couldn't confirm {declined} is yours. Add your
                    Twitch to that speedrun.com profile and press Link account.
                </p>
            ) : looked ? (
                <p className={styles.claimText}>
                    We couldn't find a speedrun.com account with your Twitch on
                    it. Add it to your speedrun.com profile and try again, or
                    enter your speedrun.com username and an admin checks it.
                </p>
            ) : (
                !unlinked && (
                    <>
                        <p className={styles.claimText}>
                            Link your speedrun.com account to sync your runs
                            from there to therun.gg.
                        </p>
                        <p className={styles.claimText}>
                            Add your Twitch channel to your speedrun.com profile
                            first, then press Link account.
                        </p>
                    </>
                )
            )}
            {errorBox}
            {busy === 'lookup' ? (
                <Working>Looking for your account…</Working>
            ) : (
                !notMe && (
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.primary}
                            disabled={busy !== null}
                            onClick={lookUp}
                        >
                            Link account
                        </button>
                    </div>
                )
            )}
            {askName && (
                <form
                    className={styles.form}
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (consent) void sendUsername();
                    }}
                >
                    <input
                        type="text"
                        className={`form-control ${styles.input}`}
                        placeholder="speedrun.com username"
                        aria-label="speedrun.com username"
                        value={username}
                        disabled={busy !== null}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="src-request-consent"
                            checked={consent}
                            disabled={busy !== null}
                            onChange={(e) => setConsent(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="src-request-consent"
                        >
                            {CONSENT}
                        </label>
                    </div>
                    {consent && (
                        <button
                            type="submit"
                            className={styles.pill}
                            disabled={busy !== null}
                        >
                            Send
                        </button>
                    )}
                </form>
            )}
        </div>
    );
}
