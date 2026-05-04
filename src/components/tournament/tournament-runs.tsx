import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { Form } from 'react-bootstrap';
import {
    ArrowDownShort,
    ArrowUpShort,
    Search as SearchIcon,
    XCircle,
} from 'react-bootstrap-icons';
import detailStyles from '~app/(new-layout)/tournaments/[tournament]/tournament-detail.module.scss';
import { addTime } from '~app/(new-layout)/tournaments/actions/add-time.action';
import { excludeRun } from '~app/(new-layout)/tournaments/actions/exclude-run.action';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import { UserLink } from '~src/components/links/links';
import { Tournament } from '~src/components/tournament/tournament-info';
import { hasCapability } from '~src/lib/tournament-permissions';
import { User } from '../../../types/session.types';
import {
    DurationToFormatted,
    getFormattedString,
    timeToMillis,
} from '../util/datetime';

interface Run {
    user: string;
    time: string | number;
    endedAt: string;
    game?: string;
    splitKey?: string;
}

interface TournamentRunsProps {
    data: {
        runList: unknown[];
    };
    user: User;
    tournament: Tournament;
    showGame?: boolean;
}

type SortKey = 'date' | 'user' | 'time' | 'game';
const PAGE_SIZE = 12;

const normalize = (s: string) =>
    s
        .toLowerCase()
        .replaceAll(' ', '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');

