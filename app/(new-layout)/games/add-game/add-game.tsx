'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    type ActionError,
    addGameAction,
    requestGameAction,
    searchGamesToAddAction,
} from '~src/actions/add-game.action';
import { IgdbPicker, igdbImage } from '~src/components/igdb-picker/igdb-picker';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { safeEncodeURI } from '~src/utils/uri';
import type { AddGameSearchResult } from '../../../../types/add-game.types';
import { BoardDialog } from '../[game]/shared/board-dialog';
import styles from './add-game.module.scss';

type Row = AddGameSearchResult & { coverUrl: string | null };
type View = 'search' | 'confirm' | 'request' | 'requested' | 'login';

const gameHref = (name: string) => `/games/${safeEncodeURI(name)}`;

export function AddGame() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<View>('search');
    const [picked, setPicked] = useState<Row | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [isBusy, startBusy] = useTransition();
    const addInFlight = useRef(false);

    const close = () => {
        setOpen(false);
        setView('search');
        setPicked(null);
        setError(null);
        setName('');
        setNote('');
    };

    const add = () => {
        if (!picked || addInFlight.current) return;
        addInFlight.current = true;
        startBusy(async () => {
            try {
                setError(null);
                const res = await addGameAction(picked.id);
                if ('error' in res) {
                    if (res.needsLogin) setView('login');
                    else setError(res.error);
                    return;
                }
                if (res.result.created) {
                    toast.success(`${res.result.game.display} added.`);
                    router.push(gameHref(res.result.game.name));
                    return;
                }
                // Someone else added it between the search and the click.
                router.push(gameHref(res.result.existing.name));
            } finally {
                addInFlight.current = false;
            }
        });
    };

    const sendRequest = () => {
        startBusy(async () => {
            setError(null);
            const res = await requestGameAction({ name, note });
            if ('error' in res) {
                if (res.needsLogin) setView('login');
                else setError(res.error);
                return;
            }
            setView('requested');
        });
    };

    return (
        <>
            <button
                type="button"
                className="games-add-pill"
                onClick={() => setOpen(true)}
            >
                Add a game
            </button>
            <BoardDialog
                open={open}
                onClose={close}
                labelledBy="add-game-title"
                size="md"
                closeOnBackdropClick={!isBusy}
            >
                <div className={styles.header}>
                    <h5 className={styles.title} id="add-game-title">
                        {view === 'request' || view === 'requested'
                            ? 'Ask for a game'
                            : 'Add a game'}
                    </h5>
                </div>

                {/*
                    Rendered whenever the dialog is open, only hidden while
                    another view is showing — not unmounted — so the picker
                    keeps its query and results (and the user's searches,
                    rate-limited server-side) across a trip to "confirm" and
                    back. The whole subtree still resets for free on close:
                    BoardDialog unmounts its children while !open.
                */}
                <div className={styles.body} hidden={view !== 'search'}>
                    <p className={styles.blurb}>
                        Find the game on IGDB. Its cover, description and
                        release details come along.
                    </p>
                    <IgdbPicker<Row, ActionError>
                        autoFocus
                        search={async (q) => {
                            const res = await searchGamesToAddAction(q);
                            if ('error' in res) return res;
                            return {
                                result: res.result.map((r) => ({
                                    ...r,
                                    coverUrl: r.cover?.url ?? null,
                                })),
                            };
                        }}
                        onError={(res) => {
                            if ('needsLogin' in res) setView('login');
                        }}
                        renderAction={(row, busy) =>
                            row.existing ? (
                                <Link
                                    className={styles.existing}
                                    href={gameHref(row.existing.name)}
                                >
                                    Already on therun →
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.pick}
                                    disabled={busy}
                                    onClick={() => {
                                        setPicked(row);
                                        setView('confirm');
                                    }}
                                >
                                    Select
                                </button>
                            )
                        }
                        footer={({ searched }) =>
                            searched && (
                                <button
                                    type="button"
                                    className={styles.linkButton}
                                    onClick={() => setView('request')}
                                >
                                    Can’t find it?
                                </button>
                            )
                        }
                    />
                </div>
                {view === 'search' && (
                    <div className={styles.footer}>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={close}
                        >
                            Close
                        </button>
                    </div>
                )}

                {view === 'confirm' && picked && (
                    <>
                        <div className={styles.body}>
                            <div className={styles.confirm}>
                                {picked.coverUrl && (
                                    <img
                                        src={igdbImage(
                                            picked.coverUrl,
                                            'cover_big',
                                        )}
                                        alt=""
                                        width={96}
                                        height={128}
                                        className={styles.confirmCover}
                                    />
                                )}
                                <div>
                                    <div className={styles.confirmName}>
                                        {picked.name}
                                        {picked.year != null && (
                                            <span className="text-muted">
                                                {' '}
                                                ({picked.year})
                                            </span>
                                        )}
                                    </div>
                                    <p className={styles.blurb}>
                                        The board starts empty and has no
                                        moderators yet. Once it exists you can
                                        apply to moderate it from its page.
                                    </p>
                                </div>
                            </div>
                            {error && (
                                <div className={styles.error}>{error}</div>
                            )}
                        </div>
                        <div className={styles.footer}>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={isBusy}
                                onClick={() => {
                                    setError(null);
                                    setView('search');
                                }}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={isBusy}
                                onClick={add}
                            >
                                {isBusy ? 'Adding…' : 'Add this game'}
                            </button>
                        </div>
                    </>
                )}

                {view === 'request' && (
                    <>
                        <div className={styles.body}>
                            <p className={styles.blurb}>
                                Not on IGDB? Tell us which game. The site admins
                                get the request and add it by hand.
                            </p>
                            <input
                                className="form-control form-control-sm mb-2"
                                value={name}
                                maxLength={200}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Game name"
                                aria-label="Game name"
                                disabled={isBusy}
                            />
                            <textarea
                                className={styles.textarea}
                                rows={3}
                                value={note}
                                maxLength={500}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Anything that helps find it: a link, the platform, the year"
                                aria-label="Note"
                                disabled={isBusy}
                            />
                            {error && (
                                <div className={styles.error}>{error}</div>
                            )}
                        </div>
                        <div className={styles.footer}>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={isBusy}
                                onClick={() => {
                                    setError(null);
                                    setView('search');
                                }}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={isBusy || name.trim().length < 2}
                                onClick={sendRequest}
                            >
                                {isBusy ? 'Sending…' : 'Send request'}
                            </button>
                        </div>
                    </>
                )}

                {view === 'requested' && (
                    <>
                        <div className={styles.body}>
                            <p className={styles.blurb}>
                                Request sent. The site admins will take a look.
                            </p>
                        </div>
                        <div className={styles.footer}>
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={close}
                            >
                                Done
                            </button>
                        </div>
                    </>
                )}

                {view === 'login' && (
                    <>
                        <div className={styles.body}>
                            <p className={styles.blurb}>
                                Log in to add a game.
                            </p>
                            <TwitchLoginButton />
                        </div>
                        <div className={styles.footer}>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={close}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </BoardDialog>
        </>
    );
}
