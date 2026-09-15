'use client';

import type { ReactNode } from 'react';
import { useContext } from 'react';
import { ChevronLeft, ChevronRight, TrophyFill } from 'react-bootstrap-icons';
import type {
    Race,
    RaceParticipant,
    UserStats,
} from '~app/(new-layout)/races/races.types';
import { racesFetcher } from '~src/components/pagination/fetchers/races-fetcher';
import { paginateArray } from '~src/components/pagination/paginate-array';
import { PaginationContext } from '~src/components/pagination/pagination.context';
import { PaginationContextProvider } from '~src/components/pagination/pagination.context-provider';
import usePagination from '~src/components/pagination/use-pagination';
import { FromNow, getFormattedString } from '~src/components/util/datetime';
import { formatCount } from '../format';
import { ProfileBlock } from '../profile-block';
import { ProfileGroup } from '../profile-group';
import ui from '../profile-ui.module.scss';
import { medalOf, ordinal, plural } from '../ranks';
import { StatStrip, type StripLead, type StripTile } from '../stat-strip';
import styles from './races.module.scss';

interface UserRaceProfileProps {
    username: string;
    globalStats?: UserStats;
    categoryStatsMap: UserStats[][];
    participations: RaceParticipant[];
    initialRaces: Race[];
    stripTiles: StripTile[];
    stripEditor: ReactNode;
}

const PAGE = 10;

const duration = (ms: number | null | undefined) =>
    ms ? getFormattedString(String(ms)) : '—';

const splitName = (s: UserStats) => {
    const [game, category] = s.displayValue.split('#');
    return { game, category: category ?? '' };
};

export const UserRaceProfile = ({
    username,
    globalStats,
    categoryStatsMap,
    participations,
    initialRaces,
    stripTiles,
    stripEditor,
}: UserRaceProfileProps) => {
    if (!participations || participations.length === 0 || !globalStats) {
        return <p className={ui.empty}>No races yet.</p>;
    }

    const all = categoryStatsMap.flat();
    const best = all.reduce<UserStats | null>(
        (top, s) =>
            s.rankings[0]?.score &&
            (!top || s.rankings[0].score > top.rankings[0].score)
                ? s
                : top,
        null,
    );

    const lead: StripLead | null = best
        ? {
              value: formatCount(best.rankings[0].score),
              label: `Best rating · ${ordinal(best.rankings[0].rank + 1)} on the ladder`,
              what: `${splitName(best).game} · ${splitName(best).category}`,
              medal: medalOf(best.rankings[0].rank + 1),
              href: `/races/stats/${encodeURI(splitName(best).game)}/${encodeURI(splitName(best).category)}`,
          }
        : null;

    return (
        <div className={ui.page}>
            <StatStrip
                label="Race standing"
                lead={lead}
                tiles={stripTiles}
                editor={stripEditor}
            />
            <ProfileBlock
                title="Recent races"
                note={plural(participations.length, 'race', 'races')}
            >
                <PaginationContextProvider>
                    <RecentRaces
                        username={username}
                        participations={participations}
                        initialRaces={initialRaces}
                    />
                </PaginationContextProvider>
            </ProfileBlock>
            {categoryStatsMap.length > 0 ? (
                <ProfileBlock title="By game" note="Most time raced first">
                    <div className={`${ui.panel} ${styles.byGame}`}>
                        <div className={ui.colHead} aria-hidden>
                            <span>Category</span>
                            <span className={ui.end}>Races</span>
                            <span className={`${ui.end} ${ui.optional}`}>
                                Finished
                            </span>
                            <span className={`${ui.end} ${ui.optional}`}>
                                Time raced
                            </span>
                            <span className={ui.end}>Rating</span>
                            <span className={ui.end}>Best time</span>
                        </div>
                        {categoryStatsMap.map((cats, i) => {
                            const game = splitName(cats[0]).game;
                            const races = cats.reduce(
                                (n, c) => n + c.totalRaces,
                                0,
                            );
                            return (
                                <ProfileGroup
                                    key={game}
                                    title={game}
                                    imageUrl={
                                        cats[0].image &&
                                        cats[0].image !== 'noimage'
                                            ? cats[0].image
                                            : null
                                    }
                                    meta={plural(races, 'race', 'races')}
                                    defaultOpen={i < 5}
                                    collapsible={categoryStatsMap.length > 1}
                                >
                                    {cats.map((c) => (
                                        <CategoryRow key={c.value} stat={c} />
                                    ))}
                                </ProfileGroup>
                            );
                        })}
                    </div>
                </ProfileBlock>
            ) : null}
        </div>
    );
};

function Ladder({ rank }: { rank: number }) {
    const place = rank + 1;
    return (
        <span className={ui.rank} data-medal={medalOf(place)}>
            #{place}
        </span>
    );
}

