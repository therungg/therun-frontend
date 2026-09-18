import {
    loadHeldPbsAction,
    loadOffBoardRunsAction,
} from '~src/actions/pb-submission.action';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { getFormattedString } from '~src/components/util/datetime';
import { buildRunHref } from '~src/lib/board-url';
import { getGameDisplayById } from '~src/lib/game-mgmt';
import buildMetadata from '~src/utils/metadata';
import settings from '../settings/settings.module.scss';
import styles from './submissions.module.scss';

export const metadata = buildMetadata({
    title: 'Runs waiting on you',
    description: 'Personal bests a board is holding until you submit them.',
});

/** Distinct games looked up for the run links. Rows past it keep their
 * Submit link; only the game name and run-page link drop. */
const MAX_GAME_LOOKUPS = 10;

const daysSince = (since: string): number =>
    Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000);

const waitingFor = (since: string): string => {
    const days = daysSince(since);
    if (days < 1) return 'today';
    if (days === 1) return 'since yesterday';
    return `for ${days} days`;
};

const offBoardFor = (since: string): string => {
    const days = daysSince(since);
    if (days < 1) return 'off the board today';
    if (days === 1) return 'off the board since yesterday';
    return `off the board for ${days} days`;
};

export default async function SubmissionsPage() {
    const session = await getSession();
    if (!session.id) {
        return (
            <div className={settings.pane}>
                <p className={settings.loginRequired}>
                    Sign in to see the runs waiting on you.
                </p>
            </div>
        );
    }

    const [res, offBoardRes] = await Promise.all([
        loadHeldPbsAction(),
        loadOffBoardRunsAction(),
    ]);
    if (!res.ok) {
        return (
            <div className={settings.pane}>
                <header className={settings.paneHeader}>
                    <h1 className={settings.paneTitle}>Runs waiting on you</h1>
                </header>
                <p className={settings.paneNote}>{res.error}</p>
            </div>
        );
    }
    // Best-effort: a failure to load the off-board list shouldn't hide the
    // held list above it, so it just renders nothing for that section.
    const offBoard = offBoardRes.ok ? offBoardRes.offBoard : [];

    // A held run is a board run (finished_runs.id), and the public run read
    // does not filter held runs out, so its run page exists. The held list
    // carries only a game id: resolve each distinct game once.
    const gameIds = [...new Set(res.held.map((h) => h.gameId))].slice(
        0,
        MAX_GAME_LOOKUPS,
    );
    const games = new Map(
        await Promise.all(
            gameIds.map(
                async (id) =>
                    [
                        id,
                        await getGameDisplayById(id).catch(() => null),
                    ] as const,
            ),
        ),
    );

    return (
        <div className={settings.pane}>
            <header className={settings.paneHeader}>
                <h1 className={settings.paneTitle}>Runs waiting on you</h1>
                <p className={settings.paneLede}>
                    These boards ask their runners to submit their own personal
                    bests. Until you do, a run stays off the leaderboard — it is
                    not lost, and nothing here expires.
                </p>
            </header>

            {res.held.length === 0 ? (
                <p className={settings.paneNote}>
                    Nothing is waiting on you right now.
                </p>
            ) : (
                <ul className={styles.list}>
                    {res.held.map((h) => {
                        const gameDisplay = games.get(h.gameId) ?? null;
                        const board = gameDisplay
                            ? `${gameDisplay} · ${h.categoryDisplay ?? 'Unknown board'}`
                            : (h.categoryDisplay ?? 'Unknown board');
                        return (
                            <li key={h.runId} className={styles.row}>
                                <div className={styles.rowMain}>
                                    <span className={styles.board}>
                                        {gameDisplay ? (
                                            <Link
                                                href={buildRunHref(
                                                    gameDisplay,
                                                    h.runId,
                                                )}
                                            >
                                                {board}
                                            </Link>
                                        ) : (
                                            board
                                        )}
                                    </span>
                                    <span className={styles.time}>
                                        {getFormattedString(String(h.timeMs))}
                                    </span>
                                </div>
                                <div className={styles.rowMeta}>
                                    <span className={styles.waiting}>
                                        Waiting {waitingFor(h.heldAt)}
                                    </span>
                                    <Link
                                        href={`/submissions/${h.runId}`}
                                        className="btn btn-primary btn-sm"
                                    >
                                        Submit this run
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <header className={settings.paneHeader}>
                <h2 className={styles.sectionTitle}>Off the board</h2>
                <p className={settings.paneLede}>
                    These runs are off the board because they aren&apos;t on the
                    game&apos;s official leaderboard.
                </p>
            </header>

            {offBoard.length === 0 ? (
                <p className={settings.paneNote}>
                    None of your runs are off a board right now.
                </p>
            ) : (
                <ul className={styles.list}>
                    {offBoard.map((r) => {
                        const board = r.gameDisplay
                            ? `${r.gameDisplay} · ${r.categoryDisplay ?? 'Unknown board'}`
                            : (r.categoryDisplay ?? 'Unknown board');
                        const href = r.gameSlug
                            ? buildRunHref(r.gameSlug, r.runId)
                            : null;
                        return (
                            <li key={r.runId} className={styles.row}>
                                <div className={styles.rowMain}>
                                    <span className={styles.board}>
                                        {href ? (
                                            <Link href={href}>{board}</Link>
                                        ) : (
                                            board
                                        )}
                                    </span>
                                    <span className={styles.time}>
                                        {getFormattedString(String(r.timeMs))}
                                    </span>
                                </div>
                                <div className={styles.rowMeta}>
                                    <span className={styles.waiting}>
                                        {offBoardFor(r.since)}
                                    </span>
                                    {href && (
                                        <Link
                                            href={href}
                                            className="btn btn-outline-secondary btn-sm"
                                        >
                                            View run
                                        </Link>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
