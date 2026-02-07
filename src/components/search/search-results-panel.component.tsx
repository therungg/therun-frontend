import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { getFormattedString } from '~src/components/util/datetime';
import type { RunResult, UserResult } from './find-user-or-run';

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
                    className="dropdown-menu d-block mt-2 py-0 overflow-y-auto"
                    style={{
                        width: bothVisible
                            ? 'min(650px, calc(100vw - 2rem))'
                            : undefined,
                        maxWidth: 'calc(100vw - 2rem)',
                        right: 0,
                        left: 'auto',
                        maxHeight: '450px',
                    }}
                >
                    {!hasResults && !isSearching && (
                        <div className="p-3 text-center text-muted fs-smaller">
                            No results found
                        </div>
                    )}
                    {isSearching && !hasResults && (
                        <div className="p-3 d-flex align-items-center justify-content-center gap-2 fs-smaller">
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
                                    <SectionHeader title="Users" />
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
                                    <SectionHeader title="Runs" />
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

const SectionHeader = ({ title }: { title: string }) => (
    <div
        className="px-2 py-1 fw-semibold border-bottom fs-smaller"
        style={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--bs-tertiary-bg)',
            zIndex: 1,
        }}
    >
        {title}
    </div>
);

const EmptySection = ({
    text,
    isSearching,
}: {
    text: string;
    isSearching: boolean;
}) => (
    <div className="px-3 py-2 text-muted fs-smaller">
        {isSearching ? (
            <span className="d-flex align-items-center gap-2">
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
        className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none text-body list-group-item-action"
        prefetch={false}
    >
        <Image
            src={user.picture}
            alt=""
            width={32}
            height={32}
            className="rounded-circle flex-shrink-0"
            unoptimized
        />
        <div style={{ minWidth: 0 }}>
            <div className="fw-medium text-truncate lh-sm">{user.user}</div>
            <div className="text-muted fs-smaller text-truncate lh-sm">
                {user.totalGames} {user.totalGames === 1 ? 'game' : 'games'}{' '}
                &middot; {user.totalCategories}{' '}
                {user.totalCategories === 1 ? 'category' : 'categories'}
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
            className="d-block px-3 py-2 text-decoration-none text-body list-group-item-action"
            prefetch={false}
        >
            <div className="fw-medium text-truncate lh-sm">{run.game}</div>
            <div className="text-muted fs-smaller text-truncate lh-sm">
                {run.category} &middot; {run.user}
                {formattedPb && <> &middot; {formattedPb}</>}
            </div>
        </Link>
    );
};
