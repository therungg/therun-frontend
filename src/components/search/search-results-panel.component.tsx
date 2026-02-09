import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Controller as ControllerIcon } from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import { getFormattedString } from '~src/components/util/datetime';
import type { RunResult, UserResult } from './find-user-or-run';
import styles from './search-results-panel.module.scss';

const MAX_USERS = 8;
const MAX_RUNS = 10;

interface SearchResultsPanelProps {
    users: UserResult[];
    runs: RunResult[];
    showUsers: boolean;
    showRuns: boolean;
    isSearching: boolean;
    urlSuffix?: string;
}

export const SearchResultsPanel = React.memo(
    React.forwardRef<HTMLDivElement, SearchResultsPanelProps>(
        (
            { users, runs, showUsers, showRuns, isSearching, urlSuffix = '' },
            ref,
        ) => {
            const displayUsers = users.slice(0, MAX_USERS);
            const displayRuns = runs.slice(0, MAX_RUNS);
            const hasUsers = displayUsers.length > 0;
            const hasRuns = displayRuns.length > 0;
            const hasResults = (showUsers && hasUsers) || (showRuns && hasRuns);
            const bothVisible = showUsers && showRuns;

            return (
                <div
                    ref={ref}
                    className={`${styles.panel} ${bothVisible ? styles.panelWide : styles.panelNarrow}`}
                >
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
                    {(hasResults || (isSearching && hasResults)) && (
                        <div className="row g-0">
                            {showUsers && (
                                <div
                                    className={
                                        bothVisible
                                            ? 'col-12 col-sm-6'
                                            : 'col-12'
                                    }
                                >
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
                                <div
                                    className={
                                        bothVisible
                                            ? 'col-12 col-sm-6'
                                            : 'col-12'
                                    }
                                >
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
        href={`/${user.user}${urlSuffix}`}
        className={styles.resultItem}
        prefetch={false}
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
                {' \u00B7 '}
                {user.totalCategories}{' '}
                {user.totalCategories === 1 ? 'category' : 'categories'}
                {' \u00B7 '}
                {user.totalAttempts.toLocaleString()} attempts
            </div>
        </div>
    </Link>
);

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
            href={`/${run.url}${urlSuffix}`}
            className={styles.resultItem}
            prefetch={false}
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