function CategoryRow({ stat }: { stat: UserStats }) {
    const { game, category } = splitName(stat);
    const [mmr, time] = stat.rankings;
    return (
        <a
            className={ui.row}
            href={`/races/stats/${encodeURI(game)}/${encodeURI(category)}`}
        >
            <span className={ui.name}>
                <span className={ui.nameMain}>{category}</span>
            </span>
            <span className={`${ui.num} ${ui.end}`}>
                {formatCount(stat.totalRaces)}
            </span>
            <span className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}>
                {formatCount(stat.totalFinishedRaces)}
            </span>
            <span className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}>
                {duration(stat.totalRaceTime)}
            </span>
            <span className={`${styles.pair} ${ui.end}`}>
                <span className={`${ui.num} ${ui.strong}`}>
                    {mmr?.score ? formatCount(mmr.score) : '—'}
                </span>
                {mmr?.score ? <Ladder rank={mmr.rank} /> : null}
            </span>
            <span className={`${styles.pair} ${ui.end}`}>
                <span className={ui.num}>{duration(time?.score)}</span>
                {time?.score ? <Ladder rank={time.rank} /> : null}
            </span>
        </a>
    );
}

function RecentRaces({
    username,
    participations,
    initialRaces,
}: {
    username: string;
    participations: RaceParticipant[];
    initialRaces: Race[];
}) {
    const { setCurrentPage } = useContext(PaginationContext);
    const pagination = usePagination<Race>(
        paginateArray<Race>(initialRaces, PAGE, 1, participations.length),
        racesFetcher,
        PAGE,
        1,
        participations,
    );
    const { page, totalPages } = pagination;
    const mine = new Map(participations.map((p) => [p.raceId, p]));

    return (
        <div className={`${ui.panel} ${styles.recent}`}>
            <div className={`${ui.colHead} ${ui.rowFlush}`} aria-hidden>
                <span>Race</span>
                <span>Result</span>
                <span className={ui.end}>Time</span>
                <span className={ui.optional}>Winner</span>
                <span className={`${ui.end} ${ui.optional}`}>When</span>
            </div>
            {pagination.data.map((race) => (
                <RaceRow
                    key={race.raceId}
                    race={race}
                    username={username}
                    participation={mine.get(race.raceId)}
                />
            ))}
            {totalPages > 1 ? (
                <div className={styles.pager}>
                    <button
                        type="button"
                        className={ui.iconLink}
                        disabled={page <= 1}
                        onClick={() => setCurrentPage(page - 1)}
                    >
                        <ChevronLeft size={12} aria-hidden /> Newer
                    </button>
                    <span className={ui.muted}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        className={ui.iconLink}
                        disabled={page >= totalPages}
                        onClick={() => setCurrentPage(page + 1)}
                    >
                        Older <ChevronRight size={12} aria-hidden />
                    </button>
                </div>
            ) : null}
        </div>
    );
}

function RaceRow({
    race,
    username,
    participation,
}: {
    race: Race;
    username: string;
    participation?: RaceParticipant;
}) {
    const lower = username.toLowerCase();
    const result = race.results?.find((r) => r.name.toLowerCase() === lower);
    const live = race.participants?.find((p) => p.user.toLowerCase() === lower);
    const status = result?.status ?? live?.status ?? participation?.status;
    const finalTime =
        result?.finalTime ??
        live?.finalTime ??
        participation?.finalTime ??
        null;
    const finished = status === 'finished' || status === 'confirmed';
    const winner = race.results?.find(
        (r) =>
            r.position === 1 &&
            (r.status === 'confirmed' || r.status === 'finished'),
    );
    const place = finished && result ? result.position : null;
    const image =
        race.gameImage && race.gameImage !== 'noimage' ? race.gameImage : null;

    return (
        <a
            href={`/races/${race.raceId}`}
            className={`${ui.row} ${ui.rowFlush}`}
        >
            <span className={styles.raceName}>
                {image ? (
                    <img src={image} alt="" loading="lazy" />
                ) : (
                    <span className={styles.raceArtEmpty} />
                )}
                <span className={ui.stacked}>
                    <span className={ui.nameMain}>{race.displayGame}</span>
                    <span className={`${ui.small} ${ui.muted}`}>
                        {race.displayCategory}
                    </span>
                </span>
            </span>
            <span>
                {race.status === 'aborted' ? (
                    <span className={ui.faint}>Aborted</span>
                ) : place !== null ? (
                    <span className={styles.result}>
                        <span className={ui.rank} data-medal={medalOf(place)}>
                            {ordinal(place)}
                        </span>
                        <span className={`${ui.small} ${ui.muted}`}>
                            of {race.participantCount}
                        </span>
                    </span>
                ) : status === 'abandoned' ? (
                    <span className={ui.muted}>Forfeited</span>
                ) : (
                    <span className={ui.faint}>—</span>
                )}
            </span>
            <span
                className={`${ui.num} ${ui.end} ${finished ? ui.strong : ui.faint}`}
            >
                {finished ? duration(finalTime) : '—'}
            </span>
            <span className={`${styles.winner} ${ui.optional}`}>
                {winner ? (
                    winner.name.toLowerCase() === lower ? (
                        <span className={styles.won}>
                            <TrophyFill size={11} aria-hidden /> Won
                        </span>
                    ) : (
                        <>
                            <TrophyFill
                                size={11}
                                aria-hidden
                                className={styles.trophy}
                            />
                            <span className={styles.winnerName}>
                                {winner.name}
                            </span>
                            <span className={`${ui.num} ${ui.muted}`}>
                                {duration(winner.finalTime)}
                            </span>
                        </>
                    )
                ) : null}
            </span>
            <span
                className={`${ui.small} ${ui.muted} ${ui.end} ${ui.optional}`}
            >
                {race.startTime ? <FromNow time={race.startTime} /> : '—'}
            </span>
        </a>
    );
}
