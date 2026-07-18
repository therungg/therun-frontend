import clsx from 'clsx';
import type { Metadata } from 'next';
import { ShieldLock } from 'react-bootstrap-icons';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { resolveGame } from '~src/lib/games-v1';
import { getCachedModSummary } from '~src/lib/moderation/mod-summary';
import buildMetadata from '~src/utils/metadata';
import {
    chunk,
    formatCountBadge,
    type HubRow,
    type HubRowOk,
    settleHubRow,
} from './hub-model';
import styles from './manage-hub.module.scss';

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: 'Manage your games',
        description:
            'Every game you moderate, with open triage items at a glance.',
    });
}

// Bounds how many moderated games are resolved + summarized at once — a
// moderator of a dozen boards shouldn't fan out a dozen*3 concurrent
// backend calls on every hub load. See hub-model.ts's `chunk`.
const CONCURRENCY = 4;

async function loadHubRow(
    sessionId: string,
    slug: string,
): Promise<HubRowOk | null> {
    const game = await resolveGame(slug);
    if (!game) return null; // stale/renamed/removed slug — drop silently
    const summary = await getCachedModSummary(sessionId, game.id, game.name);
    return {
        kind: 'ok',
        slug: game.name,
        display: game.display,
        image: game.image ?? null,
        count: summary.count,
        degraded: summary.degraded,
    };
}

async function loadHubRows(
    sessionId: string,
    slugs: string[],
): Promise<HubRow[]> {
    const rows: HubRow[] = [];
    for (const batch of chunk(slugs, CONCURRENCY)) {
        // allSettled, not all — one game's transient backend failure must
        // not sink the rest of the batch (see settleHubRow in hub-model.ts).
        const settled = await Promise.allSettled(
            batch.map((slug) => loadHubRow(sessionId, slug)),
        );
        settled.forEach((result, i) => {
            const row = settleHubRow(batch[i], result);
            if (row) rows.push(row);
        });
    }
    // Busiest boards first — a moderator opening this hub is asking "which
    // of my games has work?", so the answer should read top to bottom.
    // Failed rows (no known count) sort as if clear, alphabetized by slug.
    rows.sort((a, b) => {
        const countA = a.kind === 'ok' ? a.count : 0;
        const countB = b.kind === 'ok' ? b.count : 0;
        if (countA !== countB) return countB - countA;
        const nameA = a.kind === 'ok' ? a.display : a.slug;
        const nameB = b.kind === 'ok' ? b.display : b.slug;
        return nameA.localeCompare(nameB);
    });
    return rows;
}

export default async function GamesManageHubPage() {
    const session = await getSession();

    if (!session?.username || !session.id) {
        return (
            <div className={styles.wrap}>
                <div className={styles.panel}>
                    <ShieldLock size={28} className={styles.icon} aria-hidden />
                    <p className={styles.eyebrow}>Manage</p>
                    <h1 className={styles.panelTitle}>
                        Sign in to see the games you moderate
                    </h1>
                    <p className={styles.blurb}>
                        Sign in with Twitch to view your moderation consoles.
                    </p>
                    <TwitchLoginButton url="/games-v2/manage" />
                </div>
            </div>
        );
    }

    const moderatedGames = session.moderatedGames ?? [];

    if (moderatedGames.length === 0) {
        return (
            <div className={styles.wrap}>
                <div className={styles.panel}>
                    <ShieldLock size={28} className={styles.icon} aria-hidden />
                    <h1 className={styles.panelTitle}>
                        You don&rsquo;t moderate any games yet.
                    </h1>
                    <p className={styles.blurb}>
                        Boards you moderate will show up here with their open
                        triage items.
                    </p>
                    <Link href="/games" className={styles.emptyLink}>
                        Browse games
                    </Link>
                </div>
            </div>
        );
    }

    const rows = await loadHubRows(session.id, moderatedGames);

    return (
        <div className={styles.shell}>
            <div className={styles.header}>
                <p className={styles.eyebrow}>Manage</p>
                <h1 className={styles.title}>Your games</h1>
            </div>
            <div className={styles.list}>
                {rows.map((row) => {
                    if (row.kind === 'failed') {
                        return (
                            <div key={row.slug} className={styles.row}>
                                <div
                                    className={styles.coverPlaceholder}
                                    aria-hidden="true"
                                />
                                <div className={styles.info}>
                                    <p className={styles.name}>{row.slug}</p>
                                </div>
                                <span
                                    className={styles.badge}
                                    aria-label="Couldn't load — try refreshing."
                                    title="Couldn't load — try refreshing."
                                >
                                    !
                                </span>
                                <Link
                                    href={`/games-v2/${row.slug}/manage?pane=attention`}
                                    className={styles.openLink}
                                >
                                    Open console
                                </Link>
                            </div>
                        );
                    }
                    const clear = row.count === 0 && !row.degraded;
                    const badgeText = formatCountBadge(row.count, row.degraded);
                    const badgeLabel = row.degraded
                        ? `${row.count} open items — some sources didn't load, actual count may be higher`
                        : `${row.count} open item${row.count === 1 ? '' : 's'}`;
                    return (
                        <div key={row.slug} className={styles.row}>
                            {row.image ? (
                                <img
                                    className={styles.cover}
                                    src={row.image}
                                    alt=""
                                    width={36}
                                    height={48}
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className={styles.coverPlaceholder}
                                    aria-hidden="true"
                                />
                            )}
                            <div className={styles.info}>
                                <p className={styles.name}>{row.display}</p>
                            </div>
                            <span
                                className={clsx(
                                    styles.badge,
                                    clear && styles.badgeClear,
                                )}
                                aria-label={badgeLabel}
                                title={
                                    row.degraded
                                        ? 'Some sources failed to load — count may be low'
                                        : undefined
                                }
                            >
                                {badgeText}
                            </span>
                            <Link
                                href={`/games-v2/${row.slug}/manage?pane=attention`}
                                className={styles.openLink}
                            >
                                Open console
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