export const TournamentRuns: React.FunctionComponent<TournamentRunsProps> = ({
    data,
    user,
    tournament,
    showGame = false,
}) => {
    const isAdmin = hasCapability(user, tournament, 'manage_runs');

    const [finalTimeInput, setFinalTimeInput] = useState(
        getFormattedString('0', true),
    );
    const confirmedFinalTime = useMemo(
        () => timeToMillis(finalTimeInput),
        [finalTimeInput],
    );

    const [sortKey, setSortKey] = useState<SortKey>('time');
    const [sortAsc, setSortAsc] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    const allRuns = useMemo<Run[]>(
        () => ((data?.runList ?? []) as Run[]) ?? [],
        [data],
    );

    const filtered = useMemo(() => {
        if (!search) return allRuns;
        const q = normalize(search);
        return allRuns.filter((r) => {
            const u = normalize(r.user || '');
            const g = showGame ? normalize(r.game || '') : '';
            return u.includes(q) || g.includes(q);
        });
    }, [allRuns, search, showGame]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            let res = 0;
            if (sortKey === 'date') {
                if (!a.endedAt) return 1;
                if (!b.endedAt) return -1;
                if (a.endedAt === b.endedAt) {
                    res = (a.splitKey ?? '') < (b.splitKey ?? '') ? 1 : -1;
                } else {
                    res = moment(a.endedAt).isBefore(b.endedAt) ? 1 : -1;
                }
            } else if (sortKey === 'user') {
                res = a.user === b.user ? 0 : a.user > b.user ? 1 : -1;
            } else if (sortKey === 'time') {
                const at =
                    typeof a.time === 'number' ? a.time : parseInt(a.time, 10);
                const bt =
                    typeof b.time === 'number' ? b.time : parseInt(b.time, 10);
                res = at > bt ? 1 : at < bt ? -1 : 0;
            } else if (sortKey === 'game') {
                const ga = a.game ?? '';
                const gb = b.game ?? '';
                if (ga === gb) {
                    const at =
                        typeof a.time === 'number'
                            ? a.time
                            : parseInt(a.time as string, 10);
                    const bt =
                        typeof b.time === 'number'
                            ? b.time
                            : parseInt(b.time as string, 10);
                    res = at > bt ? 1 : -1;
                } else res = ga > gb ? 1 : -1;
            }
            return sortAsc ? res : -res;
        });
        return arr;
    }, [filtered, sortKey, sortAsc]);

    useEffect(() => setPage(0), [search, sortKey, sortAsc]);

    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const visible = sorted.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE,
    );

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc((v) => !v);
        else {
            setSortKey(key);
            setSortAsc(key === 'time' || key === 'user' || key === 'game');
        }
    };

    const sortPill = (key: SortKey, label: string) => (
        <button
            key={key}
            type="button"
            className={`${detailStyles.runsSortPill} ${
                sortKey === key ? detailStyles.runsSortPillActive : ''
            }`}
            onClick={() => toggleSort(key)}
        >
            {label}
            {sortKey === key &&
                (sortAsc ? (
                    <ArrowUpShort size={14} />
                ) : (
                    <ArrowDownShort size={14} />
                ))}
        </button>
    );

    const showRanks = sortKey === 'time' && sortAsc;

    return (
        <div className={detailStyles.runsWrap}>
            <div className={detailStyles.runsToolbar}>
                <div className={detailStyles.runsSearch}>
                    <SearchIcon
                        size={14}
                        className={detailStyles.lbSearchIcon}
                        aria-hidden
                    />
                    <input
                        type="search"
                        className={detailStyles.lbSearchInput}
                        placeholder={`Filter by user${
                            showGame ? ' or game' : ''
                        }…`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className={detailStyles.runsSortRow}>
                    {sortPill('time', 'Time')}
                    {sortPill('date', 'Date')}
                    {sortPill('user', 'User')}
                    {showGame && sortPill('game', 'Game')}
                </div>
            </div>

            {isAdmin && (
                <Form action={addTime} className={detailStyles.runsAddRunCard}>
                    <span className={detailStyles.runsAddRunTitle}>
                        Add custom run
                    </span>
                    <input
                        hidden
                        name="tournament"
                        value={tournament.name}
                        readOnly
                    />
                    <input
                        hidden
                        name="date"
                        value={tournament.eligiblePeriods?.[0]?.startDate ?? ''}
                        readOnly
                    />
                    <input
                        name="user"
                        type="text"
                        className={detailStyles.runsAddRunField}
                        placeholder="User"
                    />
                    <input
                        type="text"
                        name="finalTimeInput"
                        className={detailStyles.runsAddRunField}
                        placeholder="hh:mm:ss.ms"
                        value={finalTimeInput}
                        onChange={(event) => {
                            setFinalTimeInput(event.target.value);
                        }}
                    />
                    <input
                        hidden
                        name="time"
                        value={confirmedFinalTime}
                        readOnly
                    />
                    <SubmitButton innerText="Add" pendingText="Adding…" />
                </Form>
            )}

            {visible.length === 0 ? (
                <div className={detailStyles.lbEmpty}>
                    {search ? 'No runs match your filter.' : 'No runs yet.'}
                </div>
            ) : (
                <ol className={detailStyles.runsList}>
                    {visible.map((run, idx) => {
                        const absoluteIndex = safePage * PAGE_SIZE + idx;
                        const placing = absoluteIndex + 1;
                        const rankClass = !showRanks
                            ? ''
                            : placing === 1
                              ? detailStyles.rankGold
                              : placing === 2
                                ? detailStyles.rankSilver
                                : placing === 3
                                  ? detailStyles.rankBronze
                                  : '';
                        return (
                            <li
                                key={`${run.endedAt}-${run.user}-${absoluteIndex}`}
                                className={`${detailStyles.runsRow} ${rankClass}`}
                            >
                                <span className={detailStyles.lbRank}>
                                    {showRanks ? placing : '·'}
                                </span>
                                <span className={detailStyles.runsUser}>
                                    <UserLink username={run.user} />
                                    {showGame && run.game && (
                                        <span className={detailStyles.runsGame}>
                                            {run.game}
                                        </span>
                                    )}
                                </span>
                                <span className={detailStyles.runsTime}>
                                    <DurationToFormatted
                                        duration={String(run.time)}
                                    />
                                </span>
                                <span className={detailStyles.runsDate}>
                                    <span
                                        className={detailStyles.runsDateRel}
                                        title={moment(run.endedAt).format(
                                            'LLL',
                                        )}
                                    >
                                        {moment(run.endedAt).fromNow()}
                                    </span>
                                    <span className={detailStyles.runsDateAbs}>
                                        {moment(run.endedAt).format(
                                            'MMM D, YYYY',
                                        )}
                                    </span>
                                </span>
                                {isAdmin && (
                                    <Form
                                        action={excludeRun}
                                        className={detailStyles.runsExcludeForm}
                                    >
                                        <input
                                            hidden
                                            name="tournament"
                                            value={tournament.name}
                                            readOnly
                                        />
                                        <input
                                            hidden
                                            name="date"
                                            value={run.endedAt}
                                            readOnly
                                        />
                                        <input
                                            hidden
                                            name="user"
                                            value={run.user}
                                            readOnly
                                        />
                                        <button
                                            type="submit"
                                            className={
                                                detailStyles.runsExcludeBtn
                                            }
                                            title="Exclude run"
                                            aria-label="Exclude run"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </Form>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}

            {pageCount > 1 && (
                <div className={detailStyles.runsPager}>
                    <button
                        type="button"
                        className={detailStyles.lbPagerBtn}
                        onClick={() => setPage(0)}
                        disabled={safePage === 0}
                    >
                        «
                    </button>
                    <button
                        type="button"
                        className={detailStyles.lbPagerBtn}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                    >
                        ‹
                    </button>
                    <span className={detailStyles.runsPagerInfo}>
                        Showing{' '}
                        <strong>
                            {safePage * PAGE_SIZE + 1}–
                            {Math.min(
                                (safePage + 1) * PAGE_SIZE,
                                sorted.length,
                            )}
                        </strong>{' '}
                        of <strong>{sorted.length}</strong>
                        {sorted.length !== allRuns.length && (
                            <span className={detailStyles.runsPagerSub}>
                                {' '}
                                ({allRuns.length} total)
                            </span>
                        )}
                    </span>
                    <button
                        type="button"
                        className={detailStyles.lbPagerBtn}
                        onClick={() =>
                            setPage((p) => Math.min(pageCount - 1, p + 1))
                        }
                        disabled={safePage >= pageCount - 1}
                    >
                        ›
                    </button>
                    <button
                        type="button"
                        className={detailStyles.lbPagerBtn}
                        onClick={() => setPage(pageCount - 1)}
                        disabled={safePage >= pageCount - 1}
                    >
                        »
                    </button>
                </div>
            )}
        </div>
    );
};
