import Image from 'next/image';
import React from 'react';
import { Controller as ControllerIcon } from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { getFormattedString } from '~src/components/util/datetime';
import { safeEncodeURI } from '~src/utils/uri';
import type { GameResult } from './find-games';
import type { RunResult, UserResult } from './find-user-or-run';
import styles from './search-results-panel.module.scss';

const MAX_USERS = 8;
const MAX_RUNS = 10;
const MAX_GAMES = 8;

interface SearchResultsPanelProps {
    users: UserResult[];
    runs: RunResult[];
    games: GameResult[];
    showUsers: boolean;
    showRuns: boolean;
    showGames: boolean;
    isSearching: boolean;
    urlSuffix?: string;
}

export const SearchResultsPanel = React.memo(
    React.forwardRef<HTMLDivElement, SearchResultsPanelProps>(
        (
            {
                users,
                runs,
                games,
                showUsers,
                showRuns,
                showGames,
                isSearching,
                urlSuffix = '',
            },
            ref,
        ) => {
            const displayUsers = users.slice(0, MAX_USERS);
            const displayRuns = runs.slice(0, MAX_RUNS);
            const displayGames = games.slice(0, MAX_GAMES);
            const hasUsers = displayUsers.length > 0;
            const hasRuns = displayRuns.length > 0;
            const hasGames = displayGames.length > 0;
            const hasResults =
                (showUsers && hasUsers) ||
                (showRuns && hasRuns) ||
                (showGames && hasGames);

            // The panel widens with the number of sections it draws, so a
            // single-section search (the recap page asks for users only) does
            // not reserve space for columns that never render.
            const sectionCount = [showUsers, showRuns, showGames].filter(
                Boolean,
            ).length;
            const widthClass =
                WIDTH_CLASSES[sectionCount] ?? styles.panelNarrow;
            const columnClass = COLUMN_CLASSES[sectionCount] ?? 'col-12';

            return (
                <div ref={ref} className={`${styles.panel} ${widthClass}`}>
                    {!hasResults && !isSearching && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <ControllerIcon size={24} />
                            </div>
                            No results found
                        </div>
                    )}
                    {isSearching && !hasResults && (
                        <div className={styles.loadingState}>
                            <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                            />
                            Searching...
                        </div>
                    )}
                    {hasResults && (
                        <div className="row g-0">
                            {showGames && (
                                <div className={columnClass}>
                                    <div className={styles.sectionHeader}>
                                        Games
                                    </div>
                                    {hasGames ? (
                                        displayGames.map((game) => (
                                            <GameResultCard
                                                key={game.game}
                                                game={game}
                                            />
                                        ))
                                    ) : (
                                        <EmptySection
                                            text="No games found"
                                            isSearching={isSearching}
                                        />
                                    )}
                                </div>
                            )}
                            {showUsers && (
                                <div className={columnClass}>
                                    <div className={styles.sectionHeader}>
                                        Users
                                    </div>
                                    {hasUsers ? (
                                        displayUsers.map((user) => (
                                            <UserResultCard
                                                key={user.user}
                                                user={user}
                                                urlSuffix={urlSuffix}
                                            />
                                        ))
                                    ) : (
                                        <EmptySection
                                            text="No users found"
                                            isSearching={isSearching}
                                        />
                                    )}
                                </div>
                            )}
                            {showRuns && (
                                <div className={columnClass}>
                                    <div className={styles.sectionHeader}>
                                        Runs
                                    </div>
                                    {hasRuns ? (
                                        displayRuns.map((run) => (
                                            <RunResultCard
                                                key={run.url}
                                                run={run}
                                                urlSuffix={urlSuffix}
                                            />
                                        ))
                                    ) : (
                                        <EmptySection
                                            text="No runs found"
                                            isSearching={isSearching}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        },
    ),
);

SearchResultsPanel.displayName = 'SearchResultsPanel';

const WIDTH_CLASSES: Record<number, string> = {
    1: styles.panelNarrow,
    2: styles.panelWide,
    3: styles.panelWidest,
};

const COLUMN_CLASSES: Record<number, string> = {
    1: 'col-12',
    2: 'col-12 col-sm-6',
    3: 'col-12 col-md-4',
};

const EmptySection = ({
    text,
    isSearching,
}: {
    text: string;
    isSearching: boolean;
}) => (
    <div className={styles.emptyState}>
        {isSearching ? (
            <span className={styles.loadingState}>
                <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                />
                Searching...
            </span>
        ) : (
            text
        )}
    </div>
);

const UserResultCard = ({
    user,
    urlSuffix,
}: {
    user: UserResult;
    urlSuffix: string;
}) => (
    <Link
        href={`/users/${user.user}${urlSuffix}`}
        className={styles.resultItem}
    >
        <Image
            src={user.picture}
            alt=""
            width={40}
            height={40}
            className={styles.avatar}
            unoptimized
        />
        <div className={styles.resultText}>
            <div className={styles.resultName}>{user.user}</div>
            <div className={styles.meta}>
                {user.totalGames} {user.totalGames === 1 ? 'game' : 'games'}
                {' · '}
                {user.totalCategories}{' '}
                {user.totalCategories === 1 ? 'category' : 'categories'}
                {' · '}
                {user.totalAttempts.toLocaleString()} attempts
            </div>
        </div>
    </Link>
);

const GameResultCard = ({ game }: { game: GameResult }) => {
    const hasImage = !!game.image && game.image !== 'noimage';

    return (
        <Link
            href={`/games/${safeEncodeURI(game.game)}`}
            className={styles.resultItem}
        >
            {hasImage ? (
                <GameImage
                    src={game.image as string}
                    alt={game.display}
                    width={36}
                    height={48}
                    quality="small"
                    className={styles.gameImage}
                />
            ) : (
                <div className={styles.gameImageFallback}>
                    <ControllerIcon size={16} />
                </div>
            )}
            <div className={styles.resultText}>
                <div className={styles.resultName}>{game.display}</div>
                <div className={styles.meta}>{gameMeta(game)}</div>
            </div>
        </Link>
    );
};

const gameMeta = (game: GameResult) => {
    const parts: string[] = [];

    if (game.categoryCount) {
        parts.push(
            `${game.categoryCount} ${game.categoryCount === 1 ? 'category' : 'categories'}`,
        );
    }
    if (game.uniqueRunners) {
        parts.push(
            `${game.uniqueRunners.toLocaleString()} ${game.uniqueRunners === 1 ? 'runner' : 'runners'}`,
        );
    }

    return parts.join(' · ');
};

const RunResultCard = ({
    run,
    urlSuffix,
}: {
    run: RunResult;
    urlSuffix: string;
}) => {
    const pb = run.pbgt || run.pb;
    const formattedPb = pb ? getFormattedString(pb) : null;

    return (
        <Link
            href={`/users/${run.url}${urlSuffix}`}
            className={styles.resultItem}
        >
            {run.image ? (
                <GameImage
                    src={run.image}
                    alt={run.game}
                    width={36}
                    height={48}
                    quality="small"
                    className={styles.gameImage}
                />
            ) : (
                <div className={styles.gameImageFallback}>
                    <ControllerIcon size={16} />
                </div>
            )}
            <div className={styles.resultText}>
                <div className={styles.resultName}>{run.game}</div>
                <div className={styles.meta}>
                    {run.category} &middot; {run.user}
                </div>
                {formattedPb && (
                    <div className={styles.pbTime}>{formattedPb}</div>
                )}
            </div>
        </Link>
    );
};
